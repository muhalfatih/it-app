import {
  CircleCheckIcon,
  ClockIcon,
  InfoIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge, type BadgeProps } from "@workspace/ui/components/reui/badge"

type Tone = "success" | "warning" | "info" | "destructive"

// Ikon bawaan per nada status, supaya makna tidak hanya bergantung pada warna.
const TONE_ICON: Record<Tone, LucideIcon> = {
  success: CircleCheckIcon,
  warning: ClockIcon,
  info: InfoIcon,
  destructive: TriangleAlertIcon,
}

function toneOf(variant: BadgeProps["variant"]): Tone | undefined {
  const tone = variant?.split("-")[0]
  return tone && tone in TONE_ICON ? (tone as Tone) : undefined
}

/**
 * Badge status berikon. Ikon bawaan dari varian (success/warning/info/destructive);
 * `icon` menimpa, `icon={null}` mematikan. Varian lain (outline, primary, ...) tanpa ikon.
 */
function StatusBadge({
  variant,
  icon,
  children,
  ...props
}: BadgeProps & { icon?: LucideIcon | null }) {
  const Icon = icon === undefined ? TONE_ICON[toneOf(variant) as Tone] : icon
  return (
    <Badge variant={variant} {...props}>
      {Icon && <Icon aria-hidden />}
      {children}
    </Badge>
  )
}

export { StatusBadge }
