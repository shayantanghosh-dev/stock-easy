import { Prisma, ShopStatus } from '@prisma/client';
import { NotFoundError } from '../../utils/AppError';
import { shopRepository } from './repository';
import type { SetLicenseInput, UpdateShopInput } from './validators';

class ShopService {
  async getMyShop(shopId: string) {
    const shop = await shopRepository.findById(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }
    return shop;
  }

  async updateMyShop(shopId: string, input: UpdateShopInput) {
    return shopRepository.update(shopId, input);
  }

  /** Updating the license re-opens verification if the shop was rejected. */
  async setLicense(shopId: string, input: SetLicenseInput) {
    const shop = await shopRepository.findByIdBasic(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    const data: Prisma.ShopUncheckedUpdateInput = {};
    if (input.licenseNumber !== undefined) data.licenseNumber = input.licenseNumber;
    if (input.licenseDocUrl !== undefined) data.licenseDocUrl = input.licenseDocUrl;
    if (shop.status === ShopStatus.rejected) {
      data.status = ShopStatus.pending;
      data.rejectionReason = null;
    }

    return shopRepository.update(shopId, data);
  }
}

export const shopService = new ShopService();
