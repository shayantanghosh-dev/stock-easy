"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Receipt, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, generateIdempotencyKey } from "@/services/api";
import { toast } from "@/components/ui/toaster";
import { formatMoney, percentOf, subtractMoney, sumMoney } from "@/lib/money";
import { useCreateSale } from "@/features/billing/hooks";
import type { CreateSalePayload } from "@/features/billing/types";
import { useCart } from "./use-cart";
import { CartLine, type LinePreview } from "./cart-line";
import { PosSearch } from "./pos-search";

const GST_OPTIONS = ["0", "5", "12", "18"];
const PAYMENT_METHODS = ["cash", "card", "upi"];

export function PosTerminal() {
  const router = useRouter();
  const { user } = useAuth();
  const approved = user?.shop?.status === "approved";

  const { items, add, setQuantity, remove, clear } = useCart();
  const [previews, setPreviews] = useState<Record<string, LinePreview>>({});
  const createSale = useCreateSale();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState("0");
  const [gstRate, setGstRate] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const idemRef = useRef<{ key: string; hash: string } | null>(null);

  const onPreview = useCallback((medicineId: string, preview: LinePreview) => {
    setPreviews((prev) => {
      const existing = prev[medicineId];
      if (
        existing &&
        existing.estimate === preview.estimate &&
        existing.sufficient === preview.sufficient &&
        existing.loading === preview.loading
      ) {
        return prev;
      }
      return { ...prev, [medicineId]: preview };
    });
  }, []);

  const removeItem = (medicineId: string) => {
    remove(medicineId);
    setPreviews((prev) => {
      const next = { ...prev };
      delete next[medicineId];
      return next;
    });
  };

  const clearAll = () => {
    clear();
    setPreviews({});
    idemRef.current = null;
  };

  // ---- Estimated totals (preview only; backend is authoritative) ----
  const subtotal = useMemo(
    () => sumMoney(items.map((i) => previews[i.medicine.id]?.estimate ?? "0.00")),
    [items, previews],
  );
  const taxable = subtractMoney(subtotal, discount || "0", true);
  const gstAmount = percentOf(taxable, gstRate || "0");
  const total = sumMoney([taxable, gstAmount]);

  const anyLoading = items.some((i) => previews[i.medicine.id]?.loading ?? true);
  const allSufficient = items.every((i) => previews[i.medicine.id]?.sufficient ?? false);
  const canCheckout = approved && items.length > 0 && allSufficient && !anyLoading && !createSale.isPending;

  const completeSale = async () => {
    const payload: CreateSalePayload = {
      customer: customerName || customerPhone ? { name: customerName || undefined, phone: customerPhone || undefined } : undefined,
      items: items.map((i) => ({ medicineId: i.medicine.id, quantity: i.quantity })),
      discount: Number(discount) || 0,
      gstRate: Number(gstRate) || 0,
      paymentMethod,
    };

    // Stable Idempotency-Key per cart payload — retries replay, edits mint a new key.
    const hash = JSON.stringify(payload);
    if (!idemRef.current || idemRef.current.hash !== hash) {
      idemRef.current = { key: generateIdempotencyKey(), hash };
    }

    try {
      const result = await createSale.mutateAsync({ payload, idempotencyKey: idemRef.current.key });
      idemRef.current = null;
      clearAll();
      toast.success(result.replayed ? "Sale already recorded — showing the original bill." : "Sale completed");
      router.push(`/bills/${result.bill.id}`);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't complete the sale"));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Left: search + cart */}
      <div className="space-y-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <PosSearch onAdd={add} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-body-lg font-bold text-on-surface">
              Cart {items.length > 0 ? `(${items.length})` : ""}
            </h2>
            {items.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-error">
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Cart is empty"
              description="Search and add medicines to start a sale."
            />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <CartLine
                  key={item.medicine.id}
                  item={item}
                  onQuantityChange={(q) => setQuantity(item.medicine.id, q)}
                  onRemove={() => removeItem(item.medicine.id)}
                  onPreview={onPreview}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: summary */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="font-display text-body-lg font-bold text-on-surface">Order summary</h2>

          {!approved ? (
            <div className="flex items-start gap-2 rounded-lg border border-warning-container bg-warning-container/40 p-3 text-on-warning-container">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="font-body-sm text-body-sm">
                Selling is disabled until your pharmacy is approved.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="custName">Customer</Label>
              <Input id="custName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custPhone">Phone</Label>
              <Input id="custPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>GST rate</Label>
              <Select value={gstRate} onValueChange={setGstRate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GST_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">
                    {p.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border-t border-outline-variant pt-4 font-body-sm text-body-sm">
            <Row label="Subtotal (est.)" value={formatMoney(subtotal)} />
            <Row label="Discount" value={`− ${formatMoney(discount || "0")}`} />
            <Row label={`GST (${gstRate || 0}%)`} value={`+ ${formatMoney(gstAmount)}`} />
            <div className="flex items-center justify-between border-t border-outline-variant pt-2">
              <span className="font-label-md text-label-md font-bold text-on-surface">Total (est.)</span>
              <span className="font-data-mono text-headline-md font-bold text-primary">{formatMoney(total)}</span>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={completeSale} loading={createSale.isPending} disabled={!canCheckout}>
            <Receipt className="h-4 w-4" />
            Complete sale
          </Button>
          <p className="text-center font-label-sm text-[11px] text-on-surface-variant">
            Final totals are calculated and confirmed by the server.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-data-mono text-on-surface">{value}</span>
    </div>
  );
}
