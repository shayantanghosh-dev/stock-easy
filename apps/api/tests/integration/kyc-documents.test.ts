import { beforeAll, describe, expect, it } from 'vitest';
import { ShopStatus } from '@prisma/client';
import { prisma } from '../helpers/db';
import { createShop, TestShop } from '../helpers/factories';
import { shopService } from '../../src/modules/shops/service';
import { adminService } from '../../src/modules/admin/service';
import { maskAadhaar, maskPan, maskShop } from '../../src/utils/kyc';
import { DOC_MAX_BYTES, MAX_DOCS_PER_SHOP } from '../../src/config/constants';

// Minimal byte payloads whose leading magic bytes match each allowed type.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png-body')]);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n');
const b64 = (buf: Buffer) => buf.toString('base64');

describe('KYC documents + masking', () => {
  let shopA: TestShop;
  let shopB: TestShop;

  beforeAll(async () => {
    shopA = await createShop();
    shopB = await createShop();
    // Stamp sensitive identifiers directly (factories don't set KYC).
    await prisma.shop.update({
      where: { id: shopA.shopId },
      data: { aadhaarNumber: '123412341234', panNumber: 'ABCDE1234F', city: 'Bengaluru' },
    });
  });

  it('masks Aadhaar and PAN, keeping only the last 4 chars', () => {
    expect(maskAadhaar('123412341234')).toBe('XXXX XXXX 1234');
    expect(maskPan('ABCDE1234F')).toBe('XXXXXX234F');
    expect(maskAadhaar(null)).toBeNull();
  });

  it('getMyShop returns masked KYC but the DB keeps the full value', async () => {
    const masked = await shopService.getMyShop(shopA.shopId);
    expect(masked.aadhaarNumber).toBe('XXXX XXXX 1234');
    expect(masked.panNumber).toBe('XXXXXX234F');
    expect(masked.city).toBe('Bengaluru'); // non-sensitive field untouched

    const raw = await prisma.shop.findUniqueOrThrow({ where: { id: shopA.shopId } });
    expect(raw.aadhaarNumber).toBe('123412341234');
    expect(raw.panNumber).toBe('ABCDE1234F');
  });

  it('maskShop preserves joined relations (plan/owner) while masking', () => {
    const out = maskShop({ aadhaarNumber: '999988887777', panNumber: 'ZZZZZ9999Z', plan: { id: 'p' } });
    expect(out.aadhaarNumber).toBe('XXXX XXXX 7777');
    expect(out.plan).toEqual({ id: 'p' });
  });

  it('uploads a document, stores metadata, and returns the bytes on download', async () => {
    const meta = await shopService.uploadDocument(shopA.shopId, shopA.ownerId, {
      kind: 'aadhaar',
      fileName: 'aadhaar.png',
      mimeType: 'image/png',
      data: b64(PNG),
    });
    expect(meta.byteSize).toBe(PNG.length);
    expect((meta as { data?: unknown }).data).toBeUndefined(); // metadata never includes bytes

    const list = await shopService.listDocuments(shopA.shopId);
    expect(list.some((d) => d.id === meta.id && d.kind === 'aadhaar')).toBe(true);

    const file = await shopService.getDocumentData(shopA.shopId, meta.id);
    expect(file.mimeType).toBe('image/png');
    expect(Buffer.from(file.buffer).equals(PNG)).toBe(true);
  });

  it('accepts a PDF whose magic bytes match its declared type', async () => {
    const meta = await shopService.uploadDocument(shopA.shopId, shopA.ownerId, {
      kind: 'license',
      fileName: 'license.pdf',
      mimeType: 'application/pdf',
      data: b64(PDF),
    });
    const file = await shopService.getDocumentData(shopA.shopId, meta.id);
    expect(file.mimeType).toBe('application/pdf');
  });

  it('rejects a file whose content does not match its declared MIME type', async () => {
    await expect(
      shopService.uploadDocument(shopA.shopId, shopA.ownerId, {
        kind: 'pan',
        fileName: 'fake.pdf',
        mimeType: 'application/pdf',
        data: b64(PNG), // PNG bytes declared as PDF
      }),
    ).rejects.toThrow(/does not match/i);
  });

  it('rejects an unsupported file type (no allowed magic bytes)', async () => {
    await expect(
      shopService.uploadDocument(shopA.shopId, shopA.ownerId, {
        kind: 'other',
        fileName: 'note.png',
        mimeType: 'image/png',
        data: b64(Buffer.from('this is plain text, not an image')),
      }),
    ).rejects.toThrow(/unsupported file/i);
  });

  it('rejects a file larger than the size limit', async () => {
    const big = Buffer.alloc(DOC_MAX_BYTES + 16);
    PNG.copy(big); // valid PNG header, but oversized
    await expect(
      shopService.uploadDocument(shopA.shopId, shopA.ownerId, {
        kind: 'other',
        fileName: 'big.png',
        mimeType: 'image/png',
        data: b64(big),
      }),
    ).rejects.toThrow(/limit/i);
  });

  it('enforces tenant isolation: shop B cannot read shop A documents', async () => {
    const [doc] = await shopService.listDocuments(shopA.shopId);
    expect(doc).toBeDefined();
    await expect(shopService.getDocumentData(shopB.shopId, doc.id)).rejects.toThrow(/not found/i);
    await expect(shopService.deleteDocument(shopB.shopId, doc.id)).rejects.toThrow(/not found/i);
    // Shop B's own document list is empty.
    expect(await shopService.listDocuments(shopB.shopId)).toHaveLength(0);
  });

  it('lets a central admin review and download any shop document, scoped by shop id', async () => {
    const [doc] = await shopService.listDocuments(shopA.shopId);
    const adminList = await adminService.listShopDocuments(shopA.shopId);
    expect(adminList.some((d) => d.id === doc.id)).toBe(true);

    const file = await adminService.getShopDocument(shopA.shopId, doc.id);
    expect(file.byteSize).toBeGreaterThan(0);

    // Wrong shop id for that document id → not found (no cross-shop leak).
    await expect(adminService.getShopDocument(shopB.shopId, doc.id)).rejects.toThrow(/not found/i);
  });

  it('caps the number of documents per shop', async () => {
    const s = await createShop();
    const pdf = b64(PDF);
    for (let i = 0; i < MAX_DOCS_PER_SHOP; i++) {
      await shopService.uploadDocument(s.shopId, s.ownerId, {
        kind: 'other',
        fileName: `d${i}.pdf`,
        mimeType: 'application/pdf',
        data: pdf,
      });
    }
    await expect(
      shopService.uploadDocument(s.shopId, s.ownerId, {
        kind: 'other',
        fileName: 'overflow.pdf',
        mimeType: 'application/pdf',
        data: pdf,
      }),
    ).rejects.toThrow(/at most|limit/i);
  });

  it('re-opens verification when a rejected shop uploads a fresh document', async () => {
    const rejected = await createShop({ status: ShopStatus.rejected });
    await prisma.shop.update({ where: { id: rejected.shopId }, data: { rejectionReason: 'blurry scan' } });

    await shopService.uploadDocument(rejected.shopId, rejected.ownerId, {
      kind: 'pan',
      fileName: 'pan.pdf',
      mimeType: 'application/pdf',
      data: b64(PDF),
    });

    const after = await prisma.shop.findUniqueOrThrow({ where: { id: rejected.shopId } });
    expect(after.status).toBe(ShopStatus.pending);
    expect(after.rejectionReason).toBeNull();
  });
});
