import { useEffect, useState } from "react";
import { buildFitlRouteSearchString, normalizeFitlRouteSearch } from "../domain/fitlGraph.js";
import type { FitlRouteSearch } from "../domain/fitlGraphTypes.js";
import { fitlGraphSnapshot } from "../generated/fitlGraphSnapshot.js";
import { FitlMapExplorer, mergeRouteState } from "../presentation/FitlMapExplorer.js";

function readWindowRouteState(): FitlRouteSearch {
  if (typeof window === "undefined") {
    return normalizeFitlRouteSearch({});
  }
  return normalizeFitlRouteSearch(window.location.search);
}

function writeWindowRouteState(state: FitlRouteSearch) {
  if (typeof window === "undefined") return;
  const query = buildFitlRouteSearchString(state);
  const nextUrl = query.length > 0 ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(window.history.state, "", nextUrl);
}

export function FitlMapPage() {
  const [routeState, setRouteState] = useState<FitlRouteSearch>(() => readWindowRouteState());

  useEffect(() => {
    writeWindowRouteState(routeState);
  }, [routeState]);

  useEffect(() => {
    const onPopState = () => {
      setRouteState(readWindowRouteState());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <FitlMapExplorer
      snapshot={fitlGraphSnapshot}
      routeState={routeState}
      onRouteStateChange={(next) => setRouteState((current) => mergeRouteState(current, next))}
    />
  );
}
