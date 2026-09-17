import React from "react";
import Borders from "@dynatrace/strato-design-tokens/borders";
import BoxShadows from "@dynatrace/strato-design-tokens/box-shadows";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { AccentTone, cardAccentBorder } from "../lib/theme";

type StatTileProps = {
  label: string;
  value: string;
  /** Colored left-border stripe, e.g. to flag a KPI that needs attention. Omit for a plain neutral tile. */
  accent?: AccentTone;
};

export const StatTile = ({ label, value, accent }: StatTileProps) => (
  <Flex
    flexDirection="column"
    gap={4}
    padding={16}
    style={{
      minWidth: "180px",
      border: `${Colors.Border.Neutral.Default}`,
      borderRadius: `${Borders.Radius.Container.Default}`,
      background: `${Colors.Background.Surface.Default}`,
      boxShadow: `${BoxShadows.Surface.Raised.Rest}`,
      ...cardAccentBorder(accent),
    }}
  >
    <Text style={{ color: Colors.Text.Neutral.Default }}>{label}</Text>
    <Heading level={3}>{value}</Heading>
  </Flex>
);
