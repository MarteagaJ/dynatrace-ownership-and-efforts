import { workflowsClient, type Task, type Workflow } from "@dynatrace-sdk/client-automation";

/**
 * Source code for the workflow's single run_javascript task. Calls the app's own
 * regenerate-entity-team-assignments backend function (api/regenerate-entity-team-assignments.function.ts),
 * which rewrites the dense entity-team-assignments lookup file other tenant automations/workflows
 * can read (see ENTITY_TEAM_ASSIGNMENTS_FILE_PATH in lib/queries.ts).
 */
const SYNC_SCRIPT = `// optional import of sdk modules
import { execution } from '@dynatrace-sdk/automation-utils';
import { functions } from '@dynatrace-sdk/adhoc-utils';

export default async function ({ execution_id }) {
  const ex = await execution();
  console.log('Automated script execution on behalf of', ex.trigger);
  return await functions.call('my.ownership.and.efforts', 'regenerate-entity-team-assignments');
}
`;

function buildRunJavaScriptTask(options: { predecessors: string[]; position: { x: number; y: number } }): Task {
  return {
    action: "dynatrace.automations:run-javascript",
    description: "Run custom JavaScript code.",
    input: { script: SYNC_SCRIPT },
    name: "run_javascript_1",
    position: options.position,
    predecessors: options.predecessors,
  };
}

/**
 * Creates a real, live (but private) workflow with no trigger attached — matching the same
 * "scaffold now, wire up a schedule/connector later" pattern as createImportTeamsWorkflow in
 * lib/importTeamsWorkflows.ts. Nothing runs until the user opens it in the Workflows app and
 * either runs it manually or attaches a trigger (e.g. hourly schedule).
 */
export async function createSyncOwnershipWorkflow(): Promise<Workflow> {
  return workflowsClient.createWorkflow({
    body: {
      title: "Sync Ownership Table",
      isPrivate: true,
      tasks: {
        run_javascript_1: buildRunJavaScriptTask({ predecessors: [], position: { x: 0, y: 1 } }),
      },
    },
  });
}
