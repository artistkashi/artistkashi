import * as React from "react";
import { cn } from "@/lib/utils";

export type FieldProps = React.HTMLAttributes<HTMLDivElement>;

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
);
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-2xs font-mono text-text-muted uppercase tracking-[0.2em] block font-bold",
      className
    )}
    {...props}
  />
));
FieldLabel.displayName = "FieldLabel";

export { Field, FieldLabel };
