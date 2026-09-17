import React from "react";
import { IntentButton } from "@dynatrace/strato-components/buttons";
import { type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { buildEntityIntentPayload, buildProblemIntentPayload } from "./entities";
import { findCostCenter, findCostProduct } from "./entityTags";
import { PROBLEM_CATEGORY_LABELS } from "./queries";
import { EntityKind, EntitySummary, ProblemRecord } from "./types";

export const ENTITY_KINDS: EntityKind[] = ["Host", "Service", "Kubernetes deployment", "Web application", "Frontend"];
export const PROBLEM_STATUSES = ["ACTIVE", "CLOSED"];
export const PROBLEM_CATEGORIES = Object.values(PROBLEM_CATEGORY_LABELS);

export const PROBLEM_COLUMNS: DataTableColumnDef<ProblemRecord>[] = [
  { id: "displayId", header: "ID", accessor: "displayId", width: 120 },
  { id: "name", header: "Problem", accessor: "name" },
  { id: "status", header: "Status", accessor: "status", width: 100 },
  { id: "severity", header: "Severity", accessor: "severity", width: 100, columnType: "number" },
  { id: "category", header: "Category", accessor: "category", width: 160 },
  {
    id: "rootCauseDetected",
    header: "Root Cause Detected",
    accessor: (row) => (row.rootCauseEntityName ? "Yes" : "No"),
    width: 160,
  },
  {
    id: "start",
    header: "Start Time",
    accessor: (row) => new Date(row.start),
    columnType: "datetime",
    width: 180,
  },
  {
    id: "affectedEntityCount",
    header: "# of Affected Entities",
    accessor: (row) => row.affectedEntityIds.length,
    width: 160,
    columnType: "number",
  },
  {
    id: "automationsTriggered",
    header: "Automations Triggered",
    accessor: "automationsTriggered",
    width: 160,
    columnType: "number",
  },
  {
    id: "commentsAdded",
    header: "Comments Added",
    accessor: "commentsAdded",
    width: 150,
    columnType: "number",
  },
  {
    id: "durationMinutes",
    header: "Duration (min)",
    accessor: (row) => (row.durationMinutes !== undefined ? row.durationMinutes.toFixed(1) : "—"),
  },
  {
    id: "noise",
    header: "Noise",
    accessor: (row) => (row.isFrequentEvent || row.isDuplicate ? "Yes" : "No"),
  },
  {
    id: "actions",
    header: "",
    accessor: () => "",
    width: 140,
    disableSorting: true,
    cell: ({ rowData: problem }) => {
      const { payload, options } = buildProblemIntentPayload(problem);
      return (
        <IntentButton size="condensed" payload={payload} options={options}>
          Open Problem
        </IntentButton>
      );
    },
  },
];

export const ENTITY_COLUMNS: DataTableColumnDef<EntitySummary>[] = [
  { id: "entityType", header: "Type", accessor: "entityType", width: 160 },
  { id: "name", header: "Name", accessor: "name" },
  {
    id: "costCenter",
    header: "Cost Center",
    accessor: (row) => findCostCenter(row.tags) ?? "—",
    width: 160,
  },
  {
    id: "costProduct",
    header: "Cost Product",
    accessor: (row) => findCostProduct(row.tags) ?? "—",
    width: 160,
  },
  {
    id: "securityContext",
    header: "Security Context",
    accessor: (row) => (row.securityContext.length > 0 ? row.securityContext.join(", ") : "—"),
    width: 160,
  },
  {
    id: "lifetimeStart",
    header: "Lifetime Start",
    accessor: (row) => (row.lifetime ? new Date(row.lifetime.start) : undefined),
    columnType: "datetime",
    width: 180,
  },
  {
    id: "lifetimeEnd",
    header: "Lifetime End",
    accessor: (row) => (row.lifetime ? new Date(row.lifetime.end) : undefined),
    columnType: "datetime",
    width: 180,
  },
  {
    id: "actions",
    header: "",
    accessor: () => "",
    width: 120,
    disableSorting: true,
    cell: ({ rowData: entity }) => {
      const { payload, options } = buildEntityIntentPayload(entity);
      return (
        <IntentButton size="condensed" payload={payload} options={options}>
          Open with
        </IntentButton>
      );
    },
  },
];
