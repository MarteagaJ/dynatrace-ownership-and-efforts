import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Link, Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { ChevronRightSmallIcon } from "@dynatrace/strato-icons";

export type BreadcrumbTrailItem = {
  label: string;
  to: string;
};

type PageBreadcrumbsProps = {
  /** Hierarchy from the nearest main page down to the current sub-page, e.g. [Teams, Team name, Problems]. */
  trail: BreadcrumbTrailItem[];
};

/**
 * Renders the ancestor trail above a sub-page. Every entry but the last is a real route:
 * clicking any earlier item navigates straight there, so users can back out of nested sub-pages
 * the way they arrived. The last item is the current page (plain text, not a link). Render this
 * above the page's TitleBar on any new sub-page.
 *
 * Hand-rolled rather than Strato's own `Breadcrumbs`/`Breadcrumbs.Item`: in this app's dev-server
 * build, that component's internal `Breadcrumbs.Item` identity check never matches (two distinct
 * module instances of the same component get bundled), so every item silently fails to render.
 */
export const PageBreadcrumbs = ({ trail }: PageBreadcrumbsProps) => {
  return (
    <Flex as="nav" aria-label="Breadcrumb" alignItems="center" gap={4} paddingBottom={16}>
      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        return (
          <Flex key={item.to} alignItems="center" gap={4}>
            {isLast ? (
              <Text aria-current="page" style={{ color: `${Colors.Text.Neutral.Subdued}` }}>
                {item.label}
              </Text>
            ) : (
              <Link as={RouterLink} to={item.to}>
                {item.label}
              </Link>
            )}
            {!isLast && <ChevronRightSmallIcon style={{ color: `${Colors.Text.Neutral.Subdued}` }} size={16} />}
          </Flex>
        );
      })}
    </Flex>
  );
};
