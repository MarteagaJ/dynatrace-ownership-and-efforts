import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import Borders from "@dynatrace/strato-design-tokens/borders";
import { EmptyChartState } from "./EmptyChartState";
import { categoricalColor } from "./categoricalPalette";

type BarChartProps = {
  data: { category: string; value: number }[];
  /** "vertical" = upright columns, good for a time-ordered sequence. "horizontal" = rows, good for comparing category names. */
  orientation?: "vertical" | "horizontal";
  loading?: boolean;
  height?: number;
};

/**
 * Minimal CSS-only bar chart — a stand-in for Strato's CategoricalBarChart, which as of
 * strato-components 3.10.4/3.11.0 never draws non-empty data (see ownership-and-efforts docs).
 * Built from plain flex/div sizing rather than measured/SVG layout, so it has no dependency on
 * the broken auto-sizing pipeline.
 */
export const BarChart = ({ data, orientation = "vertical", loading, height = 260 }: BarChartProps) => {
  if (data.length === 0) return <EmptyChartState height={height} loading={loading} />;

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (orientation === "horizontal") {
    return (
      <Flex flexDirection="column" gap={8} style={{ minHeight: height, justifyContent: "center" }}>
        {data.map((d, i) => (
          <Flex key={d.category} alignItems="center" gap={8}>
            <Text style={{ width: "110px", flexShrink: 0, textAlign: "right" }} title={d.category}>
              {d.category}
            </Text>
            <div
              style={{
                flex: 1,
                height: "16px",
                background: Colors.Background.Container.Neutral.Default,
                borderRadius: Borders.Radius.Container.Default,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(d.value / maxValue) * 100}%`,
                  background: categoricalColor(i),
                  borderRadius: Borders.Radius.Container.Default,
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <Text style={{ width: "36px", flexShrink: 0 }}>{d.value}</Text>
          </Flex>
        ))}
      </Flex>
    );
  }

  return (
    <Flex alignItems="flex-end" gap={4} style={{ height, width: "100%" }}>
      {data.map((d, i) => (
        <Flex
          key={`${d.category}-${i}`}
          flexDirection="column"
          alignItems="center"
          justifyContent="flex-end"
          gap={4}
          style={{ flex: 1, height: "100%", minWidth: 0 }}
        >
          <Text>{d.value > 0 ? d.value : ""}</Text>
          <div
            style={{
              width: "100%",
              maxWidth: "36px",
              height: `${Math.max((d.value / maxValue) * (height - 60), d.value > 0 ? 3 : 0)}px`,
              background: categoricalColor(i),
              borderRadius: `${Borders.Radius.Container.Default} ${Borders.Radius.Container.Default} 0 0`,
              transition: "height 0.2s ease",
            }}
          />
          <Text
            style={{
              color: Colors.Text.Neutral.Subdued,
              fontSize: "11px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
            title={d.category}
          >
            {d.category}
          </Text>
        </Flex>
      ))}
    </Flex>
  );
};
