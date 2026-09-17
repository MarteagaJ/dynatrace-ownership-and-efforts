import React from "react";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { Text } from "@dynatrace/strato-components/typography";
import { MAX_TABLE_ROWS } from "../lib/types";

type TableRowLimitNoticeProps = {
  /** Total row count before truncation. */
  total: number;
};

/** Shown above/below a DataTable whenever its data was truncated to MAX_TABLE_ROWS for display. */
export const TableRowLimitNotice = ({ total }: TableRowLimitNoticeProps) => {
  if (total <= MAX_TABLE_ROWS) return null;
  return (
    <Text style={{ color: Colors.Text.Neutral.Default }}>
      Showing {MAX_TABLE_ROWS} of {total} results. Narrow your filters to see more.
    </Text>
  );
};
