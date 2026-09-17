import React, { useState } from "react";
import { Button } from "@dynatrace/strato-components/buttons";
import { DQLEditor } from "@dynatrace/strato-components/editors";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Text } from "@dynatrace/strato-components/typography";
import { ChevronUpIcon, CodeIcon } from "@dynatrace/strato-icons";

export type NamedQuery = { label: string; query: string };

type QueryDisclosureProps = {
  /** One entry per underlying DQL query behind the visualization above this control. */
  queries: NamedQuery[];
};

/** A small "Show query" toggle that reveals the read-only DQL powering the visualization above it. */
export const QueryDisclosure = ({ queries }: QueryDisclosureProps) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <Button size="condensed" onClick={() => setIsVisible(true)}>
        <Button.Prefix>
          <CodeIcon />
        </Button.Prefix>
        Show query
      </Button>
    );
  }

  return (
    <Flex flexDirection="column" gap={8}>
      {queries.map(({ label, query }) => (
        <Flex key={label} flexDirection="column" gap={4}>
          {queries.length > 1 && <Text>{label}</Text>}
          <DQLEditor defaultValue={query} readOnly size="condensed">
            <DQLEditor.ActionsMenu />
          </DQLEditor>
        </Flex>
      ))}
      <Button size="condensed" onClick={() => setIsVisible(false)} width="content">
        <Button.Prefix>
          <ChevronUpIcon />
        </Button.Prefix>
        Hide query
      </Button>
    </Flex>
  );
};
