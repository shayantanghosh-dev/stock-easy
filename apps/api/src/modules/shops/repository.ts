import { Prisma, ShopStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface ShopListParams {
  status?: ShopStatus;
  skip: number;
  take: number;
}

/**
 * Owns the `shops` table. Exported for use by the admin and subscriptions
 * modules (verification queue, plan assignment).
 */
export class ShopRepository {
  findById(id: string) {
    return prisma.shop.findUnique({ where: { id }, include: { plan: true } });
  }

  findByIdBasic(id: string) {
    return prisma.shop.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.ShopUncheckedUpdateInput) {
    return prisma.shop.update({ where: { id }, data, include: { plan: true } });
  }

  list(params: ShopListParams) {
    return prisma.shop.findMany({
      where: params.status ? { status: params.status } : {},
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { id: true, email: true, fullName: true } } },
    });
  }

  count(status?: ShopStatus) {
    return prisma.shop.count({ where: status ? { status } : {} });
  }

  // ---- verification documents ----------------------------------------------
  // Metadata-only select used everywhere a list/preview is shown — the `data`
  // bytea is NEVER selected unless a single document is being downloaded.

  private static readonly DOC_META_SELECT = {
    id: true,
    shopId: true,
    kind: true,
    originalName: true,
    mimeType: true,
    byteSize: true,
    uploadedById: true,
    createdAt: true,
  } satisfies Prisma.ShopDocumentSelect;

  listDocuments(shopId: string) {
    return prisma.shopDocument.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      select: ShopRepository.DOC_META_SELECT,
    });
  }

  /** Full row incl. bytes — only for the authenticated download path. */
  findDocument(shopId: string, id: string) {
    return prisma.shopDocument.findFirst({ where: { id, shopId } });
  }

  createDocument(data: {
    shopId: string;
    kind: Prisma.ShopDocumentCreateInput['kind'];
    originalName: string;
    mimeType: string;
    byteSize: number;
    data: Uint8Array<ArrayBuffer>;
    uploadedById: string | null;
  }) {
    return prisma.shopDocument.create({
      data: {
        shopId: data.shopId,
        kind: data.kind,
        originalName: data.originalName,
        mimeType: data.mimeType,
        byteSize: data.byteSize,
        data: data.data,
        uploadedById: data.uploadedById,
      },
      select: ShopRepository.DOC_META_SELECT,
    });
  }

  async deleteDocument(shopId: string, id: string): Promise<boolean> {
    const res = await prisma.shopDocument.deleteMany({ where: { id, shopId } });
    return res.count > 0;
  }

  countDocuments(shopId: string) {
    return prisma.shopDocument.count({ where: { shopId } });
  }
}

export const shopRepository = new ShopRepository();
