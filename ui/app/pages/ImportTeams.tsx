import React, { useState } from "react";
import { Flex, TitleBar } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import { Heading, Link, Paragraph, Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import Borders from "@dynatrace/strato-design-tokens/borders";
import BoxShadows from "@dynatrace/strato-design-tokens/box-shadows";
import { ExternalLinkIcon } from "@dynatrace/strato-icons";
import { sendIntent } from "@dynatrace-sdk/navigation";
import type { Workflow } from "@dynatrace-sdk/client-automation";
import { PageHeaderBanner } from "../components/PageHeaderBanner";
import { createImportTeamsWorkflow, IMPORT_TEAMS_SOURCES } from "../lib/importTeamsWorkflows";
import { createSyncOwnershipWorkflow } from "../lib/syncOwnershipWorkflow";
import { AccentTone, cardAccentBorder } from "../lib/theme";

const SOURCE_ACCENTS: AccentTone[] = ["primary", "success", "warning"];

const CARD_STYLE: React.CSSProperties = {
  minWidth: "280px",
  maxWidth: "360px",
  border: `${Colors.Border.Neutral.Default}`,
  borderRadius: `${Borders.Radius.Container.Default}`,
  background: `${Colors.Background.Surface.Default}`,
  boxShadow: `${BoxShadows.Surface.Raised.Rest}`,
};

/** Shared chrome for a "build this workflow for me" card — the button creates a real, private, un-triggered workflow and opens it in the Workflows app. */
const WorkflowBuildCard = ({
  title,
  description,
  docsUrl,
  accent,
  onBuild,
}: {
  title: string;
  description: string;
  docsUrl: string;
  accent: AccentTone;
  onBuild: () => Promise<Workflow>;
}) => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string>();

  const handleBuild = async () => {
    setIsBuilding(true);
    setError(undefined);
    try {
      const workflow = await onBuild();
      sendIntent(
        { "workflow.id": workflow.id },
        { recommendedAppId: "dynatrace.automations", recommendedIntentId: "view-workflow-by-id" },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <Flex flexDirection="column" gap={12} padding={20} style={{ ...CARD_STYLE, ...cardAccentBorder(accent) }}>
      <Heading level={4}>{title}</Heading>
      <Paragraph>{description}</Paragraph>
      <Link href={docsUrl} target="_blank" rel="noopener noreferrer">
        View setup docs
        <ExternalLinkIcon />
      </Link>
      {error && <Text style={{ color: Colors.Text.Critical.Default }}>Couldn&apos;t build: {error}</Text>}
      <Button onClick={() => void handleBuild()} disabled={isBuilding} variant="accent" color="primary">
        {isBuilding ? "Building..." : "Build workflow"}
      </Button>
    </Flex>
  );
};

export const ImportTeams = () => {
  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <PageHeaderBanner>
        <TitleBar>
          <TitleBar.Title>Import</TitleBar.Title>
          <TitleBar.Subtitle>
            Build a workflow that imports your team catalog from an external source into
            Dynatrace&apos;s native Ownership teams, instead of maintaining it by hand on the Teams
            page.
          </TitleBar.Subtitle>
        </TitleBar>
      </PageHeaderBanner>

      <Paragraph>
        Each option below actually creates the workflow in your tenant — it&apos;s live, not a
        draft, though private to you until you choose to share it. Nothing runs automatically:
        there&apos;s no schedule or trigger attached, so it won&apos;t execute until you open it in
        the Workflows app, pick (or create) a connector connection, and run it yourself.
      </Paragraph>

      <Flex gap={16} flexFlow="wrap">
        {IMPORT_TEAMS_SOURCES.map((source, index) => (
          <WorkflowBuildCard
            key={source.id}
            title={source.title}
            description={source.description}
            docsUrl={source.docsUrl}
            accent={SOURCE_ACCENTS[index % SOURCE_ACCENTS.length]}
            onBuild={() => createImportTeamsWorkflow(source)}
          />
        ))}
      </Flex>

      <Heading level={3}>Sync</Heading>
      <Paragraph>
        Build a workflow that regenerates the entity-team-assignments lookup file (
        <code>/lookups/ownership-and-efforts/entity-team-assignments</code>) — a dense, machine-written
        export of every entity&apos;s resolved team (manual override, else tag-based auto-detect) that
        other tenant automations/workflows can read. Attach a schedule trigger (e.g. hourly) once
        you&apos;ve opened it in the Workflows app, so the export stays fresh on its own.
      </Paragraph>

      <Flex gap={16} flexFlow="wrap">
        <WorkflowBuildCard
          title="Sync Ownership Table"
          description="Runs the app's regenerate-entity-team-assignments function, which resolves every entity's owning team and rewrites the shared lookup file other workflows depend on."
          docsUrl="https://docs.dynatrace.com/docs/analyze-explore-automate/workflows/default-workflow-actions/run-javascript-workflow-action"
          accent="neutral"
          onBuild={createSyncOwnershipWorkflow}
        />
      </Flex>
    </Flex>
  );
};
