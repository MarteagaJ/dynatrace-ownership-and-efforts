import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Flex, TitleBar } from "@dynatrace/strato-components/layouts";
import { Heading } from "@dynatrace/strato-components/typography";
import {
  FilterField,
  TimeframeSelector,
  type FilterFieldTree,
  type FilterFieldValidatorMap,
} from "@dynatrace/strato-components/filters";
import { DataTable } from "@dynatrace/strato-components/tables";
import { ChartCard } from "../components/ChartCard";
import { BarChart } from "../components/charts/BarChart";
import { DonutChart } from "../components/charts/DonutChart";
import { HeatmapGrid } from "../components/charts/HeatmapGrid";
import { LineChart } from "../components/charts/LineChart";
import { Treemap } from "../components/charts/Treemap";
import { PageBreadcrumbs } from "../components/PageBreadcrumbs";
import { PageHeaderBanner } from "../components/PageHeaderBanner";
import { QueryDisclosure } from "../components/QueryDisclosure";
import { TableRowLimitNotice } from "../components/TableRowLimitNotice";
import { extractSimpleFilters } from "../lib/filterField";
import {
  buildAffectedEntitiesTrend,
  buildCostAllocationHeatmap,
  buildEntityAgeBreakdown,
  buildEntityHealthBreakdown,
  buildEntityTypeBreakdown,
  buildRootCauseEntitiesTrend,
  buildRootCauseHotspots,
  buildSecurityContextBreakdown,
  buildTechnologyBreakdown,
} from "../lib/entityCharts";
import { buildNoisiestEntities } from "../lib/problemCharts";
import { ENTITY_COLUMNS, ENTITY_KINDS } from "../lib/teamTableColumns";
import { useEffortData } from "../lib/useEffortData";
import { useSharedTimeframe } from "../lib/useSharedTimeframe";
import { MAX_TABLE_ROWS, UNASSIGNED_TEAM_ID } from "../lib/types";

