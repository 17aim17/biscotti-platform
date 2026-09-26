import { cn } from "@workspace/ui/lib/utils"

// The Indian food label: green square with a dot for veg, brown square with a
// triangle for non-veg.
export function DietMark({
  isVeg,
  className,
}: {
  isVeg: boolean
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-sm border-2",
        isVeg ? "border-green-700" : "border-amber-800",
        className
      )}
    >
      {isVeg ? (
        <span className="size-1.5 rounded-full bg-green-700" />
      ) : (
        <span className="size-0 border-x-4 border-b-[7px] border-x-transparent border-b-amber-800" />
      )}
    </span>
  )
}
