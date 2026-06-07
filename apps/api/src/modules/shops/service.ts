import { Prisma, ShopStatus } from '@prisma/client';
import { DOC_MAX_BYTES, MAX_DOCS_PER_SHOP } from '../../config/constants';
import { BadRequestError, NotFoundError } from '../../utils/AppError';
import { maskShop, sniffMimeType } from '../../utils/kyc';
import { shopRepository } from './repository';
import type { SetLicenseInput, UpdateShopInput, UploadDocumentInput } from './validators';

class ShopService {
  async getMyShop(shopId: string) {
    const shop = await shopRepository.findById(shopId);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }
    return maskShop(shop);
  }

  async updateMyShop(shopId: string, input: UpdateShopInput) {
    const shop = await shopRepository.update(shopId, input);
    return maskShop(shop);
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

    return maskShop(await shopRepository.update(shopId, data));
  }

  // ---- verification documents ----------------------------------------------

  listDocuments(shopId: string) {
    return shopRepository.listDocuments(shopId);
  }

  /**
   * Store a base64-encoded verification document. The declared MIME type is
   * re-validated against the file's actual magic bytes, and the decoded size is
   * enforced server-side — a client cannot disguise an oversized or non-allowed
   * file. Uploading a fresh document on a rejected shop re-opens verification.
   */
  async uploadDocument(shopId: string, userId: string, input: UploadDocumentInput) {
    // Bound storage abuse on this pre-approval endpoint.
    if ((await shopRepository.countDocuments(shopId)) >= MAX_DOCS_PER_SHOP) {
      throw new BadRequestError(`You can store at most ${MAX_DOCS_PER_SHOP} documents. Remove one and try again.`);
    }

    // Tolerate an accidental data: URL prefix from the browser.
    const base64 = input.data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    if (buffer.length === 0) {
      throw new BadRequestError('The uploaded file is empty or not valid base64');
    }
    if (buffer.length > DOC_MAX_BYTES) {
      throw new BadRequestError(`File exceeds the ${Math.round(DOC_MAX_BYTES / 1024 / 1024)}MB limit`);
    }

    const sniffed = sniffMimeType(buffer);
    if (!sniffed) {
      throw new BadRequestError('Unsupported file. Only PDF, JPG and PNG documents are accepted');
    }
    if (sniffed !== input.mimeType) {
      throw new BadRequestError('The file content does not match its declared type');
    }

    // Copy into a fresh, ArrayBuffer-backed Uint8Array (Prisma 6's Bytes type is
    // Uint8Array<ArrayBuffer>; Buffer/ArrayBufferLike does not satisfy it).
    const fileBytes = new Uint8Array(buffer.length);
    fileBytes.set(buffer);

    const doc = await shopRepository.createDocument({
      shopId,
      kind: input.kind,
      originalName: input.fileName,
      mimeType: sniffed,
      byteSize: buffer.length,
      data: fileBytes,
      uploadedById: userId,
    });

    // A re-submission after rejection should re-open the review queue.
    const shop = await shopRepository.findByIdBasic(shopId);
    if (shop?.status === ShopStatus.rejected) {
      await shopRepository.update(shopId, { status: ShopStatus.pending, rejectionReason: null });
    }

    return doc;
  }

  async getDocumentData(shopId: string, id: string) {
    const doc = await shopRepository.findDocument(shopId, id);
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

  async deleteDocument(shopId: string, id: string): Promise<void> {
    const removed = await shopRepository.deleteDocument(shopId, id);
    if (!removed) {
      throw new NotFoundError('Document not found');
    }
  }
}

export const shopService = new ShopService();
