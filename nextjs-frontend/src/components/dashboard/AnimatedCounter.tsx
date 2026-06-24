"use client";

import { MotionValue, motion, useSpring, useTransform } from "motion/react";
import React, { useEffect } from "react";

type PlaceValue = number | ".";

interface NumberProps {
  mv: MotionValue<number>;
  number: number;
  height: number;
}

function Number({ mv, number, height }: NumberProps) {
  const y = useTransform(mv, (latest) => {
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) {
      memo -= 10 * height;
    }
    return memo;
  });

  return (
    <motion.span
      className="absolute inset-0 flex items-center justify-center"
      style={{ y }}
    >
      {number}
    </motion.span>
  );
}

function normalizeNearInteger(num: number): number {
  const nearest = Math.round(num);
  const tolerance = 1e-9 * Math.max(1, Math.abs(num));
  return Math.abs(num - nearest) < tolerance ? nearest : num;
}

function getValueRoundedToPlace(value: number, place: number): number {
  const scaled = value / place;
  return Math.floor(normalizeNearInteger(scaled));
}

interface DigitProps {
  place: PlaceValue;
  value: number;
  height: number;
  digitStyle?: React.CSSProperties;
}

function Digit({ place, value, height, digitStyle }: DigitProps) {
  if (place === ".") {
    return (
      <span
        className="relative inline-flex items-center justify-center"
        style={{ height, width: "fit-content", ...digitStyle }}
      >
        .
      </span>
    );
  }

  const valueRoundedToPlace = getValueRoundedToPlace(value, place);
  const animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <span
      className="relative inline-flex overflow-hidden tabular-nums"
      style={{ height, width: "1.2ch", ...digitStyle }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} />
      ))}
    </span>
  );
}

interface CounterProps {
  value: number;
  fontSize?: number;
  padding?: number;
  places?: PlaceValue[];
  gap?: number;
  borderRadius?: number;
  horizontalPadding?: number;
  textColor?: string;
  fontWeight?: React.CSSProperties["fontWeight"];
  containerStyle?: React.CSSProperties;
  counterClassName?: string;
  digitStyle?: React.CSSProperties;
  gradientHeight?: number;
  gradientFrom?: string;
  gradientTo?: string;
  topGradientStyle?: React.CSSProperties;
  bottomGradientStyle?: React.CSSProperties;
}

function Counter({
  value,
  fontSize = 100,
  padding = 0,
  places = [...value.toString()].map((ch, i, a) => {
    if (ch === ".") {
      return ".";
    }

    const dotIndex = a.indexOf(".");
    const isInteger = dotIndex === -1;

    const exponent = isInteger
      ? a.length - i - 1
      : i < dotIndex
        ? dotIndex - i - 1
        : -(i - dotIndex);

    return 10 ** exponent;
  }),
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = "inherit",
  fontWeight = "inherit",
  containerStyle,
  counterClassName,
  digitStyle,
  gradientHeight = 0,
  gradientFrom = "black",
  gradientTo = "transparent",
  topGradientStyle,
  bottomGradientStyle,
}: CounterProps) {
  const height = fontSize + padding;

  return (
    <span className="relative inline-block" style={{ ...containerStyle }}>
      <span
        className={["flex overflow-hidden", counterClassName]
          .filter(Boolean)
          .join(" ")}
        style={{
          fontSize,
          gap,
          borderRadius,
          paddingLeft: horizontalPadding,
          paddingRight: horizontalPadding,
          lineHeight: 1,
          color: textColor,
          fontWeight,
          direction: "ltr",
        }}
      >
        {places.map((place) => (
          <Digit
            key={place}
            place={place}
            value={value}
            height={height}
            digitStyle={digitStyle}
          />
        ))}
      </span>
      {gradientHeight > 0 && (
        <span
          className="pointer-events-none absolute inset-0 flex flex-col justify-between"
          style={{}}
        >
          <span
            style={{
              height: gradientHeight,
              background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
              ...topGradientStyle,
            }}
          />
          <span
            style={{
              height: gradientHeight,
              background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
              ...bottomGradientStyle,
            }}
          />
        </span>
      )}
    </span>
  );
}

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  fontSize?: number;
  textColor?: string;
  fontWeight?: React.CSSProperties["fontWeight"];
  gap?: number;
}

export function AnimatedCounter({
  target,
  suffix = "",
  fontSize,
  textColor,
  fontWeight,
  gap,
}: AnimatedCounterProps) {
  const finalFontSize = fontSize ?? 28;

  return (
    <span className="inline-flex items-baseline gap-0.5">
      <Counter
        value={target}
        fontSize={finalFontSize}
        textColor={textColor}
        fontWeight={fontWeight}
        gap={gap}
        borderRadius={0}
        horizontalPadding={0}
      />
      {suffix && (
        <span
          className="flex items-center"
          style={{ fontSize: finalFontSize }}
        >
          {suffix}
        </span>
      )}
    </span>
  );
}
