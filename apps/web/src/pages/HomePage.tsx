import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ChevronRight, MapPinOff, X } from "lucide-react";
import { fetchMap } from "../api/client.ts";
import { AuthDialog } from "../features/auth/AuthDialog.tsx";
import { BuildingPanel } from "../features/buildings/BuildingPanel.tsx";
import { CampusMap } from "../features/map/CampusMap.tsx";
import { FilterBar } from "../features/map/FilterBar.tsx";
import { BottomSheet } from "../features/sheet/BottomSheet.tsx";
import { DetailPanel } from "../features/washrooms/DetailPanel.tsx";
import {
  activeFilterCount,
  defaultFilters,
  genderLabel,
  filtersFromSearch,
  mapQueryString,
  searchFromFilters,
} from "../lib/filters.ts";
import { useDocumentTitle } from "../lib/useDocumentTitle.ts";

const TIERS = ["S", "A", "B", "C", "D"] as const;

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromSearch(params.toString()), [params]);
  const selectedId = params.get("washroom") ?? undefined;
  const selectedBuildingId = params.get("building") ?? undefined;
  const [authOpen, setAuthOpen] = useState(false);
  const [locateMessage, setLocateMessage] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  useDocumentTitle();

  const mapQuery = useQuery({
    queryKey: ["map", mapQueryString(filters)],
    queryFn: () => fetchMap(mapQueryString(filters)),
  });

  function updateFilters(next: typeof filters) {
    const search = new URLSearchParams(searchFromFilters(next));
    if (selectedBuildingId) {
      search.set("building", selectedBuildingId);
    }
    if (selectedId) {
      search.set("washroom", selectedId);
    }
    setParams(search);
  }

  function selectWashroom(id: string) {
    const search = new URLSearchParams(searchFromFilters(filters));
    if (selectedBuildingId) {
      search.set("building", selectedBuildingId);
    }
    search.set("washroom", id);
    setParams(search);
  }

  function selectBuilding(id: string) {
    const search = new URLSearchParams(searchFromFilters(filters));
    search.set("building", id);
    setParams(search);
  }

  /** Closing a washroom steps back to its building rather than all the way out. */
  function clearWashroom() {
    const search = new URLSearchParams(searchFromFilters(filters));
    if (selectedBuildingId) {
      search.set("building", selectedBuildingId);
    }
    setParams(search);
  }

  function clearBuilding() {
    setParams(new URLSearchParams(searchFromFilters(filters)));
  }

  function clearFilters() {
    updateFilters({ ...defaultFilters });
  }

  /*
   * The nav's sign-in link opens the dialog through ?signin=1, so closing has
   * to drop that parameter too, or the dialog reopens on the next render.
   */
  function closeAuth() {
    setAuthOpen(false);
    if (params.get("signin") === "1") {
      const search = new URLSearchParams(params);
      search.delete("signin");
      setParams(search, { replace: true });
    }
  }

  const washrooms = mapQuery.data?.washrooms ?? [];
  const buildings = mapQuery.data?.buildings ?? [];
  const selectedBuilding = buildings.find((building) => building.id === selectedBuildingId);
  const mappedBuildings = buildings.filter((building) => building.washroomCount > 0).length;
  const activeFilters = activeFilterCount(filters);
  const narrowedBy = [filters.q && "that search", activeFilters > 0 && "these filters"]
    .filter(Boolean)
    .join(" and ");

  const panel = selectedId ? (
    <DetailPanel
      key={selectedId}
      washroomId={selectedId}
      onClose={clearWashroom}
      onNeedAuth={() => setAuthOpen(true)}
    />
  ) : (
    selectedBuilding && (
      <BuildingPanel
        building={selectedBuilding}
        washrooms={washrooms.filter((washroom) => washroom.buildingId === selectedBuilding.id)}
        selectedWashroomId={selectedId}
        onSelectWashroom={selectWashroom}
        onClose={clearBuilding}
      />
    )
  );

  const resultsHeader = (
    <div className="results-head">
      <div>
        <p className="result-count" aria-live="polite">
          {mapQuery.isSuccess
            ? `${washrooms.length}${narrowedBy ? " matching" : ""} washroom${washrooms.length === 1 ? "" : "s"}`
            : "Loading washrooms…"}
        </p>
        {buildings.length > 0 && (
          <p className="result-sub">
            {mappedBuildings} of {buildings.length} buildings mapped
          </p>
        )}
      </div>
      <ul className="tier-legend" aria-label="Community rank tiers, best to worst">
        {TIERS.map((letter) => (
          <li key={letter} className={`rank rank-${letter}`}>
            {letter}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={panel ? "map-page has-panel" : "map-page"}>
      <a className="skip-link" href="#results">
        Skip to results
      </a>
      <h1 className="sr-only">Find a washroom on campus</h1>

      <CampusMap
        buildings={buildings}
        washrooms={washrooms}
        selectedWashroomId={selectedId}
        selectedBuildingId={selectedBuildingId}
        onSelectWashroom={selectWashroom}
        onSelectBuilding={selectBuilding}
        onLocateError={setLocateMessage}
      />

      <div className="explore">
        <div className="explore-top">
          <FilterBar filters={filters} onChange={updateFilters} />
        </div>

        <BottomSheet
          label="washroom list"
          className="results-sheet"
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          peek={resultsHeader}
        >
          <div id="results">
            {mapQuery.isLoading && (
              <ul className="result-list" aria-label="Loading washrooms">
                {[0, 1, 2, 3, 4].map((row) => (
                  <li key={row} className="skeleton-row" aria-hidden="true">
                    <span className="skeleton skeleton--badge" />
                    <span className="skeleton skeleton--text" />
                  </li>
                ))}
              </ul>
            )}
            {mapQuery.isError && (
              <div role="alert" className="empty-state">
                <p>Couldn’t load washrooms right now.</p>
                <button type="button" className="btn" onClick={() => void mapQuery.refetch()}>
                  Try again
                </button>
              </div>
            )}
            {mapQuery.isSuccess && washrooms.length === 0 && (
              <div className="empty-state">
                <MapPinOff aria-hidden="true" size={28} />
                <p>
                  {narrowedBy
                    ? `No mapped washrooms match ${narrowedBy}.`
                    : "No washrooms are mapped yet."}
                </p>
                {narrowedBy && (
                  <button type="button" className="btn" onClick={clearFilters}>
                    Clear search and filters
                  </button>
                )}
              </div>
            )}
            {washrooms.length > 0 && (
              <ul className="result-list">
                {washrooms.map((washroom) => (
                  <li key={washroom.id}>
                    <button
                      type="button"
                      className={washroom.id === selectedId ? "selected" : undefined}
                      onClick={() => selectWashroom(washroom.id)}
                    >
                      <span className={`rank rank-${washroom.rankLetter ?? "none"}`}>
                        {washroom.rankLetter ?? "—"}
                      </span>
                      <span className="row-text">
                        <strong>{washroom.name}</strong>
                        <em>
                          {washroom.buildingName} · Floor {washroom.floor} ·{" "}
                          {genderLabel(washroom.genderType)}
                        </em>
                      </span>
                      <ChevronRight aria-hidden="true" size={16} className="row-chevron" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </BottomSheet>
      </div>

      {locateMessage && (
        <div role="status" className="toast">
          <p>{locateMessage}</p>
          <button
            type="button"
            className="icon-btn"
            aria-label="Dismiss"
            onClick={() => setLocateMessage(null)}
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      )}

      {panel && <div className="detail-card">{panel}</div>}

      <AuthDialog open={authOpen || params.get("signin") === "1"} onClose={closeAuth} />
    </div>
  );
}
