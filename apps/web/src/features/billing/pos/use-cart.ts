"use client";

import { useCallback, useState } from "react";
import type { Medicine } from "@/types/models";

export interface CartItem {
  medicine: Medicine;
  quantity: number;
}

/** Local POS cart state. The backend remains authoritative for all money math. */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = useCallback((medicine: Medicine) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.medicine.id === medicine.id);
      if (existing) {
        return prev.map((i) =>
          i.medicine.id === medicine.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { medicine, quantity: 1 }];
    });
  }, []);

  const setQuantity = useCallback((medicineId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.medicine.id === medicineId ? { ...i, quantity: Math.max(1, quantity) } : i)),
    );
  }, []);

  const remove = useCallback((medicineId: string) => {
    setItems((prev) => prev.filter((i) => i.medicine.id !== medicineId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, add, setQuantity, remove, clear };
}
