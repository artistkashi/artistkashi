import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const displayPrice = (
  price: string | number | undefined | null
): string => {
  if (price == null) {
    return "₹ 0";
  }

  const numericPrice = typeof price === "string" ? Number(price) : price;

  if (Number.isNaN(numericPrice)) {
    return "₹ 0";
  }

  return `₹ ${numericPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
};
