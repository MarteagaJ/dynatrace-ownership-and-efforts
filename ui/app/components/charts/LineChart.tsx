import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { EmptyChartState } from "./EmptyChartState";
import { categoricalColor } from "./categoricalPalette";

type LineChartProps = {
  data: { category: string; value: number }[];
  loading?: boolean;
  height?: number;
};

const CHART_WIDTH = 600;
const PADDING_Y = 20;

/**
 * Minimal SVG line chart — a stand-in for Strato's TimeseriesChart, which as of
 * strato-components 3.10.4/3.11.0 never draws non-empty data (see BarChart.tsx for the same
 * finding). Plots the categorical, zero-filled time buckets produced by lib/*Charts.ts rather
 * than a true continuous time axis, matching how those buckets are already rendered elsewhere
 * (e.g. BarChart's vertical orientation) on this page.
 */
export const LineChart = ({ data, loading, height = 260 }: LineChartProps) => {
  if (data.length === 0) return <EmptyChartState height={height} loading={loading} />;

  const plotHeight = height - PADDING_Y * 2;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? CHART_WIDTH / (data.length - 1) : 0;
  const color = categoricalColor(0);

  const points = data.map((d, i) => ({
    ...d,
    x: data.length > 1 ? i * stepX : CHART_WIDTH / 2,
    y: PADDING_Y + plotHeight - (d.value / maxValue) * plotHeight,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <Flex flexDirection="column" gap={4} style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {points.map((p) => (
          <g key={`${p.category}-${p.x}`}>
            <circle cx={p.x} cy={p.y} r={3} fill={color}>
              <title>{`${p.category}: ${p.value}`}</title>
            </circle>
            <text x={p.x} y={Math.max(p.y - 8, 10)} fontSize={10} textAnchor="middle" fill={Colors.Text.Neutral.Subdued}>
              {p.value > 0 ? p.value : ""}
            </text>
          </g>
        ))}
      </svg>
      <Flex style={{ width: "100%" }}>
        {points.map((p) => (
          <Text
            key={`${p.category}-label`}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              color: Colors.Text.Neutral.Subdued,
              fontSize: "11px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={p.category}
          >
            {p.category}
          </Text>
        ))}
      </Flex>
    </Flex>
  );
};
