"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { motion } from "framer-motion";

export function Checkbox({
  id,
  checked,
  onCheckedChange,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="h-5 w-5 border border-border data-[state=checked]:border-primary transition-all duration-300 bg-surface flex items-center justify-center group/cb hover:border-primary rounded"
    >
      <CheckboxPrimitive.Indicator>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-2.5 h-2.5 bg-primary gold-glow rounded-sm"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
