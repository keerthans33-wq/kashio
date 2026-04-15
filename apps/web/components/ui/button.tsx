import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        /**
         * Primary — solid green, dark label, luminous glow.
         * The signature CTA button. Use for the single most important action.
         */
        primary:
          "bg-[#22C55E] text-[#0A1F12] rounded-2xl " +
          "shadow-[0_0_20px_rgba(34,197,94,0.25),0_2px_8px_rgba(0,0,0,0.35)] " +
          "hover:bg-[#1db954] active:bg-[#16A34A]",

        /**
         * Secondary — dark glass surface, white text, soft border.
         * Paired alongside Primary, or as standalone for less-critical actions.
         */
        secondary:
          "bg-white/[0.06] text-white rounded-2xl border border-white/[0.09] " +
          "hover:bg-white/[0.10] active:bg-white/[0.08]",

        /**
         * Ghost — no background, for inline/tertiary actions.
         */
        ghost:
          "text-[#6B7280] hover:text-[#E5E7EB] rounded-xl transition-colors",

        /**
         * Destructive — red tint, for delete/remove actions.
         */
        destructive:
          "text-red-400 hover:text-red-300 rounded-xl transition-colors",
      },
      size: {
        default: "h-12 px-6 text-[15px]",
        sm:      "h-9  px-4 text-sm",
        xs:      "h-7  px-3 text-xs",
        icon:    "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size:    "default",
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
