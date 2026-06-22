import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CheckoutItem {
  product_id: string;
  variant_id: string | null;
  course_id: string | null;
  quantity: number;
  price: number | string;
  // UI helpers
  title: string;
  variant_name?: string;
  image?: string;
}

interface CheckoutState {
  items: CheckoutItem[];
  setItems: (items: CheckoutItem[]) => void;
  clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      items: [],
      setItems: (items) => set({ items }),
      clearCheckout: () => set({ items: [] }),
    }),
    {
      name: "artistkashi-checkout",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
