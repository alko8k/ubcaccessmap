import { useRef } from "react";
import type { BuildingSummary, WashroomSummary } from "@ubc-access-map/shared";
import { factLabel, genderLabel } from "../../lib/filters.ts";
import { usePanel } from "../../lib/usePanel.ts";

type Props = {
  building: BuildingSummary;
  washrooms: WashroomSummary[];
  selectedWashroomId?: string;
  onSelectWashroom: (id: string) => void;
  onClose: () => void;
};

/**
 * Floors arrive as free text ("2", "B1", "Ground"), so numbered floors sort
 * numerically and descend, and anything unparseable falls to the bottom in
 * alphabetical order.
 */
function floorRank(floor: string): [number, number, string] {
  const numeric = Number.parseInt(floor, 10);
  if (!Number.isNaN(numeric)) {
    const basement = /^b/i.test(floor.trim());
    return [0, basement ? -numeric : -Math.abs(numeric), floor];
  }
  return [1, 0, floor.toLowerCase()];
}

function groupByFloor(washrooms: WashroomSummary[]) {
  const floors = new Map<string, WashroomSummary[]>();
  for (const washroom of washrooms) {
    const existing = floors.get(washroom.floor);
    if (existing) {
      existing.push(washroom);
    } else {
      floors.set(washroom.floor, [washroom]);
    }
  }

  return [...floors.entries()].sort(([a], [b]) => {
    const [aGroup, aNumber, aLabel] = floorRank(a);
    const [bGroup, bNumber, bLabel] = floorRank(b);
    return aGroup - bGroup || aNumber - bNumber || aLabel.localeCompare(bLabel);
  });
}

export function BuildingPanel({
  building,
  washrooms,
  selectedWashroomId,
  onSelectWashroom,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLElement | null>(null);
  usePanel(panelRef, building.id, onClose);
  const floors = groupByFloor(washrooms);
  const hidden = building.washroomCount - washrooms.length;

  return (
    <section className="panel" aria-labelledby="building-heading" tabIndex={-1} ref={panelRef}>
      <div className="panel-head">
        <p className="eyebrow">{building.code ?? "Building"}</p>
        <button type="button" className="text-btn panel-close" onClick={onClose} aria-label="Close building">
          Close
        </button>
      </div>

      <div className="panel-body">
        <h2 id="building-heading">{building.name}</h2>
        <p className="meta">
          {building.washroomCount} washroom{building.washroomCount === 1 ? "" : "s"}
          {building.hours ? ` · ${building.hours}` : ""}
        </p>

        <ul className="fact-list">
          <li>
            <span>Step-free building access</span>
            <b data-state={building.stepFreeAccess}>{factLabel(building.stepFreeAccess)}</b>
          </li>
        </ul>

        {building.washroomCount === 0 ? (
          <p className="hint">
            No washrooms are mapped in this building yet. Verified UBC accounts can add them.
          </p>
        ) : washrooms.length === 0 ? (
          <p className="hint">
            All {building.washroomCount} washroom{building.washroomCount === 1 ? "" : "s"} in this
            building are hidden by your current filters.
          </p>
        ) : (
          <>
            {hidden > 0 && (
              <p className="hint">
                {hidden} more washroom{hidden === 1 ? " is" : "s are"} hidden by your filters.
              </p>
            )}

            {floors.map(([floor, floorWashrooms]) => (
              <section className="panel-section" key={floor}>
                <h3 className="group-label">Floor {floor}</h3>
                <ul className="result-list result-list--panel">
                  {floorWashrooms.map((washroom) => (
                    <li key={washroom.id}>
                      <button
                        type="button"
                        className={washroom.id === selectedWashroomId ? "selected" : undefined}
                        onClick={() => onSelectWashroom(washroom.id)}
                      >
                        <span className={`rank rank-${washroom.rankLetter ?? "none"}`}>
                          {washroom.rankLetter ?? "—"}
                        </span>
                        <span>
                          <strong>{washroom.name}</strong>
                          <em>{genderLabel(washroom.genderType)}</em>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
