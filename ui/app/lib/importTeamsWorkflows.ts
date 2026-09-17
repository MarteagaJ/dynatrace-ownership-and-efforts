import { workflowsClient, type Task, type Tasks, type Workflow } from "@dynatrace-sdk/client-automation";

export type ImportTeamsSourceId = "servicenow" | "entra-id" | "json-schema";

export type ImportTeamsSource = {
  id: ImportTeamsSourceId;
  title: string;
  description: string;
  docsUrl: string;
  buildTasks: () => Tasks;
};

const EXAMPLE_TEAM_JSON = JSON.stringify(
  [
    {
      name: "Example Team",
      identifier: "example-team",
      description: "Replace this with your real team data before running.",
      supplementaryIdentifiers: [],
      responsibilities: {
        development: true,
        security: false,
        operations: false,
        infrastructure: false,
        lineOfBusiness: false,
      },
      contactDetails: [{ integrationType: "EMAIL", email: "team@example.com" }],
      links: [],
      additionalInformation: [],
    },
  ],
  null,
  2,
);

/**
 * Every source funnels into the same builtin Ownership action, confirmed against a real deployed
 * workflow in a live tenant (dynatrace.ownership:import-teams-to-settings, see
 * ImportTeams.tsx / docs.dynatrace.com/docs/shortlink/automate-team-updates). What differs is
 * which connector (if any) fetches the raw group data beforehand.
 */
function buildImportTeamsTask(options: {
  importSource: string;
  importData: string;
  predecessors: string[];
  conditions?: Task["conditions"];
  position: { x: number; y: number };
}): Task {
  return {
    action: "dynatrace.ownership:import-teams-to-settings",
    description: "Import teams into Dynatrace.",
    input: {
      failStrategy: "CONTINUE_AND_LOG_FAILURE",
      importData: options.importData,
      importSource: options.importSource,
      importType: "IMPORT_ONLY",
    },
    name: "import_teams",
    position: options.position,
    predecessors: options.predecessors,
    conditions: options.conditions,
  };
}

export const IMPORT_TEAMS_SOURCES: ImportTeamsSource[] = [
  {
    id: "servicenow",
    title: "ServiceNow",
    description:
      "Fetches support groups from ServiceNow via the ServiceNow Connector, then imports each as a team.",
    docsUrl: "https://docs.dynatrace.com/docs/shortlink/automate-team-updates",
    buildTasks: () => ({
      get_groups: {
        action: "dynatrace.servicenow:snow-get-groups",
        description: "Fetch your groups from ServiceNow",
        input: { connectionId: "" },
        name: "get_groups",
        position: { x: 0, y: 1 },
        predecessors: [],
      },
      import_teams: buildImportTeamsTask({
        importSource: "ServiceNow groups",
        importData: '{{ result("get_groups") }}',
        predecessors: ["get_groups"],
        conditions: { states: { get_groups: "OK" } },
        position: { x: 0, y: 2 },
      }),
    }),
  },
  {
    id: "entra-id",
    title: "Microsoft Entra ID",
    description:
      "Fetches groups from Microsoft Entra ID via the Entra ID Connector, then imports each as a team.",
    docsUrl: "https://docs.dynatrace.com/docs/shortlink/automate-team-updates",
    buildTasks: () => ({
      get_groups: {
        action: "dynatrace.azure.connector:get-groups",
        description: "Fetch your groups from Microsoft Entra ID",
        input: { connectionId: "" },
        name: "get_groups",
        position: { x: 0, y: 1 },
        predecessors: [],
      },
      import_teams: buildImportTeamsTask({
        importSource: "Entra ID groups",
        importData: '{{ result("get_groups") }}',
        predecessors: ["get_groups"],
        conditions: { states: { get_groups: "OK" } },
        position: { x: 0, y: 2 },
      }),
    }),
  },
  {
    id: "json-schema",
    title: "Predefined JSON schema",
    description:
      "No connector involved — imports teams directly from a JSON payload you provide, matching Dynatrace's Ownership schema (name, identifier, responsibilities, contact details, links, ...).",
    docsUrl: "https://docs.dynatrace.com/docs/shortlink/automate-team-updates",
    buildTasks: () => ({
      import_teams: buildImportTeamsTask({
        importSource: "JSON in Ownership schema",
        importData: EXAMPLE_TEAM_JSON,
        predecessors: [],
        position: { x: 0, y: 1 },
      }),
    }),
  },
];

/**
 * Creates a real, live (but private) workflow scaffolding the task graph for the given source.
 * No trigger is attached, so nothing runs automatically — and any connector's connectionId is
 * left blank on purpose, since the user needs to open it in the Workflows app to pick/create a
 * real connector connection before running it.
 */
export async function createImportTeamsWorkflow(source: ImportTeamsSource): Promise<Workflow> {
  return workflowsClient.createWorkflow({
    body: {
      title: `Import teams from ${source.title}`,
      isPrivate: true,
      tasks: source.buildTasks(),
    },
  });
}
