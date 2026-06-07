import { ShopStatus } from '@prisma/client';
import { NotFoundError } from '../../utils/AppError';
import { buildPageMeta, getPagination } from '../../utils/pagination';
import { shopRepository } from '../shops/repository';
import { adminRepository } from './repository';
import type { ListShopsQuery, RejectShopInput } from './validators';

class AdminService {
  async listShops(query: ListShopsQuery) {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await Promise.all([
      shopRepository.list({ status: query.status, skip, take }),
      shopRepository.count(query.status),
    ]);
    return { data, meta: buildPageMeta(total, page, limit) };
  }

  async approveShop(adminId: string, shopId: string) {
    await this.ensureShop(shopId);
    return shopRepository.update(shopId, {
      status: ShopStatus.approved,
      verifiedById: adminId,
      verifiedAt: new Date(),
      rejectionReason: null,
    });
  }

  async rejectShop(adminId: string, shopId: string, input: RejectShopInput) {
    await this.ensureShop(shopId);
    return shopRepository.update(shopId, {
      status: ShopStatus.rejected,
      verifiedById: adminId,
      verifiedAt: new Date(),
      rejectionReason: input.reason,
    });
  }

  platformAnalytics() {
    return adminRepository.platformStats();
  }

  // ---- KYC document review (central_admin, cross-tenant) --------------------

  async listShopDocuments(shopId: string) {
    await this.ensureShop(shopId);
    return shopRepository.listDocuments(shopId);
  }

  async getShopDocument(shopId: string, docId: string) {
    const doc = await shopRepository.findDocument(shopId, docId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    return {
      buffer: Buffer.from(doc.data),
      mimeType: doc.mimeType,
      originalName: doc.originalName,
      byteSize: doc.byteSize,
    };
  }

  private async ensureShop(shopId: string) {
    const shop = await shopRepository.findByIdBasic(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }
    return shop;
  }
}

export const adminService = new AdminService();
