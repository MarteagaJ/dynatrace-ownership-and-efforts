# Ownership & Efforts

A Dynatrace App (built on **AppEngine**) that helps customers attribute Dynatrace Intelligence problems and monitored entities to the teams responsible for them, and surfaces the resulting reliability metrics — MTTR, problem volume, auto-remediation activity — per team.

## Why this app exists

Most Dynatrace customers can tag entities with an owning team, but there's no built-in way to see whether that tagging is actually happening, or to roll problems and entities up into team-level performance metrics. This app closes that gap: it gives teams (and the platform admins who support them) a place to see their own ownership coverage and operational performance, and it gives customers a concrete way to see the business value of platform usage — faster incident response, lower MTTR — tied back to the teams doing the work.

This goes beyond what a static dashboard or a segment can do, because ownership here isn't just a filter on existing tags — the app can also resolve ownership through an overrides lookup table for entities that aren't tagged at the source, and it tracks trends and drill-downs (per-team problem history, entity inventories, workflow participation) as first-class, navigable views rather than fixed dashboard tiles.

Most customers already have their team and ownership structure defined somewhere else — an HR/identity system, a service catalog, or an internal spreadsheet — and shouldn't have to redefine it by hand in Dynatrace. To that end, the app can also import existing team metadata and configuration from external sources such as Microsoft Entra ID or ServiceNow, or from any dataset that matches a valid JSON schema, and use it to populate the native Dynatrace team catalog.

**Status:** this is an early/internal prototype, first demoed 2026-09-17. Scope and messaging are still being narrowed based on that feedback (see [Roadmap](#roadmap-known-gaps) below) — it has not yet been decided whether this ships as a customer-facing app or a Hub listing.

## Support

This is a **custom Dynatrace App**, not an official Dynatrace product feature. It is **not covered by official Dynatrace Support** — there's no SLA, and Dynatrace Support will not troubleshoot it. Issues, questions, or requests should go to the app's author/maintainer (see repo contributors) rather than a support ticket.

## What it does

- **Overview** — top-line metrics: problems in the selected time range, unassigned problems, and how many teams are tracked.
- **Teams** — a catalog of teams configured via the native Dynatrace team catalog (`builtin:ownership.teams` settings object).
- **Team detail / Team problems / Team entities** — drill into a single team to see the entities it owns, the Dynatrace Intelligence problems attributed to it, MTTR, and open vs. closed issue counts over a chosen timeframe.
- **Entities** — a cross-team view of monitored entities (services, hosts, Kubernetes workloads, etc.) and their ownership status, useful for finding gaps in tagging coverage. *(Access to this tab is expected to be restricted or hidden in a future revision — see Roadmap.)*
- **Import Teams** — scaffolding to pull team/ownership data in from external sources such as ServiceNow or Microsoft Entra ID, so customers don't have to set up ownership by hand.
- Per-problem drill-down showing severity, related auto-remediation workflow executions, and team discussion/participation.

Underneath, the app reads Dynatrace Intelligence problems and Smartscape topology from **Grail** via DQL, reads/writes the team catalog through the Settings API, and uses a Grail Resource Store lookup file plus a scheduled function to maintain an entity-to-team override table for entities that aren't tagged at the source (a "central tagging" style override, intended for internal/CSE use rather than general customer use — see `api/regenerate-entity-team-assignments.function.ts`).

## How it's built

- **UI**: TypeScript + React, using Dynatrace's Strato Design System for components and design tokens ([ui/app](ui/app)).
- **Backend**: serverless functions running in the Dynatrace JavaScript runtime ([api](api)), used here to regenerate the entity-team assignment lookup file on a schedule.
- **Data access**: Grail queried via DQL (Dynatrace Intelligence problems, Smartscape entities, Automation Engine events), plus the Settings API (team catalog) and the Grail Resource Store (lookup files) via the relevant `@dynatrace-sdk/client-*` packages and `@dynatrace-sdk/react-hooks`.
- **Tooling**: scaffolded and managed with the Dynatrace App Toolkit (`dt-app`).

Required scopes and why each is needed are listed in [app.config.json](app.config.json).

## Development

This project was bootstrapped with the Dynatrace App Toolkit and uses the standard `dt-app` scripts:

```bash
npm run start
```
Runs the app in development mode against the environment configured in `app.config.json`, with hot reload.

```bash
npm run build
```
Builds the app for production into the `dist` folder.

```bash
npm run deploy
```
Builds and deploys the app to the environment configured in `app.config.json` (typically a ~5-10 minute process end to end).

```bash
npm run uninstall
```
Uninstalls the app from the configured environment.

```bash
npm run create:function
```
Scaffolds a new serverless function in `api`.

```bash
npm run test:api
```
Runs the Jest test suite for the backend functions in `api`.

```bash
npm run lint
```
Runs ESLint over the project.

```bash
npm run update
```
Updates `@dynatrace`-scoped packages to their latest versions and applies any automatic migrations.

```bash
npm run info
```
Outputs CLI and environment information.

See [AGENTS.md](AGENTS.md) for conventions used in this codebase (Strato component usage, DQL patterns, routing/breadcrumb structure, etc.) — this file also doubles as the instructions consumed by AI coding agents working in this repo.

## Roadmap / known gaps

Based on demo feedback, the near-term priorities are:
- Narrow the app's scope and clarify its problem statement/messaging.
- Add an introductory page explaining the app's purpose, usage, and the data it presents.
- Restrict or hide the **Entities** tab and the ownership-override ("central tagging") functionality, since overriding metadata centrally rather than enriching it at the source runs counter to recommended practice — this is intended as an internal/CSE capability, not something exposed to customers.
- Evaluate packaging/distribution via the Dynatrace Hub, to make it easier for CSEs to deploy to customer environments.

## Learn more

- [Dynatrace Developer portal](https://developer.dynatrace.com/) — Dynatrace Apps, AppEngine, Strato, and platform service documentation.
- [React documentation](https://reactjs.org/) — for the UI framework.
