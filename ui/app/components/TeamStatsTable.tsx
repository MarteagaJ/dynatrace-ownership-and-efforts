import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Link } from "@dynatrace/strato-components/typography";
import { DataTable, type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { TeamStats } from "../lib/types";

type TeamStatsTableProps = {
  data: TeamStats[];
  isLoading: boolean;
};

export const TeamStatsTable = ({ data, isLoading }: TeamStatsTableProps) => {
  const columns = useMemo<DataTableColumnDef<TeamStats>[]>(
    () => [
      {
        id: "displayName",
        header: "Team",
        accessor: "displayName",
        cell: ({ rowData }) => (
          <Link as={RouterLink} to={`/teams/${encodeURIComponent(rowData.teamId)}`}>
            {rowData.displayName}
          </Link>
        ),
      },
      { id: "entityCount", header: "Owned entities", accessor: "entityCount", columnType: "number" },
      { id: "totalProblems", header: "Problems", accessor: "totalProblems", columnType: "number" },
      { id: "openProblems", header: "Open", accessor: "openProblems", columnType: "number" },
      { id: "closedProblems", header: "Closed", accessor: "closedProblems", columnType: "number" },
      {
        id: "avgMttrMinutes",
        header: "Avg. MTTR (min)",
        accessor: (row) => (row.avgMttrMinutes !== undefined ? row.avgMttrMinutes.toFixed(1) : "—"),
      },
      { id: "noiseCount", header: "Noisy/duplicate", accessor: "noiseCount", columnType: "number" },
    ],
    [],
  );

  return <DataTable data={data} columns={columns} sortable resizable fullWidth loading={isLoading} />;
};
