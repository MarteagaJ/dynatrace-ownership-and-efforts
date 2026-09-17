import React from "react";
import { Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { EmptyChartState } from "./EmptyChartState";

export type HeatmapGridData = { rows: string[]; columns: string[]; cells: number[][] };

type HeatmapGridProps = {
  data: HeatmapGridData;
  loading?: boolean;
  /** Width of the row-label gutter — widen this if row labels are longer than short day-name-style strings. */
  rowLabelWidth?: number;
};

/** Cell opacity scales with value so intensity is visible without relying on color-mix() support. */
function cellOpacity(value: number, max: number): number {
  if (max === 0 || value === 0) return 0;
  return 0.25 + (value / max) * 0.75;
}

/**
 * Minimal CSS grid heatmap — a stand-in for Strato's HoneycombChart, which as of
 * strato-components 3.10.4/3.11.0 never draws non-empty data.
 */
export const HeatmapGrid = ({ data, loading, rowLabelWidth = 60 }: HeatmapGridProps) => {
  const { rows, columns, cells } = data;
  const max = Math.max(...cells.flat(), 0);
  if (rows.length === 0 || columns.length === 0) return <EmptyChartState loading={loading} />;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${rowLabelWidth}px repeat(${columns.length}, 1fr)`,
        gridTemplateRows: `20px repeat(${rows.length}, 1fr)`,
        gap: "3px",
        height: 260,
      }}
    >
      <div />
      {columns.map((col) => (
        <Text key={col} style={{ fontSize: "10px", color: Colors.Text.Neutral.Subdued, textAlign: "center" }}>
          {col}
        </Text>
      ))}
      {rows.map((row, r) => (
        <React.Fragment key={row}>
          <Text
            title={row}
            style={{
              fontSize: "11px",
              color: Colors.Text.Neutral.Subdued,
              alignSelf: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row}
          </Text>
          {columns.map((col, c) => (
            <div
              key={col}
              title={`${row} ${col}: ${cells[r][c]}`}
              style={{
                position: "relative",
                background: Colors.Background.Container.Neutral.Default,
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "3px",
                  background: Colors.Charts.Categorical.Color01.Default,
                  opacity: cellOpacity(cells[r][c], max),
                }}
              />
              {cells[r][c] > 0 && <Text style={{ fontSize: "10px", position: "relative" }}>{cells[r][c]}</Text>}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};
