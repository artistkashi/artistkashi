import { unwrap } from "@/api/client-service";
import type { CartItemRead } from "@/api/openapi-client";
import {
  addToCart,
  clearCart,
  getMyCart,
  removeFromCart,
  updateCartItem,
  getCounts,
} from "@/api/openapi-client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface CartState {
  items: CartItemRead[];
  loaded: boolean;
  productIds: Record<string, number>;
  courseIds: Record<string, number>;
  cartCount: number;
  fetchCart: () => Promise<void>;
  addItem: (
    id: string,
    type?: "product" | "course",
    variantId?: string
  ) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  inCart: (
    id: string,
    type?: "product" | "course",
    variantId?: string
  ) => boolean;
}

/** Builds index keys — for variant products, key is "product_id:variant_id" */
function productKey(productId: string, variantId?: string): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

function buildIndex(items: CartItemRead[]): {
  productIds: Record<string, number>;
  courseIds: Record<string, number>;
} {
  const productIds: Record<string, number> = {};
  const courseIds: Record<string, number> = {};
  for (const item of items) {
    if (item.product_id) {
      const key = productKey(item.product_id, item.variant_id ?? undefined);
      productIds[key] = item.id;
    }
    if (item.course_id) courseIds[item.course_id] = item.id;
  }
  return { productIds, courseIds };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      loaded: false,
      productIds: {},
      courseIds: {},
      cartCount: 0,

      fetchCart: async () => {
        try {
          const data = await unwrap(getMyCart());
          const items = data ?? [];
          set({ items, ...buildIndex(items), loaded: true });
        } catch {
          set({ items: [], productIds: {}, courseIds: {}, loaded: true });
        }
      },

      addItem: async (
        id: string,
        type: "product" | "course" = "product",
        variantId?: string
      ) => {
        const { productIds, courseIds } = get();
        const key = type === "product" ? productKey(id, variantId) : id;
        const ids = type === "product" ? productIds : courseIds;
        const existingId = ids[key];

        if (existingId && existingId > 0) {
          const existing = get().items.find((i) => i.id === existingId);
          if (!existing) return;
          const old = { items: [...get().items] };
          const updated = get().items.map((i) =>
            i.id === existingId
              ? { ...i, quantity: (existing.quantity ?? 1) + 1 }
              : i
          );
          set({ items: updated });
          try {
            await unwrap(
              updateCartItem({
                path: { item_id: existingId },
                body: { quantity: (existing.quantity ?? 1) + 1 },
              })
            );
          } catch {
            set(old);
            throw new Error("Failed to update cart");
          }
        } else {
          const newIds = { ...ids, [key]: -1 };
          if (type === "product") {
            set({ productIds: newIds, cartCount: get().cartCount + 1 });
          } else {
            set({ courseIds: newIds, cartCount: get().cartCount + 1 });
          }
          try {
            const body =
              type === "product"
                ? { product_id: id, variant_id: variantId ?? null }
                : { course_id: id };
            const result = await unwrap(addToCart({ body }));
            if (result?.id) {
              const patched = {
                ...(type === "product" ? get().productIds : get().courseIds),
                [key]: result.id,
              };
              if (type === "product") {
                set({ productIds: patched });
              } else {
                set({ courseIds: patched });
              }
            }
            const counts = await unwrap(getCounts());
            if (counts?.cart_count !== undefined) {
              set({ cartCount: counts.cart_count });
            }
          } catch {
            const reverted = {
              ...(type === "product" ? get().productIds : get().courseIds),
            };
            delete reverted[key];
            if (type === "product") {
              set({
                productIds: reverted,
                cartCount: Math.max(0, get().cartCount - 1),
              });
            } else {
              set({
                courseIds: reverted,
                cartCount: Math.max(0, get().cartCount - 1),
              });
            }
            throw new Error("Failed to add to cart");
          }
        }
      },

      removeItem: async (itemId: number) => {
        const { productIds, courseIds } = get();
        const pEntry = Object.entries(productIds).find(
          ([, id]) => id === itemId
        );
        const cEntry = Object.entries(courseIds).find(
          ([, id]) => id === itemId
        );
        await unwrap(removeFromCart({ path: { item_id: itemId } }));
        const updatedItems = get().items.filter((i) => i.id !== itemId);
        const updatedProductIds = { ...productIds };
        const updatedCourseIds = { ...courseIds };
        if (pEntry) delete updatedProductIds[pEntry[0]];
        if (cEntry) delete updatedCourseIds[cEntry[0]];
        set({
          items: updatedItems,
          productIds: updatedProductIds,
          courseIds: updatedCourseIds,
        });
      },

      updateQuantity: async (itemId: number, quantity: number) => {
        if (quantity < 1) return;
        await unwrap(
          updateCartItem({ path: { item_id: itemId }, body: { quantity } })
        );
        set({
          items: get().items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: async () => {
        const ids = get().items.map((i) => i.id);
        if (ids.length === 0) return;
        await unwrap(clearCart({ body: { item_ids: ids } }));
        set({ items: [], productIds: {}, courseIds: {} });
      },

      inCart: (
        id: string,
        type: "product" | "course" = "product",
        variantId?: string
      ) => {
        const { productIds, courseIds } = get();
        const key = type === "product" ? productKey(id, variantId) : id;
        return type === "product" ? key in productIds : key in courseIds;
      },
    }),
    {
      name: "artistkashi-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        productIds: state.productIds,
        courseIds: state.courseIds,
        cartCount: state.cartCount,
      }),
    }
  )
);
