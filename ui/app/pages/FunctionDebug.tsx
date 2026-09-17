import React, { useState } from "react";
import { Flex, TitleBar } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import { Paragraph } from "@dynatrace/strato-components/typography";

/**
 * TEMPORARY diagnostic page — calls the function directly over its raw relative URL so the
 * actual thrown error/stack is visible, instead of the generic "Function ... failed" wrapper a
 * Workflow's functions.call() surfaces. Delete this file and its route in App.tsx once done.
 */
export const FunctionDebug = () => {
  const [log, setLog] = useState<string>("");
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setLog("");
    try {
      const response = await fetch("/api/regenerate-entity-team-assignments", { method: "POST" });
      const text = await response.text();
      setLog(`HTTP ${response.status} ${response.statusText}\n\n${text}`);
    } catch (e) {
      setLog(`fetch threw: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Flex flexDirection="column" padding={32} gap={16}>
      <TitleBar>
        <TitleBar.Title>Function debug (temporary)</TitleBar.Title>
      </TitleBar>
      <Button onClick={() => void run()} disabled={running} width="content">
        Run regenerate-entity-team-assignments
      </Button>
      <Paragraph style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>{log}</Paragraph>
    </Flex>
  );
};
