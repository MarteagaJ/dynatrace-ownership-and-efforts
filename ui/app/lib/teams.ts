import type { SettingsObject } from "@dynatrace-sdk/client-classic-environment-v2";
import { TeamId } from "./types";

export const OWNERSHIP_TEAMS_SCHEMA_ID = "builtin:ownership.teams";
export const OWNERSHIP_TEAMS_SCOPE = "environment";

export type TeamResponsibilities = {
  development: boolean;
  security: boolean;
  operations: boolean;
  infrastructure: boolean;
  lineOfBusiness: boolean;
};

export type TeamContactDetail = {
  integrationType: "JIRA" | "EMAIL" | "MS_TEAMS" | "SLACK";
  email?: string;
  msTeams?: string;
  slackChannel?: string;
  url?: string;
  jira?: { project?: string; defaultAssignee?: string };
};

export type TeamLink = {
  linkType: "DOCUMENTATION" | "RUNBOOK" | "WIKI" | "DASHBOARD" | "HEALTH_APP" | "URL" | "REPOSITORY";
  url?: string;
};

export type TeamAdditionalInformation = {
  key?: string;
  value?: string;
  url?: string;
};

/** The full shape of Dynatrace's builtin:ownership.teams schema value, as read for display. */
export type Team = {
  objectId: string;
  updateToken?: string;
  name: string;
  identifier: TeamId;
  description?: string;
  supplementaryIdentifiers: string[];
  responsibilities: TeamResponsibilities;
  contactDetails: TeamContactDetail[];
  links: TeamLink[];
  additionalInformation: TeamAdditionalInformation[];
  externalId?: string;
};

type RawTeamValue = {
  name?: string;
  identifier?: string;
  description?: string;
  supplementaryIdentifiers?: { supplementaryIdentifier?: string }[];
  responsibilities?: Partial<TeamResponsibilities>;
  contactDetails?: TeamContactDetail[];
  links?: TeamLink[];
  additionalInformation?: TeamAdditionalInformation[];
  externalId?: string;
};

const NO_RESPONSIBILITIES: TeamResponsibilities = {
  development: false,
  security: false,
  operations: false,
  infrastructure: false,
  lineOfBusiness: false,
};

export function toTeam(raw: SettingsObject): Team {
  const value = (raw.value ?? {}) as RawTeamValue;
  return {
    objectId: raw.objectId ?? "",
    updateToken: raw.updateToken,
    name: value.name ?? value.identifier ?? "",
    identifier: value.identifier ?? "",
    description: value.description,
    supplementaryIdentifiers: (value.supplementaryIdentifiers ?? [])
      .map((s) => s.supplementaryIdentifier)
      .filter((id): id is string => Boolean(id)),
    responsibilities: { ...NO_RESPONSIBILITIES, ...value.responsibilities },
    contactDetails: value.contactDetails ?? [],
    links: value.links ?? [],
    additionalInformation: value.additionalInformation ?? [],
    externalId: value.externalId,
  };
}

const RESPONSIBILITY_LABELS: Record<keyof TeamResponsibilities, string> = {
  development: "Development",
  security: "Security",
  operations: "Operations",
  infrastructure: "Infrastructure",
  lineOfBusiness: "Line of business",
};

export function formatResponsibilities(team: Team): string {
  const active = (Object.keys(RESPONSIBILITY_LABELS) as (keyof TeamResponsibilities)[]).filter(
    (key) => team.responsibilities[key],
  );
  return active.length > 0 ? active.map((key) => RESPONSIBILITY_LABELS[key]).join(", ") : "—";
}

export function formatSupplementaryIdentifiers(team: Team): string {
  return team.supplementaryIdentifiers.length > 0 ? team.supplementaryIdentifiers.join(", ") : "—";
}

function formatContactDetail(contact: TeamContactDetail): string {
  const value = contact.email ?? contact.slackChannel ?? contact.msTeams ?? contact.url ?? contact.jira?.project;
  return value ? `${contact.integrationType}: ${value}` : contact.integrationType;
}

export function formatContactDetails(team: Team): string {
  return team.contactDetails.length > 0 ? team.contactDetails.map(formatContactDetail).join(", ") : "—";
}

function formatLink(link: TeamLink): string {
  return link.url ? `${link.linkType}: ${link.url}` : link.linkType;
}

export function formatLinks(team: Team): string {
  return team.links.length > 0 ? team.links.map(formatLink).join(", ") : "—";
}

function formatAdditionalInfoEntry(info: TeamAdditionalInformation): string {
  return [info.key, info.value].filter(Boolean).join(": ") || info.url || "";
}

export function formatAdditionalInformation(team: Team): string {
  const entries = team.additionalInformation.map(formatAdditionalInfoEntry).filter(Boolean);
  return entries.length > 0 ? entries.join(", ") : "—";
}

const OWNERSHIP_TEAMS_SETTINGS_APP_ID = "dynatrace.settings";
const OWNERSHIP_TEAMS_SETTINGS_PATH = "settings/ownership-teams";

/** Deep link into the native Settings app's Ownership > Teams page. */
export function getManageTeamsUrl(environmentUrl: string): string {
  return `${environmentUrl.replace(/\/+$/, "")}/ui/apps/${OWNERSHIP_TEAMS_SETTINGS_APP_ID}/${OWNERSHIP_TEAMS_SETTINGS_PATH}`;
}
