import React, { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Flex, TitleBar } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import { Link } from "@dynatrace/strato-components/typography";
import {
  FilterField,
  type FilterFieldTree,
  type FilterFieldValidatorMap,
} from "@dynatrace/strato-components/filters";
import { DataTable, type DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { ExternalLinkIcon } from "@dynatrace/strato-icons";
import { getEnvironmentUrl } from "@dynatrace-sdk/app-environment";
import { PageHeaderBanner } from "../components/PageHeaderBanner";
import { TableRowLimitNotice } from "../components/TableRowLimitNotice";
import { extractSimpleFilters } from "../lib/filterField";
import { useEffortData } from "../lib/useEffortData";
import { MAX_TABLE_ROWS } from "../lib/types";
import {
  formatAdditionalInformation,
  formatContactDetails,
  formatLinks,
  formatResponsibilities,
  formatSupplementaryIdentifiers,
  getManageTeamsUrl,
  Team,
} from "../lib/teams";

export const Teams = () => {
  const { teams, isLoading } = useEffortData();

  const [filterValue, setFilterValue] = useState("");
  const [filterTree, setFilterTree] = useState<FilterFieldTree>(undefined);

  const manageTeamsUrl = useMemo(() => getManageTeamsUrl(getEnvironmentUrl()), []);

  const validatorMap = useMemo<FilterFieldValidatorMap>(
    () => ({
      keyPredicates: [
        { key: "Name", valueType: "String" },
        { key: "Identifier", valueType: "String" },
        { key: "Description", valueType: "String" },
      ],
      exhaustive: true,
    }),
    [],
  );

  const appliedFilters = useMemo(() => extractSimpleFilters(filterTree), [filterTree]);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const nameFilter = appliedFilters.Name?.trim().toLowerCase();
      if (nameFilter && !team.name.toLowerCase().includes(nameFilter)) return false;

      const identifierFilter = appliedFilters.Identifier?.trim().toLowerCase();
      if (identifierFilter && !team.identifier.toLowerCase().includes(identifierFilter)) return false;

      const descriptionFilter = appliedFilters.Description?.trim().toLowerCase();
      if (descriptionFilter && !(team.description ?? "").toLowerCase().includes(descriptionFilter)) return false;

      return true;
    });
  }, [teams, appliedFilters]);

  const columns = useMemo<DataTableColumnDef<Team>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessor: "name",
        cell: ({ rowData: team }) => (
          <Link as={RouterLink} to={`/teams/${encodeURIComponent(team.identifier)}`}>
            {team.name}
          </Link>
        ),
      },
      { id: "identifier", header: "Identifier", accessor: "identifier" },
      { id: "description", header: "Description", accessor: (team) => team.description ?? "" },
      {
        id: "supplementaryIdentifiers",
        header: "Supplementary identifiers",
        accessor: formatSupplementaryIdentifiers,
      },
      { id: "responsibilities", header: "Responsibilities", accessor: formatResponsibilities },
      { id: "contactDetails", header: "Contact details", accessor: formatContactDetails },
      { id: "links", header: "Links", accessor: formatLinks },
      { id: "additionalInformation", header: "Additional information", accessor: formatAdditionalInformation },
      { id: "externalId", header: "External ID", accessor: (team) => team.externalId ?? "—" },
    ],
    [],
  );

  return (
    <Flex flexDirection="column" padding={32} gap={24}>
      <PageHeaderBanner>
        <TitleBar>
          <TitleBar.Title>Teams</TitleBar.Title>
          <TitleBar.Subtitle>
            The team catalog is managed in native Dynatrace Settings. Link teams to monitored entities by
            referencing the team identifier in entity tags or metadata.
          </TitleBar.Subtitle>
          <TitleBar.Suffix>
            <Button
              variant="accent"
              color="primary"
              onClick={() => window.open(manageTeamsUrl, "_blank", "noopener,noreferrer")}
            >
              Manage in Settings
              <Button.Suffix>
                <ExternalLinkIcon />
              </Button.Suffix>
            </Button>
          </TitleBar.Suffix>
        </TitleBar>
      </PageHeaderBanner>

      <FilterField
        aria-label="Filter teams"
        value={filterValue}
        onChange={(value, tree) => {
          setFilterValue(value);
          setFilterTree(tree);
        }}
        validatorMap={validatorMap}
        autoSuggestions
      />

      <DataTable
        data={filteredTeams.slice(0, MAX_TABLE_ROWS)}
        columns={columns}
        sortable
        resizable
        fullWidth
        loading={isLoading}
      >
        <DataTable.Pagination />
      </DataTable>
      <TableRowLimitNotice total={filteredTeams.length} />
    </Flex>
  );
};
