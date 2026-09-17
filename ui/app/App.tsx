import { PageLayout } from "@dynatrace/strato-components/layouts";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Overview } from "./pages/Overview";
import { Teams } from "./pages/Teams";
import { TeamDetail } from "./pages/TeamDetail";
import { TeamProblems } from "./pages/TeamProblems";
import { TeamEntities } from "./pages/TeamEntities";
import { Entities } from "./pages/Entities";
import { ImportTeams } from "./pages/ImportTeams";
import { FunctionDebug } from "./pages/FunctionDebug";
import { Header } from "./components/Header";
import { SharedTimeframeProvider } from "./lib/useSharedTimeframe";

export const App = () => {
  return (
    <PageLayout>
      <PageLayout.Header>
        <Header />
      </PageLayout.Header>
      <PageLayout.Content>
        <SharedTimeframeProvider>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:teamId" element={<TeamDetail />} />
            <Route path="/teams/:teamId/problems" element={<TeamProblems />} />
            <Route path="/teams/:teamId/entities" element={<TeamEntities />} />
            <Route path="/import-teams" element={<ImportTeams />} />
            <Route path="/entities" element={<Entities />} />
            <Route path="/function-debug" element={<FunctionDebug />} />
          </Routes>
        </SharedTimeframeProvider>
      </PageLayout.Content>
    </PageLayout>
  );
};
