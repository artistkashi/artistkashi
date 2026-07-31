import { create } from "zustand";

interface NavState {
  pendingCourseSlug: string | null;
  startCourseNavigation: (slug: string) => void;
  endCourseNavigation: () => void;
}

export const useNavStore = create<NavState>()((set) => ({
  pendingCourseSlug: null,
  startCourseNavigation: (slug) => set({ pendingCourseSlug: slug }),
  endCourseNavigation: () => set({ pendingCourseSlug: null }),
}));
