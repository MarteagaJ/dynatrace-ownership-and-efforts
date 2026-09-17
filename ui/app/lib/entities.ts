import type { IntentPayload, SendIntentOptions } from "@dynatrace-sdk/navigation";
import { EntityKind, EntitySummary, ProblemRecord } from "./types";

export function toEntitySummary(raw: Record<string, unknown>): EntitySummary {
  return {
    id: String(raw.id),
    name: (raw.name as string) ?? String(raw.id),
    entityType: raw.entityType as EntityKind,
    tags: (raw.tags as string[]) ?? [],
    smartscapeType: raw.type as string | undefined,
    lifetime: raw.lifetime as { start: string; end: string } | undefined,
    securityContext: (raw["dt.security_context"] as string[]) ?? [],
    softwareTechnologies: (raw.softwareTechnologies as string[]) ?? [],
    classicEntityId: raw.id_classic as string | undefined,
  };
}

/**
 * A single dt.entity.* property holding the entity ID — the older, per-entity-kind intent
 * contract. The key itself (e.g. "dt.entity.application") names a classic entity type, so the
 * value must be the classic ID (`entity.classicEntityId`), not the Smartscape node ID.
 */
type DtEntityIntentConfig = {
  shape: "dt-entity";
  key: string;
  recommendedAppId: string;
  recommendedIntentId: string;
};

/**
 * The generic Smartscape node record itself ({id, type, name, lifetime}) as the payload — the
 * newer "view-entity-dt.smartscape.*" intent contract, confirmed for Kubernetes deployments by
 * watching the network tab while using the native "Go to Kubernetes deployment" context menu
 * action on a smartscapeNodes record in Notebooks.
 */
type SmartscapeEntityIntentConfig = {
  shape: "smartscape-entity";
  recommendedAppId: string;
  recommendedIntentId: string;
};

type EntityIntentConfig = DtEntityIntentConfig | SmartscapeEntityIntentConfig;

/**
 * Confirmed by watching the network tab while using each entity kind's native "Open with"/context
 * menu action in a live tenant (Notebooks, on smartscapeNodes records) — not documented anywhere,
 * so re-verify against the target tenant if these ever stop resolving.
 * Service is inferred (not yet directly confirmed) to share Host/Kubernetes deployment's
 * generic Smartscape-entity shape, based on its matching intent ID naming pattern. Web application
 * is the one kind still unconfirmed either way — its "view-application" intent ID doesn't match
 * this naming pattern, so it may genuinely be a different, dt.entity.application-keyed contract.
 */
const ENTITY_KIND_TO_INTENT: Record<EntityKind, EntityIntentConfig> = {
  Host: {
    shape: "smartscape-entity",
    recommendedAppId: "dynatrace.infraops",
    recommendedIntentId: "view_host",
  },
  Service: {
    shape: "smartscape-entity",
    recommendedAppId: "dynatrace.services",
    recommendedIntentId: "view-entity-dt.smartscape.service",
  },
  "Kubernetes deployment": {
    shape: "smartscape-entity",
    recommendedAppId: "dynatrace.kubernetes",
    recommendedIntentId: "view-entity-dt.smartscape.k8s_deployment",
  },
  "Web application": {
    shape: "dt-entity",
    key: "dt.entity.application",
    recommendedAppId: "dynatrace.classic.frontend",
    recommendedIntentId: "view-application",
  },
  /**
   * Generic frontends (e.g. mobile) have no classic Application entity and no dedicated viewer
   * app — confirmed by their Notebooks context menu offering only "View topology"/"Go to
   * Settings", no "Go to [app]" action. "Go to Settings" is the only real action available.
   */
  Frontend: {
    shape: "smartscape-entity",
    recommendedAppId: "dynatrace.settings",
    recommendedIntentId: "open_settings_for_platform_entity_id",
  },
};

/** Builds the "Open with" intent for an entity, targeting the confirmed native app directly with its Smartscape node ID. */
export function buildEntityIntentPayload(
  entity: EntitySummary,
): { payload: IntentPayload; options: SendIntentOptions<IntentPayload> } {
  const config = ENTITY_KIND_TO_INTENT[entity.entityType];
  const payload: IntentPayload =
    config.shape === "smartscape-entity"
      ? { id: entity.id, type: entity.smartscapeType, name: entity.name, lifetime: entity.lifetime }
      : { [config.key]: entity.classicEntityId };
  return {
    payload,
    options: { recommendedAppId: config.recommendedAppId, recommendedIntentId: config.recommendedIntentId },
  };
}

/**
 * Builds the "Open Problem" intent for a Davis problem, targeting the Problems app directly.
 * Confirmed by watching the network tab while using the native "View problem details in the
 * problems app" context menu action on a dt.davis.problems record in Notebooks — the payload is
 * keyed by event.id (not display_id) alongside the constant event.kind "DAVIS_PROBLEM".
 */
export function buildProblemIntentPayload(
  problem: ProblemRecord,
): { payload: IntentPayload; options: SendIntentOptions<IntentPayload> } {
  return {
    payload: { "event.id": problem.eventId, "event.kind": "DAVIS_PROBLEM" },
    options: { recommendedAppId: "dynatrace.davis.problems", recommendedIntentId: "view-problem" },
  };
}
