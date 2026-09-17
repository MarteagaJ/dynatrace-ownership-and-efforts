import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import Borders from "@dynatrace/strato-design-tokens/borders";
import BoxShadows from "@dynatrace/strato-design-tokens/box-shadows";
import { AccentTone, cardAccentBorder } from "../lib/theme";

type AnalysisCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  /** Colored left-border stripe. Omit for a plain neutral card. */
  accent?: AccentTone;
};

export const AnalysisCard = ({ icon, title, description, to, accent }: AnalysisCardProps) => {
  return (
    <Flex
      as={RouterLink}
      to={to}
      flexDirection="column"
      alignItems="center"
      gap={12}
      padding={32}
      style={{
        flex: 1,
        minWidth: "280px",
        textAlign: "center",
        textDecoration: "none",
        color: "inherit",
        border: `${Colors.Border.Neutral.Default}`,
        borderRadius: `${Borders.Radius.Container.Default}`,
        background: `${Colors.Background.Surface.Default}`,
        boxShadow: `${BoxShadows.Surface.Raised.Rest}`,
        ...cardAccentBorder(accent),
      }}
    >
      {icon}
      <Heading level={3}>{title}</Heading>
      <Paragraph>{description}</Paragraph>
    </Flex>
  );
};