export const TeamEntities = () => {
  const { teamId = "" } = useParams<{ teamId: string }>();

  const { selectorValue, onChange, dqlTimeframe: timeframe, resolvedTimeframe } = useSharedTimeframe();
  const [entitiesFilterValue, setEntitiesFilterValue] = useState("");
  const [entitiesFilterTree, setEntitiesFilterTree] = useState<FilterFieldTree>(undefined);

  const entitiesValidatorMap = useMemo<FilterFieldValidatorMap>(
    () => ({
      keyPredicates: [
        { key: "Name", valueType: "String" },
        { key: "Type", valuePredicate: ENTITY_KINDS, valueType: "String" },
      ],
      exhaustive: true,
    }),
    [],
  );

  const entitiesAppliedFilters = useMemo(() => extractSimpleFilters(entitiesFilterTree), [entitiesFilterTree]);

  const effortFilters = useMemo(
    () => ({
      timeframe,
      entityType: entitiesAppliedFilters.Type,
      entityNameContains: entitiesAppliedFilters.Name,
    }),
    [timeframe, entitiesAppliedFilters],
  );

  const { teamStats, entities, problems, queries, isLoading } = useEffortData(effortFilters);

  const stats = teamStats.find((t) => t.teamId === teamId);
  const teamEntities = useMemo(
    () => entities.filter((e) => (e.detectedTeamId ?? UNASSIGNED_TEAM_ID) === teamId),
    [entities, teamId],
  );
  const teamProblems = useMemo(
    () => problems.filter((p) => p.resolvedTeamId === teamId),
    [problems, teamId],
  );

  const entityTypeBreakdown = useMemo(() => buildEntityTypeBreakdown(teamEntities), [teamEntities]);
  const technologyBreakdown = useMemo(() => buildTechnologyBreakdown(teamEntities), [teamEntities]);
  const costAllocationHeatmap = useMemo(() => buildCostAllocationHeatmap(teamEntities), [teamEntities]);
  const securityContextBreakdown = useMemo(() => buildSecurityContextBreakdown(teamEntities), [teamEntities]);
  const entityHealthBreakdown = useMemo(
    () => buildEntityHealthBreakdown(teamEntities, teamProblems),
    [teamEntities, teamProblems],
  );
  const noisiestEntities = useMemo(() => buildNoisiestEntities(teamProblems), [teamProblems]);
  const rootCauseHotspots = useMemo(() => buildRootCauseHotspots(teamProblems), [teamProblems]);
  const entityAgeBreakdown = useMemo(() => buildEntityAgeBreakdown(teamEntities), [teamEntities]);
  const affectedEntitiesTrend = useMemo(
    () => buildAffectedEntitiesTrend(teamProblems, resolvedTimeframe),
    [teamProblems, resolvedTimeframe],
  );
  const rootCauseEntitiesTrend = useMemo(
    () => buildRootCauseEntitiesTrend(teamProblems, resolvedTimeframe),
    [teamProblems, resolvedTimeframe],
  );

  const hasActiveProblems = entityHealthBreakdown.some((b) => b.category === "Active problem(s)" && b.value > 0);

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <PageBreadcrumbs
        trail={[
          { label: "Teams", to: "/teams" },
          { label: stats?.displayName ?? teamId, to: `/teams/${teamId}` },
          { label: "Entities", to: `/teams/${teamId}/entities` },
        ]}
      />

      <PageHeaderBanner>
        <TitleBar>
          <TitleBar.Title>{stats?.displayName ?? teamId} — Entities</TitleBar.Title>
          <TitleBar.Suffix>
            <TimeframeSelector aria-label="Select timeframe" value={selectorValue} onChange={onChange} stepper />
          </TitleBar.Suffix>
        </TitleBar>
      </PageHeaderBanner>

      <Heading level={3}>Visualizations</Heading>
      <Flex gap={16} flexFlow="wrap">
        <ChartCard title="Entities by Type" description="Composition of this team's owned infrastructure." accent="primary">
          <BarChart data={entityTypeBreakdown} orientation="horizontal" loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Entity roster", query: queries.entityRoster }]} />
        </ChartCard>

        <ChartCard
          title="Top Technologies in Use"
          description="Distinct technologies detected across owned hosts and services."
          accent="primary"
        >
          <BarChart data={technologyBreakdown} orientation="horizontal" loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Entity roster", query: queries.entityRoster }]} />
        </ChartCard>

        <ChartCard
          title="Cost Allocation"
          description="Entity count by cost center and cost product, from tag-based cost allocation."
          accent="success"
        >
          <HeatmapGrid data={costAllocationHeatmap} loading={isLoading} rowLabelWidth={140} />
          <QueryDisclosure queries={[{ label: "Entity roster", query: queries.entityRoster }]} />
        </ChartCard>

        <ChartCard
          title="Security Context Coverage"
          description="Which security contexts (e.g. cloud provider) this team's entities fall under."
          accent="neutral"
        >
          <BarChart data={securityContextBreakdown} orientation="horizontal" loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Entity roster", query: queries.entityRoster }]} />
        </ChartCard>

        <ChartCard
          title="Entity Health"
          description="Share of owned entities currently caught up in an active problem, only historical ones, or clean."
          accent={hasActiveProblems ? "critical" : "success"}
        >
          <DonutChart data={entityHealthBreakdown} loading={isLoading} />
          <QueryDisclosure
            queries={[
              { label: "Entity roster", query: queries.entityRoster },
              { label: "Dynatrace Intelligence problems", query: queries.problems },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Problems by Entity"
          description="Which of this team's entities have been affected by the most problems."
          accent="critical"
        >
          <Treemap nodes={noisiestEntities} loading={isLoading} />
          <QueryDisclosure
            queries={[
              { label: "Entity roster", query: queries.entityRoster },
              { label: "Dynatrace Intelligence problems", query: queries.problems },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Root Cause Hotspots"
          description="Entities Dynatrace Intelligence most often names as the actual root cause, not merely affected."
          accent="critical"
        >
          <BarChart data={rootCauseHotspots} orientation="horizontal" loading={isLoading} />
          <QueryDisclosure
            queries={[
              { label: "Entity roster", query: queries.entityRoster },
              { label: "Dynatrace Intelligence problems", query: queries.problems },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Entity Age Distribution"
          description="How long ago each owned entity was first discovered — a proxy for infrastructure churn."
          accent="neutral"
        >
          <BarChart data={entityAgeBreakdown} orientation="vertical" loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Entity roster", query: queries.entityRoster }]} />
        </ChartCard>

        <ChartCard
          title="Affected Entities Over Time"
          description="Count of distinct owned entities caught up in a problem within each time bucket."
          accent="critical"
        >
          <LineChart data={affectedEntitiesTrend} loading={isLoading} />
          <QueryDisclosure
            queries={[
              { label: "Entity roster", query: queries.entityRoster },
              { label: "Dynatrace Intelligence problems", query: queries.problems },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Root Cause Entities Over Time"
          description="Count of distinct owned entities named as an actual root cause within each time bucket."
          accent="critical"
        >
          <LineChart data={rootCauseEntitiesTrend} loading={isLoading} />
          <QueryDisclosure
            queries={[
              { label: "Entity roster", query: queries.entityRoster },
              { label: "Dynatrace Intelligence problems", query: queries.problems },
            ]}
          />
        </ChartCard>
      </Flex>

      <FilterField
        aria-label="Filter entities"
        value={entitiesFilterValue}
        onChange={(value, tree) => {
          setEntitiesFilterValue(value);
          setEntitiesFilterTree(tree);
        }}
        validatorMap={entitiesValidatorMap}
        autoSuggestions
      />

      <DataTable
        data={teamEntities.slice(0, MAX_TABLE_ROWS)}
        columns={ENTITY_COLUMNS}
        sortable
        resizable
        fullWidth
        loading={isLoading}
      />
      <TableRowLimitNotice total={teamEntities.length} />
      <QueryDisclosure
        queries={[
          { label: "Entity roster", query: queries.entityRoster },
          { label: "Dynatrace Intelligence problems", query: queries.problems },
        ]}
      />
    </Flex>
  );
};
