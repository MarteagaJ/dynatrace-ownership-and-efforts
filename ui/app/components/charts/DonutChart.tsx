import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { EmptyChartState } from "./EmptyChartState";
import { categoricalColor } from "./categoricalPalette";

type DonutChartProps = {
  data: { category: string; value: number }[];
  size?: number;
  loading?: boolean;
};

/**
 * Minimal CSS-only donut chart (conic-gradient ring + legend) — a stand-in for Strato's
 * PieChart, which as of strato-components 3.10.4/3.11.0 never draws non-empty data.
 */
export const DonutChart = ({ data, size = 180, loading }: DonutChartProps) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (data.length === 0 || total === 0) return <EmptyChartState height={size + 40} loading={loading} />;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const startPct = (cumulative / total) * 100;
    cumulative += d.value;
    const endPct = (cumulative / total) * 100;
    return { ...d, color: categoricalColor(i), startPct, endPct };
  });
  const gradient = segments.map((s) => `${s.color} ${s.startPct}% ${s.endPct}%`).join(", ");

  return (
    <Flex alignItems="center" gap={24} style={{ minHeight: size, flexWrap: "wrap" }}>
      <div
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: "50%",
          background: `conic-gradient(${gradient})`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: `${size * 0.3}px`,
            borderRadius: "50%",
            background: Colors.Background.Surface.Default,
          }}
        />
      </div>
      <Flex flexDirection="column" gap={6}>
        {segments.map((s) => (
          <Flex key={s.category} alignItems="center" gap={8}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: s.color, flexShrink: 0 }} />
            <Text>
              {s.category} — {s.value} ({Math.round((s.value / total) * 100)}%)
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
};
