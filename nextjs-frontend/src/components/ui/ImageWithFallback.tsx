import { cn } from "@/lib/utils";
import { Image as ImageIcon } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

type ImageWithFallbackProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt?: string;
  unoptimized?: boolean;
};

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const {
    src,
    alt,
    style,
    className,
    width,
    height,
    fill,
    unoptimized,
    onError,
    ...rest
  } = props;

  const handleError: NonNullable<ImageProps["onError"]> = (event) => {
    setDidError(true);
    onError?.(event);
  };

  const resolvedSrc = didError ? ERROR_IMG_SRC : src || null;
  const resolvedAlt = didError ? "Error loading image" : alt || "Image";

  if (!resolvedSrc) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-muted/5 text-text-muted/20 border border-border/20",
          className
        )}
        style={{
          ...style,
          ...(fill ? { width: "100%", height: "100%" } : { width, height }),
        }}
      >
        <ImageIcon size={fill ? 40 : 24} strokeWidth={1} />
      </div>
    );
  }

  const sizesProp = fill ? { sizes: rest.sizes ?? "100vw" } : {};

  return (
    <Image
      src={resolvedSrc}
      alt={resolvedAlt}
      fill={fill}
      unoptimized={unoptimized}
      {...(!fill && { width: width ?? 1200, height: height ?? 900 })}
      {...sizesProp}
      className={className}
      style={style}
      data-original-url={didError ? src : undefined}
      {...rest}
      onError={handleError}
    />
  );
}
