import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold tracking-[0.08em] uppercase transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-dark gold-glow hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-red-500 text-white shadow-xs hover:bg-red-500/90",
        outline:
          "border border-border bg-transparent hover:border-gold hover:text-gold hover:bg-gold-bg",
        secondary:
          "bg-surface text-text-main border border-border hover:border-gold/50",
        ghost: "hover:bg-gold-bg hover:text-gold",
        link: "text-gold underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-8 py-4",
        sm: "h-9 rounded-sm px-3 text-xs",
        lg: "h-14 rounded-sm px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
