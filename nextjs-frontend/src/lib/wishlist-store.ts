import { unwrap } from "@/api/client-service";
import {
  addToWishlist,
  getMyWishlist,
  removeFromWishlist,
} from "@/api/openapi-client";
import type { WishlistRead } from "@/api/openapi-client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface WishlistState {
  items: WishlistRead[];
  loaded: boolean;
  productIds: Record<string, number>;
  courseIds: Record<string, number>;
  fetchWishlist: () => Promise<void>;
  toggleProduct: (productId: string) => Promise<void>;
  toggleCourse: (courseId: string) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  isProductWishlisted: (productId: string) => boolean;
  isCourseWishlisted: (courseId: string) => boolean;
}

function buildIndex(items: WishlistRead[]): {
  productIds: Record<string, number>;
  courseIds: Record<string, number>;
} {
  const productIds: Record<string, number> = {};
  const courseIds: Record<string, number> = {};
  for (const item of items) {
    if (item.product_id) productIds[item.product_id] = item.id;
    if (item.course_id) courseIds[item.course_id] = item.id;
  }
  return { productIds, courseIds };
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      loaded: false,
      productIds: {},
      courseIds: {},

      fetchWishlist: async () => {
        try {
          const data = await unwrap(getMyWishlist());
          const items = data ?? [];
          set({ items, ...buildIndex(items), loaded: true });
        } catch {
          set({ items: [], productIds: {}, courseIds: {}, loaded: true });
        }
      },

      toggleProduct: async (productId: string) => {
        const { productIds, items } = get();
        const existingId = productIds[productId];
        if (existingId) {
          const old = { items: [...items], productIds: { ...productIds } };
          const updated = items.filter((i) => i.id !== existingId);
          set({ items: updated, ...buildIndex(updated) });
          try {
            await unwrap(removeFromWishlist({ path: { item_id: existingId } }));
          } catch {
            set(old);
            throw new Error("Failed to remove from wishlist");
          }
        } else {
          const old = { productIds: { ...productIds } };
          const newProductIds = { ...productIds, [productId]: -1 };
          set({ productIds: newProductIds });
          try {
            await unwrap(addToWishlist({ body: { product_id: productId } }));
            await get().fetchWishlist();
          } catch {
            set(old);
            throw new Error("Failed to add to wishlist");
          }
        }
      },

      toggleCourse: async (courseId: string) => {
        const { courseIds, items } = get();
        const existingId = courseIds[courseId];
        if (existingId) {
          const old = { items: [...items], courseIds: { ...courseIds } };
          const updated = items.filter((i) => i.id !== existingId);
          set({ items: updated, ...buildIndex(updated) });
          try {
            await unwrap(removeFromWishlist({ path: { item_id: existingId } }));
          } catch {
            set(old);
            throw new Error("Failed to remove from wishlist");
          }
        } else {
          const old = { courseIds: { ...courseIds } };
          const newCourseIds = { ...courseIds, [courseId]: -1 };
          set({ courseIds: newCourseIds });
          try {
            await unwrap(addToWishlist({ body: { course_id: courseId } }));
            await get().fetchWishlist();
          } catch {
            set(old);
            throw new Error("Failed to add to wishlist");
          }
        }
      },

      removeItem: async (itemId: number) => {
        await unwrap(removeFromWishlist({ path: { item_id: itemId } }));
        const updated = get().items.filter((i) => i.id !== itemId);
        set({ items: updated, ...buildIndex(updated) });
      },

      isProductWishlisted: (productId: string) =>
        productId in get().productIds,

      isCourseWishlisted: (courseId: string) => courseId in get().courseIds,
    }),
    {
      name: "artistkashi-wishlist",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, productIds: state.productIds, courseIds: state.courseIds }),
    }
  )
);
