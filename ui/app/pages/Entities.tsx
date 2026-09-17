import React, { useEffect, useMemo, useState } from "react";
import { Flex, TitleBar } from "@dynatrace/strato-components/layouts";
import { Paragraph } from "@dynatrace/strato-components/typography";
import { Button, IntentButton } from "@dynatrace/strato-components/buttons";
import Colors from "@dynatrace/strato-design-tokens/colors";
import {
  FilterField,
  type FilterFieldTree,
  type FilterFieldValidatorMap,
} from "@dynatrace/strato-components/filters";
import { DataTable, type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { PageHeaderBanner } from "../components/PageHeaderBanner";
import { QueryDisclosure } from "../components/QueryDisclosure";
import { TableRowLimitNotice } from "../components/TableRowLimitNotice";
import { buildEntityIntentPayload } from "../lib/entities";
import { useEffortData } from "../lib/useEffortData";
import { extractSimpleFilters } from "../lib/filterField";
import { EntityKind, EntitySummary, MAX_TABLE_ROWS, OwnershipRegistry, UNASSIGNED_TEAM_ID } from "../lib/types";

const AUTO_DETECT = "__auto__";
const ENTITY_KINDS: EntityKind[] = ["Host", "Service", "Kubernetes deployment", "Web application", "Frontend"];
const UNASSIGNED_LABEL = "Unassigned";

export const Entities = () => {
  const [filterValue, setFilterValue] = useState("");
  const [filterTree, setFilterTree] = useState<FilterFieldTree>(undefined);
  const appliedFilters = useMemo(() => extractSimpleFilters(filterTree), [filterTree]);

  const { registry, saveRegistry, teams, entities, queries, isLoading, isSaving } = useEffortData({
    entityType: appliedFilters.Type,
    entityNameContains: appliedFilters.Name,
  });
  const [draft, setDraft] = useState<OwnershipRegistry>(registry);
  const [saveError, setSaveError] = useState<string>();

  const isDirty = JSON.stringify(draft) !== JSON.stringify(registry);

  // The lookup-file-backed registry can refetch in the background (unlike the old one-shot
  // document fetch), so only auto-sync the draft from it while there are no unsaved edits —
  // otherwise a background refresh would silently discard in-progress changes.
  useEffect(() => {
    if (!isDirty) setDraft(registry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry]);

  const handleSave = () => {
    setSaveError(undefined);
    saveRegistry(draft).catch((e: Error) => setSaveError(e.message));
  };

  const knownTeamIds = useMemo(() => {
    const ids = new Set<string>();
    teams.forEach((t) => ids.add(t.identifier));
    entities.forEach((e) => {
      if (e.detectedTeamId && e.detectedTeamId !== UNASSIGNED_TEAM_ID) ids.add(e.detectedTeamId);
    });
    return Array.from(ids).sort();
  }, [teams, entities]);

  const teamLabel = (teamId: string) =>
    teamId === UNASSIGNED_TEAM_ID ? UNASSIGNED_LABEL : teams.find((t) => t.identifier === teamId)?.name ?? teamId;

  const assignEntity = (entity: EntitySummary, teamId: string) => {
    setDraft((prev) => {
      const others = prev.overrides.filter((o) => o.entityId !== entity.id);
      if (teamId === AUTO_DETECT) return { ...prev, overrides: others };
      return {
        ...prev,
        overrides: [
          ...others,
          { entityId: entity.id, entityName: entity.name, entityType: entity.entityType, teamId },
        ],
      };
    });
  };

  const selectValueFor = (entity: EntitySummary) =>
    draft.overrides.find((o) => o.entityId === entity.id)?.teamId ?? AUTO_DETECT;

  const validatorMap = useMemo<FilterFieldValidatorMap>(
    () => ({
      keyPredicates: [
        { key: "Type", valuePredicate: ENTITY_KINDS, valueType: "String" },
        { key: "Name", valueType: "String" },
        {
          key: "Owner",
          valuePredicate: [UNASSIGNED_LABEL, ...knownTeamIds],
          valueType: "String",
        },
      ],
      exhaustive: true,
    }),
    [knownTeamIds],
  );

  // Type/Name are pushed into the DQL query itself (see useEffortData above); Owner can't be,
  // since ownership resolution is client-side tag/override logic, so it's filtered here instead.
  const filteredEntities = useMemo(() => {
    const ownerFilter = appliedFilters.Owner;
    if (!ownerFilter) return entities;
    return entities.filter((entity) => {
      const owner = entity.detectedTeamId ?? UNASSIGNED_TEAM_ID;
      const matchesUnassigned = ownerFilter === UNASSIGNED_LABEL && owner === UNASSIGNED_TEAM_ID;
      return matchesUnassigned || owner === ownerFilter;
    });
  }, [entities, appliedFilters.Owner]);

  const entityColumns = useMemo<DataTableColumnDef<EntitySummary>[]>(
    () => [
      { id: "entityType", header: "Type", accessor: "entityType", width: 160 },
      { id: "name", header: "Name", accessor: "name" },
      {
        id: "owner",
        header: "Owner",
        accessor: (entity) => teamLabel(entity.detectedTeamId ?? UNASSIGNED_TEAM_ID),
        cell: ({ rowData: entity }) => (
          <select
            value={selectValueFor(entity)}
            onChange={(event) => assignEntity(entity, event.target.value)}
            style={{ width: "100%", padding: "4px" }}
          >
            <option value={AUTO_DETECT}>Auto-detect ({teamLabel(entity.detectedTeamId ?? UNASSIGNED_TEAM_ID)})</option>
            {knownTeamIds.map((teamId) => (
              <option key={teamId} value={teamId}>
                {teamLabel(teamId)}
              </option>
            ))}
          </select>
        ),
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
        id: "securityContext",
        header: "Security Context",
        accessor: (row) => (row.securityContext.length > 0 ? row.securityContext.join(", ") : "—"),
        width: 160,
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
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [knownTeamIds, draft.overrides, teams],
  );

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <PageHeaderBanner>
        <TitleBar>
          <TitleBar.Title>Entities</TitleBar.Title>
          <TitleBar.Subtitle>
            Hosts, services, Kubernetes deployments, web applications, and frontends discovered in your environment.
          </TitleBar.Subtitle>
          <TitleBar.Suffix>
            <Button variant="emphasized" disabled={!isDirty || isSaving} onClick={handleSave}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </TitleBar.Suffix>
        </TitleBar>
      </PageHeaderBanner>

      {saveError && (
        <Paragraph style={{ color: Colors.Text.Critical.Default }}>
          Couldn&apos;t save: {saveError}
        </Paragraph>
      )}

      <FilterField
        aria-label="Filter entities"
        value={filterValue}
        onChange={(value, tree) => {
          setFilterValue(value);
          setFilterTree(tree);
        }}
        validatorMap={validatorMap}
        autoSuggestions
      />

      <DataTable
        data={filteredEntities.slice(0, MAX_TABLE_ROWS)}
        columns={entityColumns}
        sortable
        resizable
        fullWidth
        loading={isLoading}
      />
      <TableRowLimitNotice total={filteredEntities.length} />
      <QueryDisclosure queries={[{ label: "Entity roster", query: queries.entityRoster }]} />
    </Flex>
  );
};
