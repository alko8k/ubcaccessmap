import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RATING_TAGS, type UpsertRatingInput } from "@ubc-access-map/shared";
import { createReport, fetchWashroom, upsertRating } from "../../api/client.ts";
import { factLabel, genderLabel, tagLabel } from "../../lib/filters.ts";
import { useAuth } from "../../lib/auth.tsx";
import { usePanel } from "../../lib/usePanel.ts";

const attributeLabels: Record<string, string> = {
  stepFreeBuildingAccess: "Step-free building access",
  accessibleStall: "Accessible stall",
  grabBars: "Grab bars",
  transferSpace: "Transfer space",
  accessibleSink: "Accessible sink",
  automaticDoor: "Automatic / power door",
  changingTable: "Changing table",
  elevatorAccess: "Elevator to this floor",
};

const ratingFields = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "privacy", label: "Privacy" },
  { key: "availability", label: "Availability" },
  { key: "overall", label: "Overall" },
] as const;

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

type Props = {
  washroomId: string;
  onClose: () => void;
  onNeedAuth: () => void;
};

export function DetailPanel({ washroomId, onClose, onNeedAuth }: Props) {
  const { user } = useAuth();
  const panelRef = useRef<HTMLElement | null>(null);
  usePanel(panelRef, washroomId, onClose);
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ["washroom", washroomId],
    queryFn: () => fetchWashroom(washroomId),
  });
  const [rating, setRating] = useState<UpsertRatingInput>({
    cleanliness: 3,
    privacy: 3,
    availability: 3,
    overall: 3,
    tags: [],
  });
  const [reportMessage, setReportMessage] = useState("");
  const [reportType, setReportType] = useState("incorrect_access");

  const vote = useMutation({
    mutationFn: (input: UpsertRatingInput) => upsertRating(washroomId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["washroom", washroomId] });
      await queryClient.invalidateQueries({ queryKey: ["map"] });
    },
  });

  const report = useMutation({
    mutationFn: () => createReport(washroomId, reportType, reportMessage),
    onSuccess: () => {
      setReportMessage("");
    },
  });

  const washroom = detailQuery.data;

  return (
    <section className="panel" aria-labelledby="washroom-heading" tabIndex={-1} ref={panelRef}>
      <div className="panel-head">
        <p className="eyebrow">
          {washroom
            ? `${washroom.buildingName}${washroom.buildingCode ? ` · ${washroom.buildingCode}` : ""}`
            : "Washroom"}
        </p>
        <button type="button" className="text-btn panel-close" onClick={onClose} aria-label="Close details">
          Close
        </button>
      </div>

      <div className="panel-body">
        {detailQuery.isLoading && <p>Loading washroom details…</p>}
        {detailQuery.isError && (
          <div role="alert" className="notice notice--error">
            <p>Couldn’t load that washroom.</p>
            <button type="button" onClick={() => void detailQuery.refetch()}>
              Try again
            </button>
          </div>
        )}

        {washroom && (
          <>
            <h2 id="washroom-heading">{washroom.name}</h2>
            <p className="meta">
              Floor {washroom.floor} · {genderLabel(washroom.genderType)}
              {washroom.hours ? ` · ${washroom.hours}` : ""}
            </p>
            <p className="directions">{washroom.directions}</p>

            <div className="rank-box">
              <strong className={`rank rank-large rank-${washroom.rankLetter ?? "none"}`}>
                {washroom.rankLetter ?? "—"}
              </strong>
              <div>
                <p>Community experience rank</p>
                <p>
                  {washroom.voteCount} vote{washroom.voteCount === 1 ? "" : "s"} · {washroom.confidence}{" "}
                  confidence
                </p>
                <div
                  className="tier-meter"
                  role="progressbar"
                  aria-label="Confidence in this rank"
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={Math.min(washroom.voteCount, 10)}
                >
                  <i style={{ width: `${Math.min(washroom.voteCount / 10, 1) * 100}%` }} />
                </div>
                <p className="hint">
                  Rank is Bayesian-weighted so a single vote cannot produce an S. It is not an
                  accessibility rating.
                </p>
              </div>
            </div>

            <section className="panel-section">
              <h3 className="group-label">Accessibility facts</h3>
              <ul className="fact-list">
                {washroom.attributes.map((attribute) => (
                  <li key={attribute.key}>
                    <span>{attributeLabels[attribute.key] ?? attribute.key}</span>
                    <b data-state={attribute.value}>{factLabel(attribute.value)}</b>
                  </li>
                ))}
              </ul>
              <p className="hint">
                Source: {washroom.attributeSource ?? "Not recorded"}
                {washroom.lastVerifiedAt
                  ? ` · last verified ${new Date(washroom.lastVerifiedAt).toLocaleDateString()}`
                  : ""}
                . Unknown means we have not confirmed it.
              </p>
            </section>

            <section className="panel-section">
              <h3 className="group-label">Vote</h3>
              {user ? (
                <form
                  className="vote-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    vote.mutate(rating);
                  }}
                >
                  <p className="hint">Rate each from 1 (poor) to 5 (great).</p>
                  {ratingFields.map(({ key, label }) => (
                    <label key={key} className="rating-field">
                      <span className="rating-label">
                        {label}
                        <output>{rating[key]} / 5</output>
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={rating[key]}
                        aria-valuetext={`${rating[key]} out of 5`}
                        onChange={(event) =>
                          setRating({ ...rating, [key]: Number(event.target.value) })
                        }
                      />
                    </label>
                  ))}
                  <fieldset>
                    <legend>Optional tags</legend>
                    <div className="filter-checks">
                      {RATING_TAGS.map((tag) => (
                        <label key={tag} className="check">
                          <input
                            type="checkbox"
                            checked={rating.tags.includes(tag)}
                            onChange={(event) => {
                              setRating({
                                ...rating,
                                tags: event.target.checked
                                  ? [...rating.tags, tag]
                                  : rating.tags.filter((value) => value !== tag),
                              });
                            }}
                          />
                          {tagLabel(tag)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <button type="submit" className="primary" disabled={vote.isPending}>
                    {vote.isPending
                      ? "Saving…"
                      : washroom.viewerRating
                        ? "Update my vote"
                        : "Submit vote"}
                  </button>
                  {vote.isSuccess && (
                    <p role="status" className="notice">
                      Saved. You can update this vote any time.
                    </p>
                  )}
                  {vote.isError && (
                    <p role="alert" className="notice notice--error">
                      {errorText(vote.error, "Couldn’t save your vote. Try again.")}
                    </p>
                  )}
                </form>
              ) : (
                <p>
                  <button type="button" className="primary" onClick={onNeedAuth}>
                    Verify a UBC email to vote
                  </button>
                </p>
              )}
            </section>

            <section className="panel-section">
              <h3 className="group-label">Report a correction</h3>
              <form
                className="report-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!user) {
                    onNeedAuth();
                    return;
                  }
                  report.mutate();
                }}
              >
                <label>
                  What is wrong?
                  <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
                    <option value="incorrect_access">Accessibility fact is wrong</option>
                    <option value="closed">Closed or unavailable</option>
                    <option value="directions">Directions need an update</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Details
                  <textarea
                    required
                    minLength={8}
                    value={reportMessage}
                    onChange={(event) => setReportMessage(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={report.isPending}>
                  {report.isPending ? "Sending…" : "Send report"}
                </button>
                {report.isError && (
                  <p role="alert" className="notice notice--error">
                    {errorText(report.error, "Couldn’t send that report. Try again.")}
                  </p>
                )}
              </form>
              {report.isSuccess && (
                <p role="status" className="notice">
                  Thanks. A moderator will review that correction.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </section>
  );
}
