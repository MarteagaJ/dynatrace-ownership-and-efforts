const fetchMock = jest.fn();
globalThis.fetch = fetchMock;

jest.mock("@dynatrace-sdk/client-query", () => ({
  queryExecutionClient: { queryExecute: jest.fn(), queryPoll: jest.fn() },
}));
jest.mock("@dynatrace-sdk/client-resource-store", () => ({
  lookupDataClient: { upload: jest.fn() },
}));

import { queryExecutionClient } from "@dynatrace-sdk/client-query";
import { lookupDataClient } from "@dynatrace-sdk/client-resource-store";
import regenerateEntityTeamAssignments from "./regenerate-entity-team-assignments.function";

const queryExecuteMock = queryExecutionClient.queryExecute as jest.Mock;
const uploadMock = lookupDataClient.upload as jest.Mock;

const ROSTER_RESULT = {
  state: "SUCCEEDED",
  result: {
    records: [
      { id: "HOST-1", name: "host-1", entityType: "Host", tags: [] },
      { id: "HOST-2", name: "host-2", entityType: "Host", tags: ["dt.owner:team-b"] },
      { id: "HOST-3", name: "host-3", entityType: "Host", tags: [] },
    ],
  },
};

describe("regenerate-entity-team-assignments.function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves each entity via override-or-tag-detect, uploading only assigned entities", async () => {
    queryExecuteMock.mockImplementation(async ({ body }: { body: { query: string } }) => {
      if (body.query.startsWith("load ")) {
        return {
          state: "SUCCEEDED",
          result: { records: [{ entity_id: "HOST-1", entity_name: "host-1", entity_type: "Host", team_id: "team-a" }] },
        };
      }
      return ROSTER_RESULT;
    });

    const summary = await regenerateEntityTeamAssignments();

    // HOST-1 -> override, HOST-2 -> tag auto-detect, HOST-3 -> no signal, stays unassigned.
    expect(summary).toEqual({ entityCount: 3, assignedCount: 2, unassignedCount: 1 });
    expect(uploadMock).toHaveBeenCalledTimes(1);

    const uploadCall = uploadMock.mock.calls[0][0];
    expect(uploadCall.body.request).toMatchObject({
      filePath: "/lookups/ownership-and-efforts/entity-team-assignments",
      lookupField: "entity_id",
      overwrite: true,
    });
    const uploadedContent = await uploadCall.body.content.get("text");
    expect(uploadedContent).toBe("HOST-1\thost-1\tHost\tteam-a\nHOST-2\thost-2\tHost\tteam-b");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a missing overrides file as an empty override set instead of failing", async () => {
    const missingFileError = { body: { error: { details: { errorType: "UNKNOWN_TABULAR_FILE" } } } };
    queryExecuteMock.mockImplementation(async ({ body }: { body: { query: string } }) => {
      if (body.query.startsWith("load ")) throw missingFileError;
      return ROSTER_RESULT;
    });

    const summary = await regenerateEntityTeamAssignments();

    // With no overrides at all, only HOST-2's own tag resolves a team.
    expect(summary).toEqual({ entityCount: 3, assignedCount: 1, unassignedCount: 2 });
  });

  it("propagates a genuine query failure instead of silently producing an incomplete export", async () => {
    queryExecuteMock.mockResolvedValue({ state: "FAILED" });

    await expect(regenerateEntityTeamAssignments()).rejects.toThrow();
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
