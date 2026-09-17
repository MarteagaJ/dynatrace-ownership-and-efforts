import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Strong } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import Colors from "@dynatrace/strato-design-tokens/colors";

const NAV_ITEMS: { to: string; label: string; isActive: (pathname: string) => boolean }[] = [
  { to: "/", label: "Overview", isActive: (p) => p === "/" },
  { to: "/teams", label: "Teams", isActive: (p) => p.startsWith("/teams") },
  { to: "/import-teams", label: "Import", isActive: (p) => p === "/import-teams" },
  { to: "/entities", label: "Entities", isActive: (p) => p === "/entities" },
];

export const Header = () => {
  const { pathname } = useLocation();

  return (
    <Flex
      alignItems="center"
      gap={24}
      paddingX={16}
      paddingY={8}
      style={{
        background: Colors.Background.Surface.Default,
        borderBottom: `${Colors.Border.Neutral.Default}`,
      }}
    >
      <Strong>Ownership &amp; Efforts</Strong>
      <Flex gap={4}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.isActive(pathname);
          return (
            <Button
              key={item.to}
              as={RouterLink}
              to={item.to}
              size="condensed"
              variant={isActive ? "accent" : "default"}
              color={isActive ? "primary" : undefined}
            >
              {item.label}
            </Button>
          );
        })}
      </Flex>
    </Flex>
  );
};
