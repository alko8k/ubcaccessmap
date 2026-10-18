import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage.tsx";

// MapLibre needs WebGL, which jsdom doesn't have; the map isn't under test here.
vi.mock("../features/map/CampusMap.tsx", () => ({ CampusMap: () => null }));

vi.mock("../lib/auth.tsx", () => ({
  useAuth: () => ({ user: null, requestLink: vi.fn() }),
}));

vi.mock("../api/client.ts", () => ({
  fetchMap: async () => ({
    buildings: [
      {
        id: "b1",
        name: "AMS Student Nest",
        code: "NEST",
        washroomCount: 1,
        bestRank: null,
        centroidLat: 49.266,
        centroidLng: -123.249,
        footprint: null,
        heightM: 26.9,
        stepFreeAccess: "yes",
        hours: null,
      },
    ],
    washrooms: [
      {
        id: "w1",
        buildingId: "b1",
        buildingName: "AMS Student Nest",
        name: "Level 2 accessible / all-gender",
        floor: "2",
        genderType: "all_gender",
        rankLetter: null,
        latitude: 49.266,
        longitude: -123.249,
      },
    ],
  }),
  fetchWashroom: () => new Promise(() => undefined),
  fetchDevMagicLink: vi.fn(),
}));

afterEach(cleanup);

function Location() {
  return <output data-testid="location">{useLocation().search}</output>;
}

describe("HomePage", () => {
  it("selects a washroom's building too, so the map can show where it is", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/"]}>
          <HomePage />
          <Location />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /level 2 accessible/i }));

    const search = new URLSearchParams(screen.getByTestId("location").textContent ?? "");
    expect(search.get("washroom")).toBe("w1");
    expect(search.get("building")).toBe("b1");
  });
});
