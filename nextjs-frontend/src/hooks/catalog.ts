"use client";

import { unwrap, unwrapPaginated } from "@/api/client-service";
import type {
  CourseCategoryCreate,
  CourseCategoryRead,
  ProductCategoryCreate,
  ProductCategoryRead,
  ProductMediumCreate,
  ProductMediumRead,
  VariantTypeCreate,
  VariantTypeRead,
} from "@/api/openapi-client";
import {
  createCategory as apiCreateCategory,
  createCourseCategory as apiCreateCourseCategory,
  createMedium as apiCreateMedium,
  createVariantType as apiCreateVariantType,
  listCategories,
  listCourseCategories,
  listMediums,
  listVariantTypes,
} from "@/api/openapi-client";
import { getErrorMessage } from "@/lib/error-handler";
import { useCallback, useEffect, useState } from "react";

// ─── useCategories ────────────────────────────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<ProductCategoryRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await unwrapPaginated(listCategories());
      setCategories(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { categories, loading, error, refetch };
}

// ─── useCreateCategory ────────────────────────────────────────────────────────

export function useCreateCategory() {
  const [creating, setCreating] = useState(false);

  const createCategory = useCallback(
    async (data: ProductCategoryCreate): Promise<ProductCategoryRead> => {
      setCreating(true);
      try {
        return await unwrap(apiCreateCategory({ body: data }));
      } finally {
        setCreating(false);
      }
    },
    []
  );

  return { createCategory, creating };
}

// ─── useMediums ───────────────────────────────────────────────────────────────

export function useMediums() {
  const [mediums, setMediums] = useState<ProductMediumRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await unwrapPaginated(listMediums());
      setMediums(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { mediums, loading, error, refetch };
}

// ─── useCreateMedium ──────────────────────────────────────────────────────────

export function useCreateMedium() {
  const [creating, setCreating] = useState(false);

  const createMedium = useCallback(
    async (data: ProductMediumCreate): Promise<ProductMediumRead> => {
      setCreating(true);
      try {
        return await unwrap(apiCreateMedium({ body: data }));
      } finally {
        setCreating(false);
      }
    },
    []
  );

  return { createMedium, creating };
}

// ─── useVariantTypes ──────────────────────────────────────────────────────────

export function useVariantTypes() {
  const [variantTypes, setVariantTypes] = useState<VariantTypeRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await unwrapPaginated(listVariantTypes());
      setVariantTypes(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { variantTypes, loading, error, refetch };
}

// ─── useCreateVariantType ─────────────────────────────────────────────────────

export function useCreateVariantType() {
  const [creating, setCreating] = useState(false);

  const createVariantType = useCallback(
    async (data: VariantTypeCreate): Promise<VariantTypeRead> => {
      setCreating(true);
      try {
        return await unwrap(apiCreateVariantType({ body: data }));
      } finally {
        setCreating(false);
      }
    },
    []
  );

  return { createVariantType, creating };
}

// ─── useCourseCategories ───────────────────────────────────────────────────────

export function useCourseCategories() {
  const [courseCategories, setCourseCategories] = useState<
    CourseCategoryRead[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await unwrapPaginated(listCourseCategories());
      setCourseCategories(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { courseCategories, loading, error, refetch };
}

// ─── useCreateCourseCategory ───────────────────────────────────────────────────

export function useCreateCourseCategory() {
  const [creating, setCreating] = useState(false);

  const createCourseCategory = useCallback(
    async (data: CourseCategoryCreate): Promise<CourseCategoryRead> => {
      setCreating(true);
      try {
        return await unwrap(apiCreateCourseCategory({ body: data }));
      } finally {
        setCreating(false);
      }
    },
    []
  );

  return { createCourseCategory, creating };
}
