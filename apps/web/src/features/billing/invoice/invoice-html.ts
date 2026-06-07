import { clientEnv } from "@/lib/env";
import { formatMoney, fromMinorUnits, subtractMoney, toMinorUnits } from "@/lib/money";
import { formatDateTime, formatMonthYear, humanizeEnum } from "@/lib/format";
import type { BillWithItems } from "@/types/models";

export type InvoiceFormat = "a4" | "thermal";

/** Shop fields needed for a complete pharmacy invoice header. */
export interface InvoiceShop {
  name: string;
  address?: string | null;
  phone?: string | null;
  gstNumber?: string | null;
  licenseNumber?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
}

/** Escape a value for safe interpolation into HTML text/attributes. */
function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const money = (v: string | number | null | undefined) => esc(formatMoney(v));

/** CGST/SGST split of the GST amount (halves that sum back to the total). */
function gstSplit(tax: string): { cgst: string; sgst: string } {
  const cgst = fromMinorUnits(Math.round(toMinorUnits(tax) / 2));
  const sgst = subtractMoney(tax, cgst); // exact remainder, no rounding drift
  return { cgst, sgst };
}

function statusNote(bill: BillWithItems): string {
  switch (bill.status) {
    case "voided":
      return "VOIDED — this sale has been cancelled.";
    case "returned":
      return "RETURNED — all items on this bill were returned.";
    case "partially_returned":
      return "PARTIALLY RETURNED — some items on this bill were returned.";
    default:
      return "";
  }
}

/** Build the shop contact lines shown under the pharmacy name. */
function shopMetaLines(shop: InvoiceShop): string[] {
  const lines: string[] = [];
  if (shop.address) lines.push(esc(shop.address));
  const contact: string[] = [];
  if (shop.phone) contact.push(`Ph: ${esc(shop.phone)}`);
  if (shop.ownerEmail) contact.push(esc(shop.ownerEmail));
  if (contact.length) lines.push(contact.join(" &nbsp;·&nbsp; "));
  const ids: string[] = [];
  if (shop.gstNumber) ids.push(`GSTIN: ${esc(shop.gstNumber)}`);
  if (shop.licenseNumber) ids.push(`DL No: ${esc(shop.licenseNumber)}`);
  if (ids.length) lines.push(ids.join(" &nbsp;·&nbsp; "));
  return lines;
}

