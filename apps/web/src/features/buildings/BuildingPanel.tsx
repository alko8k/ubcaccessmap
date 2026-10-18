import { useRef } from "react";
import { ChevronRight, Clock, X } from "lucide-react";
import type { BuildingSummary, WashroomSummary } from "@ubc-access-map/shared";
import { factLabel, genderLabel } from "../../lib/filters.ts";
import { usePanel } from "../../lib/usePanel.ts";
import { FactIcon } from "../washrooms/FactIcon.tsx";

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
      <header className="panel-head">
        <span className="panel-head-label">Building</span>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close building">
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      <div className="panel-body panel-enter">
        <h2 id="building-heading" className="panel-title">
          {building.name}
        </h2>
        <ul className="meta-chips" aria-label="Details">
          {building.code && <li>{building.code}</li>}
          <li>
            {building.washroomCount} washroom{building.washroomCount === 1 ? "" : "s"}
          </li>
          {building.hours && (
            <li>
              <Clock aria-hidden="true" size={14} />
              {building.hours}
            </li>
          )}
        </ul>

        <ul className="fact-grid">
          <li data-state={building.stepFreeAccess}>
            <span className="fact-name">Step-free building access</span>
            <span className="fact-state">
              <FactIcon value={building.stepFreeAccess} />
              {factLabel(building.stepFreeAccess)}
            </span>
          </li>
        </ul>

        {building.washroomCount === 0 ? (
          <p className="empty-note">
            No washrooms are mapped in this building yet.
          </p>
        ) : washrooms.length === 0 ? (
          <p className="empty-note">
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
              <section className="floor-group" key={floor}>
                <h3 className="floor-title">Floor {floor}</h3>
                <ul className="result-list">
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
                        <span className="row-text">
                          <strong>{washroom.name}</strong>
                          <em>{genderLabel(washroom.genderType)}</em>
                        </span>
                        <ChevronRight aria-hidden="true" size={16} className="row-chevron" />
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
