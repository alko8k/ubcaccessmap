import { Check, ChevronDown, Search, X } from "lucide-react";
import { activeFilterCount, defaultFilters, type FilterState } from "../../lib/filters.ts";

const factFilters: Array<{ key: keyof FilterState; label: string }> = [
  { key: "stepFreeBuildingAccess", label: "Step-free" },
  { key: "accessibleStall", label: "Accessible stall" },
  { key: "grabBars", label: "Grab bars" },
  { key: "automaticDoor", label: "Automatic door" },
  { key: "elevatorAccess", label: "Elevator" },
  { key: "changingTable", label: "Changing table" },
];

type Props = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

export function FilterBar({ filters, onChange }: Props) {
  const active = activeFilterCount(filters);

  return (
    <div className="filter-bar">
      <form role="search" className="search-field" onSubmit={(event) => event.preventDefault()}>
        <Search aria-hidden="true" size={18} />
        <label htmlFor="campus-search" className="sr-only">
          Search campus
        </label>
        <input
          id="campus-search"
          type="search"
          value={filters.q}
          placeholder="Search buildings, e.g. Nest or IBLC"
          autoComplete="off"
          onChange={(event) => onChange({ ...filters, q: event.target.value })}
        />
        {filters.q && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Clear search"
            onClick={() => onChange({ ...filters, q: "" })}
          >
            <X aria-hidden="true" size={16} />
          </button>
        )}
      </form>

      <div className="chip-row" role="group" aria-label="Filters">
        <label className={filters.rank ? "chip chip--select is-on" : "chip chip--select"}>
          <span className="sr-only">Community rank</span>
          <select
            value={filters.rank}
            onChange={(event) =>
              onChange({ ...filters, rank: event.target.value as FilterState["rank"] })
            }
          >
            <option value="">Any rank</option>
            <option value="S">S rank</option>
            <option value="A">A rank</option>
            <option value="B">B rank</option>
            <option value="C">C rank</option>
            <option value="D">D rank</option>
          </select>
          <ChevronDown aria-hidden="true" size={14} />
        </label>

        <label className={filters.genderType ? "chip chip--select is-on" : "chip chip--select"}>
          <span className="sr-only">Room type</span>
          <select
            value={filters.genderType}
            onChange={(event) =>
              onChange({
                ...filters,
                genderType: event.target.value as FilterState["genderType"],
              })
            }
          >
            <option value="">Any room</option>
            <option value="all_gender">All-gender</option>
            <option value="private">Private</option>
            <option value="womens">Women’s</option>
            <option value="mens">Men’s</option>
          </select>
          <ChevronDown aria-hidden="true" size={14} />
        </label>

        <span className="chip-divider" aria-hidden="true" />

        <div className="chip-group" role="group" aria-label="Accessibility facts">
          {factFilters.map((filter) => {
            const on = Boolean(filters[filter.key]);
            return (
              <label key={filter.key} className={on ? "chip is-on" : "chip"}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={(event) => onChange({ ...filters, [filter.key]: event.target.checked })}
                />
                {on && <Check aria-hidden="true" size={14} />}
                {filter.label}
              </label>
            );
          })}
        </div>

        {active > 0 && (
          <button
            type="button"
            className="chip chip--clear"
            onClick={() => onChange({ ...defaultFilters, q: filters.q })}
          >
            <X aria-hidden="true" size={14} />
            Clear{active > 1 ? ` (${active})` : ""}
          </button>
        )}
      </div>
    </div>
  );
}
