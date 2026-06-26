import { cn } from "@/lib/utils";

type LoaderSize = "sm" | "md" | "lg";
type LoaderColor = "gold" | "white" | "dark";

interface LuxuryLoaderProps {
  size?: LoaderSize;
  color?: LoaderColor;
  className?: string;
}

const sizeMap: Record<LoaderSize, string> = {
  sm: "loader-sm",
  md: "loader-md",
  lg: "loader-lg",
};

const colorMap: Record<LoaderColor, string> = {
  gold: "luxury-loader-gold",
  white: "luxury-loader-white",
  dark: "luxury-loader-dark",
};

export function LuxuryLoader({
  size = "md",
  color = "gold",
  className,
}: LuxuryLoaderProps) {
  return (
    <div
      className={cn(
        "luxury-loader",
        colorMap[color],
        sizeMap[size],
        className
      )}
    />
  );
}
