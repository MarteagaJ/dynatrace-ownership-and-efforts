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
import { GaugeChart } from "@dynatrace/strato-components/charts";
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
  buildAutomationsHeatmap,
  buildCategoryBreakdown,
  buildCommentsTrend,
  buildMttrTrend,
  buildNoisiestEntities,
  buildOccurrenceHeatmap,
  buildProblemTrend,
  buildSeverityBreakdown,
  buildTopProblemsByDuration,
  getMttrGaugeColor,
} from "../lib/problemCharts";
import { PROBLEM_COLUMNS, PROBLEM_CATEGORIES, PROBLEM_STATUSES } from "../lib/teamTableColumns";
import { AccentTone } from "../lib/theme";
import { useEffortData } from "../lib/useEffortData";
import { useSharedTimeframe } from "../lib/useSharedTimeframe";
import { MAX_TABLE_ROWS } from "../lib/types";

export const TeamProblems = () => {
  const { teamId = "" } = useParams<{ teamId: string }>();

  const { selectorValue, onChange, dqlTimeframe: timeframe, resolvedTimeframe } = useSharedTimeframe();
  const [problemsFilterValue, setProblemsFilterValue] = useState("");
  const [problemsFilterTree, setProblemsFilterTree] = useState<FilterFieldTree>(undefined);

  const problemsValidatorMap = useMemo<FilterFieldValidatorMap>(
    () => ({
      keyPredicates: [
        { key: "ID", valueType: "String" },
        { key: "Name", valueType: "String" },
        { key: "Status", valuePredicate: PROBLEM_STATUSES, valueType: "String" },
        { key: "Severity", valuePredicate: ["1", "2", "3", "4"], valueType: "String" },
        { key: "Category", valuePredicate: PROBLEM_CATEGORIES, valueType: "String" },
      ],
      exhaustive: true,
    }),
    [],
  );

  const problemsAppliedFilters = useMemo(() => extractSimpleFilters(problemsFilterTree), [problemsFilterTree]);

  const effortFilters = useMemo(
    () => ({
      timeframe,
      problemStatus: problemsAppliedFilters.Status,
      problemNameContains: problemsAppliedFilters.Name,
      problemDisplayIdContains: problemsAppliedFilters.ID,
      problemCategory: problemsAppliedFilters.Category,
      problemSeverity: problemsAppliedFilters.Severity ? Number(problemsAppliedFilters.Severity) : undefined,
    }),
    [timeframe, problemsAppliedFilters],
  );

  const { teamStats, problems, commentEvents, queries, isLoading } = useEffortData(effortFilters);

  const stats = teamStats.find((t) => t.teamId === teamId);
  const teamProblems = useMemo(
    () => problems.filter((p) => p.resolvedTeamId === teamId),
    [problems, teamId],
  );

  const teamEventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const problem of teamProblems) {
      ids.add(problem.eventId);
      for (const id of problem.constituentEventIds) ids.add(id);
    }
    return ids;
  }, [teamProblems]);

  const teamCommentTimestamps = useMemo(
    () => commentEvents.filter((c) => teamEventIds.has(c.problemEventId)).map((c) => c.timestamp),
    [commentEvents, teamEventIds],
  );

  const problemTrend = useMemo(
    () => buildProblemTrend(teamProblems, resolvedTimeframe),
    [teamProblems, resolvedTimeframe],
  );
  const categoryBreakdown = useMemo(() => buildCategoryBreakdown(teamProblems), [teamProblems]);
  const severityBreakdown = useMemo(() => buildSeverityBreakdown(teamProblems), [teamProblems]);
  const occurrenceHeatmap = useMemo(() => buildOccurrenceHeatmap(teamProblems), [teamProblems]);
  const noisiestEntities = useMemo(() => buildNoisiestEntities(teamProblems), [teamProblems]);
  const automationsHeatmap = useMemo(() => buildAutomationsHeatmap(teamProblems), [teamProblems]);
  const commentsTrend = useMemo(
    () => buildCommentsTrend(teamCommentTimestamps, resolvedTimeframe),
    [teamCommentTimestamps, resolvedTimeframe],
  );
  const mttrTrend = useMemo(() => buildMttrTrend(teamProblems, resolvedTimeframe), [teamProblems, resolvedTimeframe]);
  const topProblemsByDuration = useMemo(() => buildTopProblemsByDuration(teamProblems), [teamProblems]);
  const mttrGaugeColor = getMttrGaugeColor(stats?.avgMttrMinutes);
  const mttrAccent: AccentTone =
    mttrGaugeColor === "green" ? "success" : mttrGaugeColor === "orange" ? "warning" : mttrGaugeColor === "red" ? "critical" : "neutral";

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <PageBreadcrumbs
        trail={[
          { label: "Teams", to: "/teams" },
          { label: stats?.displayName ?? teamId, to: `/teams/${teamId}` },
          { label: "Problems", to: `/teams/${teamId}/problems` },
        ]}
      />

      <PageHeaderBanner>
        <TitleBar>
          <TitleBar.Title>{stats?.displayName ?? teamId} — Problems</TitleBar.Title>
          <TitleBar.Suffix>
            <TimeframeSelector aria-label="Select timeframe" value={selectorValue} onChange={onChange} stepper />
          </TitleBar.Suffix>
        </TitleBar>
      </PageHeaderBanner>

      <Heading level={3}>Visualizations</Heading>
      <Flex gap={16} flexFlow="wrap">
        <ChartCard
          title="Avg. MTTR"
          description="Mean time to resolve, against a 30/60-minute target."
          accent={mttrAccent}
        >
          <GaugeChart
            value={stats?.avgMttrMinutes ?? 0}
            min={0}
            max={120}
            unit="min"
            color={mttrGaugeColor}
            loading={isLoading}
          >
            <GaugeChart.Label />
          </GaugeChart>
          <QueryDisclosure queries={[{ label: "Dynatrace Intelligence problems", query: queries.problems }]} />
        </ChartCard>

        <ChartCard
          title="Problems Opened Over Time"
          description="Problem volume over the selected timeframe."
          accent="primary"
        >
          <BarChart data={problemTrend} orientation="vertical" loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Dynatrace Intelligence problems", query: queries.problems }]} />
        </ChartCard>

        <ChartCard
          title="Problems by Category"
          description="Which kind of problem dominates for this team."
          accent="primary"
        >
          <BarChart data={categoryBreakdown} orientation="horizontal" loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Dynatrace Intelligence problems", query: queries.problems }]} />
        </ChartCard>

        <ChartCard
          title="Problems by Severity"
          description="Distribution across Dynatrace Intelligence severity levels 1 (low) to 4 (high)."
          accent="warning"
        >
          <DonutChart data={severityBreakdown} loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Dynatrace Intelligence problems", query: queries.problems }]} />
        </ChartCard>

        <ChartCard
          title="When Problems Occur"
          description="Occurrence count by day of week and time of day — useful for staffing and on-call planning."
          accent="neutral"
        >
          <HeatmapGrid data={occurrenceHeatmap} loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Dynatrace Intelligence problems", query: queries.problems }]} />
        </ChartCard>

        <ChartCard
          title="Noisiest Entities"
          description="Which entities this team's problems affected most often."
          accent="critical"
        >
          <Treemap nodes={noisiestEntities} loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Dynatrace Intelligence problems", query: queries.problems }]} />
        </ChartCard>

        <ChartCard
          title="Workflow Automations Triggered"
          description="Automation volume by problem category and severity — where remediation effort is concentrated."
          accent="success"
        >
          <HeatmapGrid data={automationsHeatmap} loading={isLoading} rowLabelWidth={110} />
          <QueryDisclosure
            queries={[
              { label: "Dynatrace Intelligence problems", query: queries.problems },
              { label: "Automation executions", query: queries.automations },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Comments Made Over Time"
          description="When investigators are actually adding annotations/comments to this team's problems."
          accent="neutral"
        >
          <BarChart data={commentsTrend} orientation="vertical" loading={isLoading} />
          <QueryDisclosure
            queries={[
              { label: "Dynatrace Intelligence problems", query: queries.problems },
              { label: "Problem comments", query: queries.comments },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Avg. MTTR Over Time"
          description="Average resolution time (minutes) for problems that closed within each time bucket."
          accent={mttrAccent}
        >
          <LineChart data={mttrTrend} loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Dynatrace Intelligence problems", query: queries.problems }]} />
        </ChartCard>

        <ChartCard
          title="Top Problems by Duration"
          description="The 5 longest-running problems in range, sorted descending by duration (minutes)."
          accent="warning"
        >
          <BarChart data={topProblemsByDuration} orientation="horizontal" loading={isLoading} />
          <QueryDisclosure queries={[{ label: "Dynatrace Intelligence problems", query: queries.problems }]} />
        </ChartCard>
      </Flex>

      <FilterField
        aria-label="Filter problems"
        value={problemsFilterValue}
        onChange={(value, tree) => {
          setProblemsFilterValue(value);
          setProblemsFilterTree(tree);
        }}
        validatorMap={problemsValidatorMap}
        autoSuggestions
      />

      <DataTable
        data={teamProblems.slice(0, MAX_TABLE_ROWS)}
        columns={PROBLEM_COLUMNS}
        sortable
        resizable
        fullWidth
        loading={isLoading}
      />
      <TableRowLimitNotice total={teamProblems.length} />
      <QueryDisclosure
        queries={[
          { label: "Dynatrace Intelligence problems", query: queries.problems },
          { label: "Automation executions", query: queries.automations },
          { label: "Problem comments", query: queries.comments },
        ]}
      />
    </Flex>
  );
};
