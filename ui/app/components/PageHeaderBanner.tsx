import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import Borders from "@dynatrace/strato-design-tokens/borders";
import { PAGE_BANNER_GRADIENT } from "../lib/theme";

type PageHeaderBannerProps = {
  children: React.ReactNode;
};

/**
 * Soft gradient card wrapping a page's TitleBar, echoing the reference app's header banner.
 * Wrap the page's <TitleBar> (and only the TitleBar) in this on every top-level page.
 */
export const PageHeaderBanner = ({ children }: PageHeaderBannerProps) => (
  <Flex
    flexDirection="column"
    padding={20}
    style={{
      background: PAGE_BANNER_GRADIENT,
      borderRadius: Borders.Radius.Container.Default,
    }}
  >
    {children}
  </Flex>
);
