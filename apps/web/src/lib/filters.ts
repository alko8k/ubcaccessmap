import { UBC_CAMPUS, type MapQuery } from "@ubc-access-map/shared";

export type FilterState = {
  q: string;
  rank: MapQuery["rank"] | "";
  genderType: MapQuery["genderType"] | "";
  stepFreeBuildingAccess: boolean;
  accessibleStall: boolean;
  grabBars: boolean;
  automaticDoor: boolean;
  elevatorAccess: boolean;
  changingTable: boolean;
};

export const defaultFilters: FilterState = {
  q: "",
  rank: "",
  genderType: "",
  stepFreeBuildingAccess: false,
  accessibleStall: false,
  grabBars: false,
  automaticDoor: false,
  elevatorAccess: false,
  changingTable: false,
};

/** Refinements in effect, not counting the search box, which stays visible. */
export function activeFilterCount(filters: FilterState): number {
  return (Object.keys(defaultFilters) as Array<keyof FilterState>).filter(
    (key) => key !== "q" && filters[key] !== defaultFilters[key],
  ).length;
}

export function filtersFromSearch(search: string): FilterState {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q") ?? "",
    rank: (params.get("rank") as FilterState["rank"]) ?? "",
    genderType: (params.get("genderType") as FilterState["genderType"]) ?? "",
    stepFreeBuildingAccess: params.get("stepFree") === "1",
    accessibleStall: params.get("accessibleStall") === "1",
    grabBars: params.get("grabBars") === "1",
    automaticDoor: params.get("automaticDoor") === "1",
    elevatorAccess: params.get("elevatorAccess") === "1",
    changingTable: params.get("changingTable") === "1",
  };
}

export function searchFromFilters(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.rank) params.set("rank", filters.rank);
  if (filters.genderType) params.set("genderType", filters.genderType);
  if (filters.stepFreeBuildingAccess) params.set("stepFree", "1");
  if (filters.accessibleStall) params.set("accessibleStall", "1");
  if (filters.grabBars) params.set("grabBars", "1");
  if (filters.automaticDoor) params.set("automaticDoor", "1");
  if (filters.elevatorAccess) params.set("elevatorAccess", "1");
  if (filters.changingTable) params.set("changingTable", "1");
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function mapQueryString(filters: FilterState): string {
  const params = new URLSearchParams({
    west: String(UBC_CAMPUS.bounds.west),
    south: String(UBC_CAMPUS.bounds.south),
    east: String(UBC_CAMPUS.bounds.east),
    north: String(UBC_CAMPUS.bounds.north),
  });

  if (filters.q) params.set("q", filters.q);
  if (filters.rank) params.set("rank", filters.rank);
  if (filters.genderType) params.set("genderType", filters.genderType);
  if (filters.stepFreeBuildingAccess) params.set("stepFreeBuildingAccess", "yes");
  if (filters.accessibleStall) params.set("accessibleStall", "yes");
  if (filters.grabBars) params.set("grabBars", "yes");
  if (filters.automaticDoor) params.set("automaticDoor", "yes");
  if (filters.elevatorAccess) params.set("elevatorAccess", "yes");
  if (filters.changingTable) params.set("changingTable", "yes");
  return `?${params.toString()}`;
}

export function genderLabel(value: string) {
  switch (value) {
    case "all_gender":
      return "All-gender";
    case "private":
      return "Private / single occupancy";
    case "womens":
      return "Women’s";
    case "mens":
      return "Men’s";
    default:
      return value;
  }
}

export function factLabel(value: string) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Unknown";
}

/** Rating tags are stored as slugs ("usually-available"). */
export function tagLabel(tag: string) {
  const words = tag.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
