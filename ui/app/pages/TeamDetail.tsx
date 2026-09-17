import React from "react";
import { useParams } from "react-router-dom";
import { Flex, TitleBar } from "@dynatrace/strato-components/layouts";
import { Paragraph } from "@dynatrace/strato-components/typography";
import { TimeframeSelector } from "@dynatrace/strato-components/filters";
import { NodeIcon, WarningIcon } from "@dynatrace/strato-icons";
import { AnalysisCard } from "../components/AnalysisCard";
import { PageHeaderBanner } from "../components/PageHeaderBanner";
import { QueryDisclosure } from "../components/QueryDisclosure";
import { StatTile } from "../components/StatTile";
import { useEffortData } from "../lib/useEffortData";
import { useSharedTimeframe } from "../lib/useSharedTimeframe";

export const TeamDetail = () => {
  const { teamId = "" } = useParams<{ teamId: string }>();

  const { selectorValue, onChange, dqlTimeframe: timeframe } = useSharedTimeframe();

  const { teamStats, queries, isLoading } = useEffortData({ timeframe });

  const stats = teamStats.find((t) => t.teamId === teamId);

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <PageHeaderBanner>
        <TitleBar>
          <TitleBar.Title>{stats?.displayName ?? teamId}</TitleBar.Title>
          <TitleBar.Suffix>
            <TimeframeSelector aria-label="Select timeframe" value={selectorValue} onChange={onChange} stepper />
          </TitleBar.Suffix>
        </TitleBar>
      </PageHeaderBanner>

      {!stats && !isLoading && <Paragraph>No data found for this team in the selected timeframe.</Paragraph>}

      {stats && (
        <Flex gap={16} flexFlow="wrap">
          <StatTile label="Owned entities" value={String(stats.entityCount)} accent="primary" />
          <StatTile label="Problems" value={String(stats.totalProblems)} accent="neutral" />
          <StatTile
            label="Open"
            value={String(stats.openProblems)}
            accent={stats.openProblems > 0 ? "critical" : "success"}
          />
          <StatTile
            label="Avg. MTTR (min)"
            value={stats.avgMttrMinutes !== undefined ? stats.avgMttrMinutes.toFixed(1) : "—"}
            accent={
              stats.avgMttrMinutes === undefined
                ? "neutral"
                : stats.avgMttrMinutes < 30
                  ? "success"
                  : stats.avgMttrMinutes < 60
                    ? "warning"
                    : "critical"
            }
          />
        </Flex>
      )}

      <QueryDisclosure
        queries={[
          { label: "Entity roster", query: queries.entityRoster },
          { label: "Dynatrace Intelligence problems", query: queries.problems },
          { label: "Automation executions", query: queries.automations },
        ]}
      />

      <Flex gap={16} padding={16} justifyContent="center">
        <AnalysisCard
          icon={<WarningIcon size={32} />}
          title="Analyze Problems"
          description="Drill into the Dynatrace Intelligence problems detected for this team's entities."
          to={`/teams/${teamId}/problems`}
          accent="warning"
        />
        <AnalysisCard
          icon={<NodeIcon size={32} />}
          title="Analyze Entities"
          description="Browse the hosts, services, and workloads owned by this team."
          to={`/teams/${teamId}/entities`}
          accent="primary"
        />
      </Flex>
    </Flex>
  );
};
