import { useEffect, useState } from "react";
import { settingsObjectsClient, type SettingsObject } from "@dynatrace-sdk/client-classic-environment-v2";
import { OWNERSHIP_TEAMS_SCHEMA_ID, OWNERSHIP_TEAMS_SCOPE, Team, toTeam } from "./teams";

const PAGE_SIZE = 500;

/**
 * Walks every page via `nextPageKey` (which the API returns `null` on the last page) rather than
 * trusting a single call — the team catalog feeds counts and the Teams table alike, so a tenant
 * with more than one page of teams must not have the rest silently dropped.
 */
async function fetchAllTeamObjects(): Promise<SettingsObject[]> {
  const all: SettingsObject[] = [];
  let nextPageKey: string | undefined;
  do {
    const response: { items?: SettingsObject[]; nextPageKey?: string | null } = nextPageKey
      ? await settingsObjectsClient.getSettingsObjects({ nextPageKey })
      : await settingsObjectsClient.getSettingsObjects({
          schemaIds: OWNERSHIP_TEAMS_SCHEMA_ID,
          scopes: OWNERSHIP_TEAMS_SCOPE,
          fields: "objectId,value,updateToken",
          pageSize: PAGE_SIZE,
        });
    all.push(...(response.items ?? []));
    nextPageKey = response.nextPageKey ?? undefined;
  } while (nextPageKey);
  return all;
}

/**
 * Reads the tenant's real, native team catalog via the classic Settings 2.0 API. Team
 * management (add/edit/delete) happens exclusively in native Dynatrace Settings — this app
 * only displays the catalog.
 */
export function useOwnershipTeams() {
  const [objects, setObjects] = useState<SettingsObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchAllTeamObjects()
      .then((items) => {
        if (cancelled) return;
        setObjects(items);
        setError(undefined);
      })
      .catch((fetchError: Error) => {
        if (!cancelled) setError(fetchError);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const teams: Team[] = objects.map(toTeam);

  return { teams, isLoading, error };
}
