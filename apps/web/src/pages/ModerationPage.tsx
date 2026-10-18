import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchReports, updateReport } from "../api/client.ts";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.tsx";

const reportTypeLabels: Record<string, string> = {
  incorrect_access: "Accessibility fact is wrong",
  closed: "Closed or unavailable",
  directions: "Directions need an update",
  other: "Something else",
};

export function ModerationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
    enabled: user?.role === "ADMIN",
  });
  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "reviewed" | "dismissed" }) =>
      updateReport(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  if (!user) {
    return (
      <main className="page">
        <h1>Moderation</h1>
        <p>Sign in with an admin UBC email to review reports.</p>
        <Link to="/?signin=1" className="btn btn--primary">
          Sign in
        </Link>
      </main>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="page">
        <h1>Moderation</h1>
        <p>Your verified account does not have moderator access.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="eyebrow">Moderation</p>
      <h1>Reports</h1>
      {reportsQuery.isLoading && <p>Loading reports…</p>}
      {reportsQuery.isError && <p role="alert">Couldn’t load reports. Refresh to try again.</p>}
      {reportsQuery.data?.reports.length === 0 && (
        <p className="empty-note">No reports yet. Corrections from users will show up here.</p>
      )}
      <ul className="report-list">
        {reportsQuery.data?.reports.map((report) => (
          <li key={report.id} className="card report-card">
            <div className="report-head">
              <strong>
                {report.buildingName}: {report.washroomName}
              </strong>
              <span className={`badge badge--${report.status}`}>{report.status}</span>
            </div>
            <p className="report-type">{reportTypeLabels[report.type] ?? report.type}</p>
            <p>{report.message}</p>
            {report.status === "open" && (
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={moderate.isPending}
                  onClick={() => moderate.mutate({ id: report.id, status: "dismissed" })}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={moderate.isPending}
                  onClick={() => moderate.mutate({ id: report.id, status: "reviewed" })}
                >
                  Mark reviewed
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
