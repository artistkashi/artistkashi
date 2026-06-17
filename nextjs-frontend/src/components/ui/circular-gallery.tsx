"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageWithFallback } from "./ImageWithFallback";

interface CircularGalleryProps {
  images: string[];
  initialIndex?: number;
  className?: string;
  onIndexChange?: (index: number) => void;
}

function calculateGap(width: number) {
  const minWidth = 1024;
  const maxWidth = 1456;
  const minGap = 60;
  const maxGap = 86;
  if (width <= minWidth) return minGap;
  if (width >= maxWidth)
    return Math.max(minGap, maxGap + 0.06018 * (width - maxWidth));
  return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
}

export const CircularGallery = ({
  images,
  initialIndex = 0,
  className,
  onIndexChange,
}: CircularGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [containerWidth, setContainerWidth] = useState(1200);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const imagesLength = useMemo(() => images.length, [images]);

  // Sync internal state if external initialIndex changes
  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  // Responsive gap calculation
  useEffect(() => {
    function handleResize() {
      if (imageContainerRef.current) {
        setContainerWidth(imageContainerRef.current.offsetWidth);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, imagesLength]);

  const handleNext = useCallback(() => {
    const next = (activeIndex + 1) % imagesLength;
    setActiveIndex(next);
    onIndexChange?.(next);
  }, [activeIndex, imagesLength, onIndexChange]);

  const handlePrev = useCallback(() => {
    const prev = (activeIndex - 1 + imagesLength) % imagesLength;
    setActiveIndex(prev);
    onIndexChange?.(prev);
  }, [activeIndex, imagesLength, onIndexChange]);

  function getImageStyle(index: number): React.CSSProperties {
    const gap = calculateGap(containerWidth);
    const maxStickUp = gap * 0.8;
    
    const isActive = index === activeIndex;
    const isLeft = (activeIndex - 1 + imagesLength) % imagesLength === index;
    const isRight = (activeIndex + 1) % imagesLength === index;

    if (isActive) {
      return {
        zIndex: 10,
        opacity: 1,
        pointerEvents: "auto",
        transform: `translateX(0px) translateY(0px) scale(1) rotateY(0deg)`,
        transition: "all 0.8s cubic-bezier(.4,2,.3,1)",
      };
    }
    if (isLeft) {
      return {
        zIndex: 5,
        opacity: 0.4,
        pointerEvents: "auto",
        transform: `translateX(-${gap * 1.5}px) translateY(-${maxStickUp}px) scale(0.7) rotateY(25deg)`,
        transition: "all 0.8s cubic-bezier(.4,2,.3,1)",
        filter: "blur(2px)",
      };
    }
    if (isRight) {
      return {
        zIndex: 5,
        opacity: 0.4,
        pointerEvents: "auto",
        transform: `translateX(${gap * 1.5}px) translateY(-${maxStickUp}px) scale(0.7) rotateY(-25deg)`,
        transition: "all 0.8s cubic-bezier(.4,2,.3,1)",
        filter: "blur(2px)",
      };
    }
    return {
      zIndex: 1,
      opacity: 0,
      pointerEvents: "none",
      transform: `scale(0.5)`,
      transition: "all 0.8s cubic-bezier(.4,2,.3,1)",
    };
  }

  return (
    <div className={cn("w-full flex flex-col items-center", className)}>
      <div 
        className="relative w-full h-[450px] md:h-[650px] perspective-[1500px]" 
        ref={imageContainerRef}
      >
        {images.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="absolute inset-0 flex items-center justify-center transition-all duration-700"
            style={getImageStyle(index)}
          >
            <div className="w-[300px] h-[380px] md:w-[450px] md:h-[580px] relative overflow-hidden rounded-2xl shadow-2xl shadow-black/50 border border-gold/10">
              <ImageWithFallback
                src={src}
                alt={`Gallery image ${index}`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-8 mt-12">
        <button
          className="w-14 h-14 rounded-full border border-gold/20 flex items-center justify-center bg-dark/40 text-gold hover:bg-gold hover:text-dark transition-all duration-300 gold-glow disabled:opacity-30"
          onClick={handlePrev}
          disabled={imagesLength <= 1}
        >
          <ChevronLeft size={28} />
        </button>
        <button
          className="w-14 h-14 rounded-full border border-gold/20 flex items-center justify-center bg-dark/40 text-gold hover:bg-gold hover:text-dark transition-all duration-300 gold-glow disabled:opacity-30"
          onClick={handleNext}
          disabled={imagesLength <= 1}
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
};
