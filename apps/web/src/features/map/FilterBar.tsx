import { useState } from "react";
import { activeFilterCount, defaultFilters, type FilterState } from "../../lib/filters.ts";

const checkboxFilters: Array<{ key: keyof FilterState; label: string }> = [
  { key: "stepFreeBuildingAccess", label: "Step-free building" },
  { key: "accessibleStall", label: "Accessible stall" },
  { key: "grabBars", label: "Grab bars" },
  { key: "automaticDoor", label: "Automatic door" },
  { key: "elevatorAccess", label: "Elevator access" },
  { key: "changingTable", label: "Changing table" },
];

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

export function FilterBar({ filters, onChange }: Props) {
  // Only consulted on narrow screens, where the refinements would otherwise
  // push the map below the fold. On desktop the CSS always shows them.
  const [expanded, setExpanded] = useState(false);
  const active = activeFilterCount(filters);

  return (
    <form className="filter-bar" onSubmit={(event) => event.preventDefault()}>
      <div className="filter-search">
        <label htmlFor="campus-search">Search campus</label>
        <input
          id="campus-search"
          type="search"
          value={filters.q}
          placeholder="Building name or code, e.g. Nest or IBLC"
          onChange={(event) => onChange({ ...filters, q: event.target.value })}
        />
      </div>

      <div className="filter-actions">
        <button
          type="button"
          className="filter-toggle"
          aria-expanded={expanded}
          aria-controls="filter-refinements"
          onClick={() => setExpanded((value) => !value)}
        >
          Filters{active > 0 ? ` (${active})` : ""}
        </button>
        {active > 0 && (
          <button
            type="button"
            className="text-btn"
            onClick={() => onChange({ ...defaultFilters, q: filters.q })}
          >
            Clear filters
          </button>
        )}
      </div>

      <div
        id="filter-refinements"
        className={expanded ? "filter-refinements is-open" : "filter-refinements"}
      >

        <section className="filter-group">
          <h2 className="group-label">Refine</h2>
          <div className="filter-selects">
          <label>
            Community rank
            <select
              value={filters.rank}
              onChange={(event) =>
                onChange({ ...filters, rank: event.target.value as FilterState["rank"] })
              }
            >
              <option value="">Any rank</option>
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </label>
          <label>
            Room type
            <select
              value={filters.genderType}
              onChange={(event) =>
                onChange({
                  ...filters,
                  genderType: event.target.value as FilterState["genderType"],
                })
              }
            >
              <option value="">Any type</option>
              <option value="all_gender">All-gender</option>
              <option value="private">Private / single occupancy</option>
              <option value="womens">Women’s</option>
              <option value="mens">Men’s</option>
            </select>
          </label>
          </div>
        </section>

        <section className="filter-group">
          <h2 className="group-label">Tiers</h2>
          <ul className="tier-legend" aria-label="Rank tiers, best to worst">
            {(["S", "A", "B", "C", "D"] as const).map((letter) => (
              <li key={letter}>
                <span aria-hidden="true" />
                {letter}
              </li>
            ))}
          </ul>
          <p className="clickable-key">
            <span aria-hidden="true" />
            Outlined buildings open a washroom list. Colour shows their best tier.
          </p>
        </section>

        <fieldset className="filter-group">
          <legend className="group-label">Accessibility facts</legend>
          <p className="hint">Documented attributes, not community scores.</p>
          <div className="filter-checks">
            {checkboxFilters.map((filter) => (
              <label key={filter.key} className="check">
                <input
                  type="checkbox"
                  checked={Boolean(filters[filter.key])}
                  onChange={(event) =>
                    onChange({ ...filters, [filter.key]: event.target.checked })
                  }
                />
                {filter.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </form>
  );
}
