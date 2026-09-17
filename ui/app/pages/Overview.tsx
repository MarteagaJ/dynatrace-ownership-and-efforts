import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Flex, TitleBar } from "@dynatrace/strato-components/layouts";
import { Link, Paragraph } from "@dynatrace/strato-components/typography";
import { TimeframeSelector } from "@dynatrace/strato-components/filters";
import { PageHeaderBanner } from "../components/PageHeaderBanner";
import { QueryDisclosure } from "../components/QueryDisclosure";
import { StatTile } from "../components/StatTile";
import { TableRowLimitNotice } from "../components/TableRowLimitNotice";
import { TeamStatsTable } from "../components/TeamStatsTable";
import { useEffortData } from "../lib/useEffortData";
import { useSharedTimeframe } from "../lib/useSharedTimeframe";
import { MAX_TABLE_ROWS, UNASSIGNED_TEAM_ID } from "../lib/types";

export const Overview = () => {
  const { selectorValue, onChange, dqlTimeframe: timeframe } = useSharedTimeframe();
  const { teamStats, problems, queries, isLoading } = useEffortData({ timeframe });

  const kpis = useMemo(() => {
    const unassigned = teamStats.find((t) => t.teamId === UNASSIGNED_TEAM_ID);
    const knownTeams = teamStats.filter((t) => t.teamId !== UNASSIGNED_TEAM_ID).length;
    return {
      totalProblems: problems.length,
      unassignedProblems: unassigned?.totalProblems ?? 0,
      knownTeams,
    };
  }, [teamStats, problems]);

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <PageHeaderBanner>
        <TitleBar>
          <TitleBar.Title>Ownership &amp; Efforts</TitleBar.Title>
          <TitleBar.Subtitle>
            Reliability effort by team, based on Dynatrace Intelligence problems and entity ownership.
          </TitleBar.Subtitle>
          <TitleBar.Suffix>
            <TimeframeSelector aria-label="Select timeframe" value={selectorValue} onChange={onChange} stepper />
          </TitleBar.Suffix>
        </TitleBar>
      </PageHeaderBanner>

      <Flex gap={16} flexFlow="wrap">
        <StatTile label="Problems in range" value={String(kpis.totalProblems)} accent="primary" />
        <StatTile
          label="Unassigned problems"
          value={String(kpis.unassignedProblems)}
          accent={kpis.unassignedProblems > 0 ? "warning" : "success"}
        />
        <StatTile label="Teams tracked" value={String(kpis.knownTeams)} accent="success" />
      </Flex>

      <QueryDisclosure
        queries={[
          { label: "Entity roster", query: queries.entityRoster },
          { label: "Dynatrace Intelligence problems", query: queries.problems },
        ]}
      />

      {kpis.unassignedProblems > 0 && (
        <Paragraph>
          {kpis.unassignedProblems} problem(s) couldn&apos;t be attributed to a team. Visit{" "}
          <Link as={RouterLink} to="/entities">
            Entities
          </Link>{" "}
          to add owner tags or manual mappings for the affected entities.
        </Paragraph>
      )}

      <TeamStatsTable data={teamStats.slice(0, MAX_TABLE_ROWS)} isLoading={isLoading} />
      <TableRowLimitNotice total={teamStats.length} />
      <QueryDisclosure
        queries={[
          { label: "Entity roster", query: queries.entityRoster },
          { label: "Dynatrace Intelligence problems", query: queries.problems },
        ]}
      />
    </Flex>
  );
};