// ---------------------------------------------------------------------------
// A4 tax invoice
// ---------------------------------------------------------------------------
function a4Body(shop: InvoiceShop, bill: BillWithItems): string {
  const note = statusNote(bill);
  const showGst = Number(bill.gstRate) > 0;
  const { cgst, sgst } = gstSplit(bill.tax);

  const rows = (bill.items ?? [])
    .map((item, i) => {
      const name = esc(item.medicine?.name ?? "Medicine");
      const sub = [item.medicine?.strength, item.medicine?.form].filter(Boolean).map(esc).join(" · ");
      const expiry = item.batch?.expiryDate ? esc(formatMonthYear(item.batch.expiryDate)) : "—";
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td>
            <div class="med">${name}</div>
            ${sub ? `<div class="med-sub">${sub}</div>` : ""}
          </td>
          <td class="mono">#${esc(item.batch?.batchNumber ?? "—")}</td>
          <td class="mono">${expiry}</td>
          <td class="num mono">${esc(item.quantity)}</td>
          <td class="num mono">${money(item.unitPrice)}</td>
          <td class="num mono">${money(item.lineTotal)}</td>
        </tr>`;
    })
    .join("");

  return `
  <div class="sheet">
    ${note ? `<div class="banner">${esc(note)}</div>` : ""}
    <header class="head">
      <div class="shop">
        <h1>${esc(shop.name)}</h1>
        ${shopMetaLines(shop).map((l) => `<div class="line">${l}</div>`).join("")}
      </div>
      <div class="doc">
        <div class="doc-title">TAX INVOICE</div>
        <table class="doc-meta">
          <tr><td>Invoice No</td><td class="mono">#${esc(bill.billNumber)}</td></tr>
          <tr><td>Date</td><td>${esc(formatDateTime(bill.createdAt))}</td></tr>
          <tr><td>Payment</td><td>${esc(humanizeEnum(bill.paymentMethod))}</td></tr>
        </table>
      </div>
    </header>

    <section class="parties">
      <div>
        <div class="label">Billed To</div>
        <div class="party-name">${esc(bill.customerName || "Counter Sale")}</div>
        ${bill.customerPhone ? `<div class="line mono">${esc(bill.customerPhone)}</div>` : ""}
      </div>
      <div class="right">
        <div class="label">Served By</div>
        <div class="party-name">${esc(bill.soldBy?.fullName ?? "—")}</div>
      </div>
    </section>

    <table class="items">
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Medicine</th>
          <th>Batch</th>
          <th>Expiry</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="7" class="empty">No line items</td></tr>`}</tbody>
    </table>

    <section class="summary">
      <table class="totals">
        <tr><td>Subtotal</td><td class="num mono">${money(bill.subtotal)}</td></tr>
        <tr><td>Discount</td><td class="num mono">− ${money(bill.discount)}</td></tr>
        ${
          showGst
            ? `<tr><td>CGST (${esc(Number(bill.gstRate) / 2)}%)</td><td class="num mono">${money(cgst)}</td></tr>
               <tr><td>SGST (${esc(Number(bill.gstRate) / 2)}%)</td><td class="num mono">${money(sgst)}</td></tr>`
            : `<tr><td>GST</td><td class="num mono">${money(bill.tax)}</td></tr>`
        }
        <tr class="grand"><td>Total</td><td class="num mono">${money(bill.total)}</td></tr>
      </table>
    </section>

    <footer class="foot">
      <div>This is a computer-generated invoice and does not require a signature.</div>
      ${shop.ownerName ? `<div>For ${esc(shop.name)} · ${esc(shop.ownerName)}</div>` : ""}
      <div class="thanks">Thank you. Get well soon!</div>
    </footer>
  </div>`;
}

// ---------------------------------------------------------------------------
// 80mm thermal receipt
// ---------------------------------------------------------------------------
function thermalBody(shop: InvoiceShop, bill: BillWithItems): string {
  const note = statusNote(bill);
  const lines = (bill.items ?? [])
    .map((item) => {
      const name = esc(item.medicine?.name ?? "Medicine");
      const batch = item.batch?.batchNumber ? `B#${esc(item.batch.batchNumber)}` : "";
      const exp = item.batch?.expiryDate ? `Exp ${esc(formatMonthYear(item.batch.expiryDate))}` : "";
      const meta = [batch, exp].filter(Boolean).join("  ");
      return `
        <div class="t-item">
          <div class="t-name">${name}</div>
          ${meta ? `<div class="t-meta">${meta}</div>` : ""}
          <div class="t-row"><span>${esc(item.quantity)} × ${money(item.unitPrice)}</span><span class="mono">${money(item.lineTotal)}</span></div>
        </div>`;
    })
    .join("");

  const showGst = Number(bill.gstRate) > 0;

  return `
  <div class="receipt">
    <div class="t-head">
      <div class="t-shop">${esc(shop.name)}</div>
      ${shop.address ? `<div class="t-sub">${esc(shop.address)}</div>` : ""}
      ${shop.phone ? `<div class="t-sub">Ph: ${esc(shop.phone)}</div>` : ""}
      ${shop.gstNumber ? `<div class="t-sub">GSTIN: ${esc(shop.gstNumber)}</div>` : ""}
      ${shop.licenseNumber ? `<div class="t-sub">DL: ${esc(shop.licenseNumber)}</div>` : ""}
    </div>
    <div class="t-rule"></div>
    <div class="t-row"><span>Bill</span><span class="mono">#${esc(bill.billNumber)}</span></div>
    <div class="t-row"><span>Date</span><span>${esc(formatDateTime(bill.createdAt))}</span></div>
    <div class="t-row"><span>Customer</span><span>${esc(bill.customerName || "Counter")}</span></div>
    ${bill.customerPhone ? `<div class="t-row"><span>Phone</span><span class="mono">${esc(bill.customerPhone)}</span></div>` : ""}
    <div class="t-rule"></div>
    ${lines || `<div class="t-sub">No items</div>`}
    <div class="t-rule"></div>
    <div class="t-row"><span>Subtotal</span><span class="mono">${money(bill.subtotal)}</span></div>
    <div class="t-row"><span>Discount</span><span class="mono">− ${money(bill.discount)}</span></div>
    <div class="t-row"><span>GST${showGst ? ` (${esc(bill.gstRate)}%)` : ""}</span><span class="mono">${money(bill.tax)}</span></div>
    <div class="t-row t-total"><span>TOTAL</span><span class="mono">${money(bill.total)}</span></div>
    <div class="t-row"><span>Paid by</span><span>${esc(humanizeEnum(bill.paymentMethod))}</span></div>
    ${note ? `<div class="t-rule"></div><div class="t-note">${esc(note)}</div>` : ""}
    <div class="t-rule"></div>
    <div class="t-foot">Thank you. Get well soon!</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const A4_STYLES = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; font-size: 12px; line-height: 1.45; }
  .sheet { max-width: 760px; margin: 0 auto; }
  .mono { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
  .num { text-align: right; }
  .banner { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; font-weight: 700; padding: 8px 12px; border-radius: 8px; margin-bottom: 16px; letter-spacing: .02em; }
  .head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
  .shop h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: -.01em; }
  .shop .line { color: #475569; }
  .doc { text-align: right; min-width: 240px; }
  .doc-title { font-size: 16px; font-weight: 800; letter-spacing: .12em; color: #1d4ed8; margin-bottom: 8px; }
  .doc-meta { margin-left: auto; border-collapse: collapse; }
  .doc-meta td { padding: 1px 0 1px 14px; }
  .doc-meta td:first-child { color: #64748b; }
  .parties { display: flex; justify-content: space-between; gap: 24px; margin: 18px 0; }
  .parties .right { text-align: right; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin-bottom: 3px; }
  .party-name { font-weight: 700; font-size: 13px; }
  .line { color: #475569; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.items thead th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 8px 8px; }
  table.items thead th.num { text-align: right; }
  table.items tbody td { padding: 8px 8px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
  .med { font-weight: 600; }
  .med-sub { color: #94a3b8; font-size: 11px; }
  td.empty { text-align: center; color: #94a3b8; padding: 18px; }
  .summary { display: flex; justify-content: flex-end; margin-top: 16px; }
  table.totals { min-width: 280px; border-collapse: collapse; }
  table.totals td { padding: 4px 0; }
  table.totals td:first-child { color: #475569; }
  table.totals tr.grand td { border-top: 2px solid #0f172a; padding-top: 8px; font-weight: 800; font-size: 15px; }
  .foot { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px; }
  .foot .thanks { margin-top: 6px; color: #0f172a; font-weight: 600; }
`;

const THERMAL_STYLES = `
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Roboto, Arial, sans-serif; color: #000; margin: 0; font-size: 12px; line-height: 1.35; }
  .receipt { width: 72mm; margin: 0 auto; }
  .mono { font-variant-numeric: tabular-nums; }
  .t-head { text-align: center; }
  .t-shop { font-size: 15px; font-weight: 800; }
  .t-sub { font-size: 11px; color: #111; }
  .t-rule { border-top: 1px dashed #000; margin: 6px 0; }
  .t-row { display: flex; justify-content: space-between; gap: 8px; }
  .t-item { margin: 4px 0; }
  .t-name { font-weight: 700; }
  .t-meta { font-size: 10px; color: #333; }
  .t-total { font-weight: 800; font-size: 14px; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
  .t-note { font-weight: 700; text-align: center; }
  .t-foot { text-align: center; margin-top: 6px; font-weight: 600; }
`;

/**
 * Build a complete, standalone HTML invoice document for a bill. The returned
 * string is a full <html> document with embedded print CSS — render it with
 * `printDocument()`.
 */
export function buildInvoiceHtml(
  shop: InvoiceShop,
  bill: BillWithItems,
  format: InvoiceFormat = "a4",
): string {
  const isThermal = format === "thermal";
  const styles = isThermal ? THERMAL_STYLES : A4_STYLES;
  const body = isThermal ? thermalBody(shop, bill) : a4Body(shop, bill);
  const title = `Invoice #${bill.billNumber} — ${shop.name}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>${styles}</style>
</head>
<body>${body}</body>
</html>`;
}

/** Currency symbol is sourced from runtime config (kept for parity/testing). */
export const invoiceCurrency = clientEnv.currency;
