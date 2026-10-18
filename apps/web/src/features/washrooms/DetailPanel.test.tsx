import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { DetailPanel } from "./DetailPanel.tsx";

vi.mock("../../lib/auth.tsx", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("../../api/client.ts", () => ({
  fetchWashroom: async () => ({
    id: "w1",
    buildingId: "b1",
    buildingName: "AMS Student Nest",
    buildingCode: "NEST",
    name: "Level 2 accessible / all-gender",
    floor: "2",
    directions: "Across from the AMS offices.",
    genderType: "all_gender",
    hours: "Term hours",
    latitude: 49.26,
    longitude: -123.25,
    voteCount: 0,
    bayesianScore: null,
    rankLetter: null,
    confidence: "none",
    attributes: [
      {
        key: "accessibleStall",
        value: "yes",
        source: "test",
        confidence: "medium",
        lastVerifiedAt: "2026-03-01T00:00:00.000Z",
      },
    ],
    buildingStepFreeAccess: "yes",
    buildingHours: "Term hours",
    lastVerifiedAt: "2026-03-01T00:00:00.000Z",
    attributeSource: "test",
    breakdown: { cleanliness: null, privacy: null, availability: null, overall: null },
    viewerRating: null,
  }),
  createReport: vi.fn(),
  upsertRating: vi.fn(),
}));

describe("DetailPanel", () => {
  it("keeps accessibility facts visible and asks unsigned users to verify before voting", async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <DetailPanel
          washroomId="w1"
          onClose={() => undefined}
          onDismiss={() => undefined}
          onNeedAuth={() => undefined}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: /accessible \/ all-gender/i })).toBeTruthy();
    expect(screen.getByText("Accessible stall")).toBeTruthy();
    expect(screen.getByRole("button", { name: /verify a ubc email to vote/i })).toBeTruthy();
    // With no votes, the rank card invites a first vote instead of showing "0 votes".
    expect(screen.getByText(/no votes yet/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /be the first to rate it/i })).toBeTruthy();
    // The header steps back to the building by name.
    expect(screen.getByRole("button", { name: "Back to NEST" })).toBeTruthy();
  });
});
