import Colors from "@dynatrace/strato-design-tokens/colors";

/**
 * Semantic accent tones for the colored left-border treatment used across cards/tiles, modeled
 * after the reference app's status-colored card borders (green for "running", red for "deleted",
 * blue for "provisioning"). All backed by Strato's Background.Container.*.Accent tokens, which
 * are CSS custom properties that resolve to different values under the platform's Light/Dark
 * Appearance setting automatically — never hardcode a hex value here.
 */
export type AccentTone = "neutral" | "primary" | "success" | "warning" | "critical";

const ACCENT_COLOR: Record<AccentTone, string> = {
  neutral: Colors.Background.Container.Neutral.Accent,
  primary: Colors.Background.Container.Primary.Accent,
  success: Colors.Background.Container.Success.Accent,
  warning: Colors.Background.Container.Warning.Accent,
  critical: Colors.Background.Container.Critical.Accent,
};

export function accentColor(tone: AccentTone): string {
  return ACCENT_COLOR[tone];
}

/** A card's normal (all-sides) border, with one edge overridden to a colored accent stripe. */
export function cardAccentBorder(tone: AccentTone | undefined) {
  return tone ? { borderLeft: `4px solid ${accentColor(tone)}` } : {};
}

/**
 * Soft, theme-reactive gradient for page header banners, echoing the reference app's pastel
 * (light mode) / deep-toned (dark mode) header background. Built from container tones rather
 * than the stronger ".Accent" tones, which are too saturated for a full-width background.
 */
export const PAGE_BANNER_GRADIENT = `linear-gradient(135deg, ${Colors.Background.Container.Primary.Default}, ${Colors.Background.Container.Success.Default} 60%, ${Colors.Background.Container.Primary.Emphasized})`;
