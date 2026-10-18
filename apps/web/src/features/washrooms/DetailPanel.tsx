import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock, Flag, Layers, ShieldCheck, Users, X } from "lucide-react";
import { RATING_TAGS, type UpsertRatingInput } from "@ubc-access-map/shared";
import { createReport, fetchWashroom, upsertRating } from "../../api/client.ts";
import { factLabel, genderLabel, tagLabel } from "../../lib/filters.ts";
import { useAuth } from "../../lib/auth.tsx";
import { prefersReducedMotion } from "../../lib/useMediaQuery.ts";
import { usePanel } from "../../lib/usePanel.ts";
import { FactIcon } from "./FactIcon.tsx";
import { RatingControl } from "./RatingControl.tsx";

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
  /** Steps back to the washroom's building. Escape does the same. */
  onClose: () => void;
  /** Closes the panel entirely. */
  onDismiss: () => void;
  onNeedAuth: () => void;
};

export function DetailPanel({ washroomId, onClose, onDismiss, onNeedAuth }: Props) {
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
      <header className="panel-head">
        <button
          type="button"
          className="crumb"
          onClick={onClose}
          aria-label={`Back to ${washroom ? (washroom.buildingCode ?? washroom.buildingName) : "building"}`}
        >
          <ArrowLeft aria-hidden="true" size={16} />
          <span>
            {washroom ? (washroom.buildingCode ?? washroom.buildingName) : "Building"}
          </span>
        </button>
        <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Close details">
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      <div className="panel-body panel-enter">
        {detailQuery.isLoading && (
          <div className="panel-loading" aria-label="Loading washroom details">
            <span className="skeleton skeleton--title" />
            <span className="skeleton skeleton--text" />
            <span className="skeleton skeleton--block" />
          </div>
        )}
        {detailQuery.isError && (
          <div role="alert" className="notice notice--error">
            <p>Couldn’t load that washroom.</p>
            <button type="button" className="btn" onClick={() => void detailQuery.refetch()}>
              Try again
            </button>
          </div>
        )}

        {washroom && (
          <>
            <h2 id="washroom-heading" className="panel-title">
              {washroom.name}
            </h2>
            <ul className="meta-chips" aria-label="Details">
              <li>
                <Layers aria-hidden="true" size={14} />
                Floor {washroom.floor}
              </li>
              <li>
                <Users aria-hidden="true" size={14} />
                {genderLabel(washroom.genderType)}
              </li>
              {washroom.hours && (
                <li>
                  <Clock aria-hidden="true" size={14} />
                  {washroom.hours}
                </li>
              )}
            </ul>
            {washroom.directions && <p className="directions">{washroom.directions}</p>}

            <div className="card rank-card">
              {/* Re-keyed on each saved vote so the medal pulses as it updates. */}
              <strong
                key={`${washroom.rankLetter ?? "none"}-${washroom.voteCount}`}
                className={`rank rank-large rank-${washroom.rankLetter ?? "none"}${vote.isSuccess ? " rank-pulse" : ""}`}
              >
                {washroom.rankLetter ?? "—"}
              </strong>
              <div className="rank-card-text">
                <p className="rank-card-title">Community rank</p>
                {washroom.voteCount === 0 ? (
                  <p className="rank-card-meta">
                    No votes yet.{" "}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        const target = document.getElementById("vote-heading");
                        target?.scrollIntoView({
                          block: "start",
                          behavior: prefersReducedMotion() ? "auto" : "smooth",
                        });
                      }}
                    >
                      Be the first to rate it
                    </button>
                  </p>
                ) : (
                  <>
                    <p className="rank-card-meta">
                      {washroom.voteCount} vote{washroom.voteCount === 1 ? "" : "s"} ·{" "}
                      {washroom.confidence} confidence
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
                  </>
                )}
              </div>
            </div>
            <p className="hint">
              Ranks come from votes and are weighted so one vote can’t make an S. They are not an
              accessibility rating.
            </p>

            <section className="panel-section" aria-labelledby="facts-heading">
              <h3 id="facts-heading" className="section-title">
                <ShieldCheck aria-hidden="true" size={16} />
                Accessibility facts
              </h3>
              <ul className="fact-grid">
                {washroom.attributes.map((attribute) => (
                  <li key={attribute.key} data-state={attribute.value}>
                    <span className="fact-name">
                      {attributeLabels[attribute.key] ?? attribute.key}
                    </span>
                    <span className="fact-state">
                      <FactIcon value={attribute.value} />
                      {factLabel(attribute.value)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="hint">
                Source: {washroom.attributeSource ?? "not recorded"}
                {washroom.lastVerifiedAt
                  ? ` · verified ${new Date(washroom.lastVerifiedAt).toLocaleDateString()}`
                  : ""}
                . Unknown means it hasn’t been confirmed yet.
              </p>
            </section>

            <section className="panel-section" aria-labelledby="vote-heading">
              <h3 id="vote-heading" className="section-title">
                {washroom.viewerRating ? "Update your vote" : "Rate this washroom"}
              </h3>
              {user ? (
                <form
                  className="vote-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    vote.mutate(rating);
                  }}
                >
                  <p className="hint">1 is poor, 5 is great.</p>
                  {ratingFields.map(({ key, label }) => (
                    <RatingControl
                      key={key}
                      label={label}
                      value={rating[key]}
                      onChange={(score) => setRating({ ...rating, [key]: score })}
                    />
                  ))}
                  <fieldset className="tag-field">
                    <legend>Tags (optional)</legend>
                    <div className="chip-wrap">
                      {RATING_TAGS.map((tag) => {
                        const on = rating.tags.includes(tag);
                        return (
                          <label key={tag} className={on ? "chip is-on" : "chip"}>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={on}
                              onChange={(event) => {
                                setRating({
                                  ...rating,
                                  tags: event.target.checked
                                    ? [...rating.tags, tag]
                                    : rating.tags.filter((value) => value !== tag),
                                });
                              }}
                            />
                            {on && <Check aria-hidden="true" size={14} />}
                            {tagLabel(tag)}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <button type="submit" className="btn btn--primary btn--block" disabled={vote.isPending}>
                    {vote.isPending
                      ? "Saving…"
                      : washroom.viewerRating
                        ? "Update my vote"
                        : "Submit vote"}
                  </button>
                  {vote.isSuccess && (
                    <p role="status" className="notice notice--success">
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
                <div className="card cta-card">
                  <p>Votes are limited to verified UBC emails, so ranks stay meaningful.</p>
                  <button type="button" className="btn btn--primary" onClick={onNeedAuth}>
                    Verify a UBC email to vote
                  </button>
                </div>
              )}
            </section>

            <details className="panel-section disclosure">
              <summary>
                <Flag aria-hidden="true" size={16} />
                Report a correction
              </summary>
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
                <label className="field">
                  <span>What’s wrong?</span>
                  <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
                    <option value="incorrect_access">An accessibility fact is wrong</option>
                    <option value="closed">Closed or unavailable</option>
                    <option value="directions">Directions need an update</option>
                    <option value="other">Something else</option>
                  </select>
                </label>
                <label className="field">
                  <span>Details</span>
                  <textarea
                    required
                    minLength={8}
                    value={reportMessage}
                    placeholder="What did you see? The more specific, the faster it’s fixed."
                    onChange={(event) => setReportMessage(event.target.value)}
                  />
                </label>
                <button type="submit" className="btn" disabled={report.isPending}>
                  {report.isPending ? "Sending…" : "Send report"}
                </button>
                {report.isSuccess && (
                  <p role="status" className="notice notice--success">
                    Thanks. A moderator will review that correction.
                  </p>
                )}
                {report.isError && (
                  <p role="alert" className="notice notice--error">
                    {errorText(report.error, "Couldn’t send that report. Try again.")}
                  </p>
                )}
              </form>
            </details>
          </>
        )}
      </div>
    </section>
  );
}
