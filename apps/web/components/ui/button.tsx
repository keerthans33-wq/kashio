import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white rounded-xl shadow-[0_2px_16px_rgba(124,58,237,0.3)] hover:opacity-90",
        secondary:
          "bg-[#1F2937] text-white rounded-xl border border-white/10 hover:bg-[#374151]",
        ghost:
          "text-[#6B7280] hover:text-white rounded-lg",
        destructive:
          "text-red-400 hover:text-red-300 rounded-lg",
      },
      size: {
        default: "h-11 px-6 text-sm",
        sm:      "h-9 px-4 text-sm",
        xs:      "h-7 px-3 text-xs",
        icon:    "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
