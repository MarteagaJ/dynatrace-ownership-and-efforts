import React from "react";
import { Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { EmptyChartState } from "./EmptyChartState";
import { categoricalColor } from "./categoricalPalette";

type TreemapProps = {
  nodes: { name: string; value: number }[];
  loading?: boolean;
  height?: number;
};

type LaidOutNode = { name: string; value: number; x: number; y: number; w: number; h: number };

/**
 * Binary slice-and-dice layout in percentage coordinates (alternates splitting horizontally and
 * vertically), so positioning never depends on measuring the container's actual pixel size.
 */
function layout(nodes: { name: string; value: number }[], x: number, y: number, w: number, h: number, vertical: boolean): LaidOutNode[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ ...nodes[0], x, y, w, h }];

  const total = nodes.reduce((sum, n) => sum + n.value, 0);
  let acc = 0;
  let splitIndex = 1;
  for (let i = 0; i < nodes.length; i++) {
    acc += nodes[i].value;
    if (acc >= total / 2) {
      splitIndex = i + 1;
      break;
    }
  }
  splitIndex = Math.min(Math.max(splitIndex, 1), nodes.length - 1);

  const first = nodes.slice(0, splitIndex);
  const rest = nodes.slice(splitIndex);
  const firstTotal = first.reduce((sum, n) => sum + n.value, 0);
  const ratio = total > 0 ? firstTotal / total : 0.5;

  if (vertical) {
    const firstW = w * ratio;
    return [...layout(first, x, y, firstW, h, !vertical), ...layout(rest, x + firstW, y, w - firstW, h, !vertical)];
  }
  const firstH = h * ratio;
  return [...layout(first, x, y, w, firstH, !vertical), ...layout(rest, x, y + firstH, w, h - firstH, !vertical)];
}

/**
 * Minimal CSS treemap (percentage-positioned divs) — a stand-in for Strato's TreeMap, which as
 * of strato-components 3.10.4/3.11.0 never draws non-empty data.
 */
export const Treemap = ({ nodes, loading, height = 260 }: TreemapProps) => {
  if (nodes.length === 0) return <EmptyChartState height={height} loading={loading} />;

  const sorted = [...nodes].sort((a, b) => b.value - a.value);
  const laidOut = layout(sorted, 0, 0, 100, 100, true);

  return (
    <div style={{ position: "relative", height, width: "100%" }}>
      {laidOut.map((n, i) => (
        <div
          key={n.name}
          title={`${n.name}: ${n.value}`}
          style={{
            position: "absolute",
            left: `${n.x}%`,
            top: `${n.y}%`,
            width: `${n.w}%`,
            height: `${n.h}%`,
            boxSizing: "border-box",
            border: `2px solid ${Colors.Background.Surface.Default}`,
            background: categoricalColor(i),
            padding: "4px 6px",
            overflow: "hidden",
          }}
        >
          <Text style={{ color: Colors.Text.Neutral.OnAccent.Default, fontSize: "12px", whiteSpace: "nowrap" }}>{n.name}</Text>
          <br />
          <Text style={{ color: Colors.Text.Neutral.OnAccent.Default, fontSize: "11px" }}>{n.value}</Text>
        </div>
      ))}
    </div>
  );
};
