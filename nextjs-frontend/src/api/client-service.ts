import type { Pagination } from "@/api/openapi-client/types.gen";

type SdkCall<TData> = Promise<{
  data?: { data?: TData | null; message?: string } | null;
  error?: unknown;
}>;

type SdkPaginatedCall<TData> = Promise<{
  data?: {
    data?: TData[] | null;
    pagination?: Pagination;
    message?: string;
  } | null;
  error?: unknown;
}>;

/**
 * Unwraps a SuccessResponse<T> from a hey-api SDK call.
 * Throws with the backend message if the call fails or data is missing.
 *
 * Usage:
 *   const product = await unwrap(getProductBySlug({ path: { slug } }));
 *   // product is ProductDetailRead ✅
 */
export async function unwrap<TData>(call: SdkCall<TData>): Promise<TData> {
  const { data: body, error } = await call;

  if (error || !body) {
    throw error ?? new Error("Request failed");
  }

  return body.data as TData;
}

/**
 * Unwraps a PaginatedResponse<T> from a hey-api SDK call.
 * Returns { data, pagination } directly.
 *
 * Usage:
 *   const { data: products, pagination } = await unwrapPaginated(listProducts({ query: { page } }));
 *   // products is ProductCardRead[] ✅
 */
export async function unwrapPaginated<TData>(
  call: SdkPaginatedCall<TData>
): Promise<{ data: TData[]; pagination: Pagination }> {
  const { data: body, error } = await call;

  if (error || !body) {
    throw error ?? new Error("Request failed");
  }

  return {
    data: body.data ?? [],
    pagination: body.pagination!,
  };
}


export async function unwrapVoid(
  call: SdkCall<unknown>
): Promise<void> {
  const { data: body, error } = await call;

  if (error || !body) {
    throw error ?? new Error("Request failed");
  }
}