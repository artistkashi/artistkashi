import { toast as sonnerToast } from "sonner";

const DURATIONS = {
  success: 4000,
  error: 60_000,
  warning: 10_000,
  info: 5000,
} as const;

function applyDefaults(
  data: Record<string, unknown> | undefined,
  overrides: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!data) return overrides;
  return { ...overrides, ...data };
}

export const toast = {
  success: (message: string, data?: Parameters<typeof sonnerToast.success>[1]) =>
    sonnerToast.success(message, applyDefaults(data, { duration: DURATIONS.success })),
  error: (message: string, data?: Parameters<typeof sonnerToast.error>[1]) =>
    sonnerToast.error(message, applyDefaults(data, { duration: DURATIONS.error, closeButton: true })),
  warning: (message: string, data?: Parameters<typeof sonnerToast.warning>[1]) =>
    sonnerToast.warning(message, applyDefaults(data, { duration: DURATIONS.warning, closeButton: true })),
  info: (message: string, data?: Parameters<typeof sonnerToast.info>[1]) =>
    sonnerToast.info(message, applyDefaults(data, { duration: DURATIONS.info })),
  dismiss: sonnerToast.dismiss,
  loading: sonnerToast.loading,
  promise: sonnerToast.promise,
  custom: sonnerToast.custom,
};
