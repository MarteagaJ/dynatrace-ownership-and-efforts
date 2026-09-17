import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";

type EmptyChartStateProps = {
  height?: number;
  loading?: boolean;
};

/** Matches the "No data available" placeholder convention used by Strato's own chart components. */
export const EmptyChartState = ({ height = 260, loading }: EmptyChartStateProps) => (
  <Flex alignItems="center" justifyContent="center" style={{ height }}>
    <Text style={{ color: Colors.Text.Neutral.Subdued }}>{loading ? "Loading…" : "No data available"}</Text>
  </Flex>
);
