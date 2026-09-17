import React, { createContext, useContext, useMemo, useState } from "react";
import type { Timeframe } from "@dynatrace/strato-components/core";
import {
  DEFAULT_TIMEFRAME_VALUE,
  DqlTimeframe,
  ResolvedTimeframe,
  defaultResolvedTimeframe,
  toDqlTimeframe,
  toResolvedTimeframe,
} from "./timeframe";

type SharedTimeframeContextValue = {
  /** Raw TimeframeSelector onChange value; null until the user changes it from the app-wide default. */
  timeframe: Timeframe | null;
  setTimeframe: (value: Timeframe | null) => void;
};

const SharedTimeframeContext = createContext<SharedTimeframeContextValue | undefined>(undefined);

/**
 * Wraps the app's Routes (see App.tsx) so every page/sub-page shares one selected timeframe —
 * navigating away and back keeps whatever the user last picked, instead of each page resetting
 * to DEFAULT_TIMEFRAME_VALUE on mount.
 */
export const SharedTimeframeProvider = ({ children }: { children: React.ReactNode }) => {
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);
  const value = useMemo(() => ({ timeframe, setTimeframe }), [timeframe]);
  return <SharedTimeframeContext.Provider value={value}>{children}</SharedTimeframeContext.Provider>;
};

/**
 * Gives a page everything it needs to wire up a `<TimeframeSelector>` against the app-wide shared
 * timeframe: a controlled `value`, an `onChange`, and the value pre-converted to the DQL/resolved
 * shapes most pages need for querying and chart bucketing.
 */
export function useSharedTimeframe() {
  const ctx = useContext(SharedTimeframeContext);
  if (!ctx) throw new Error("useSharedTimeframe must be used within a SharedTimeframeProvider");
  const { timeframe, setTimeframe } = ctx;

  const dqlTimeframe = useMemo<DqlTimeframe>(() => toDqlTimeframe(timeframe), [timeframe]);
  const resolvedTimeframe = useMemo<ResolvedTimeframe>(
    () => (timeframe ? toResolvedTimeframe(timeframe) : defaultResolvedTimeframe()),
    [timeframe],
  );

  return {
    /** Feed directly to TimeframeSelector's `value` prop. */
    selectorValue: timeframe ?? DEFAULT_TIMEFRAME_VALUE,
    /** Feed directly to TimeframeSelector's `onChange` prop. */
    onChange: setTimeframe,
    dqlTimeframe,
    resolvedTimeframe,
  };
}
