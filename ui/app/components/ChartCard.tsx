import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import Borders from "@dynatrace/strato-design-tokens/borders";
import BoxShadows from "@dynatrace/strato-design-tokens/box-shadows";
import { AccentTone, cardAccentBorder } from "../lib/theme";

type ChartCardProps = {
  title: string;
  description?: string;
  /** Colored left-border stripe, e.g. to flag a tile that needs attention. Omit for a plain neutral card. */
  accent?: AccentTone;
  children: React.ReactNode;
};

export const ChartCard = ({ title, description, accent, children }: ChartCardProps) => {
  return (
    <Flex
      flexDirection="column"
      gap={8}
      padding={20}
      style={{
        flex: "1 1 420px",
        minWidth: "320px",
        border: `${Colors.Border.Neutral.Default}`,
        borderRadius: `${Borders.Radius.Container.Default}`,
        background: `${Colors.Background.Surface.Default}`,
        boxShadow: `${BoxShadows.Surface.Raised.Rest}`,
        ...cardAccentBorder(accent),
      }}
    >
      <Heading level={4}>{title}</Heading>
      {description && <Paragraph>{description}</Paragraph>}
      {children}
    </Flex>
  );
};
