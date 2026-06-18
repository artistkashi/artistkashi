import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CheckoutItem {
  product_id: number;
  variant_id: number | null;
  course_id: number | null;
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
