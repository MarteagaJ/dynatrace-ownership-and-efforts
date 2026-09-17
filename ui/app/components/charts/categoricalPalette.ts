import Colors from "@dynatrace/strato-design-tokens/colors";

/** Cycled across bars/slices so any-length breakdowns get a consistent, distinct color per category. */
const CATEGORICAL_PALETTE = [
  Colors.Charts.Categorical.Color01.Default,
  Colors.Charts.Categorical.Color02.Default,
  Colors.Charts.Categorical.Color03.Default,
  Colors.Charts.Categorical.Color04.Default,
  Colors.Charts.Categorical.Color05.Default,
  Colors.Charts.Categorical.Color06.Default,
  Colors.Charts.Categorical.Color07.Default,
  Colors.Charts.Categorical.Color08.Default,
];

export function categoricalColor(index: number): string {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
}
