import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useAuth } from "../../lib/auth.tsx";
import { useDocumentTitle } from "../../lib/useDocumentTitle.ts";

export function VerifyPage() {
  const [params] = useSearchParams();
  const { verify } = useAuth();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useDocumentTitle("Sign in");

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    verify(token)
      .then(() => {
        if (!cancelled) setDone(true);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not verify that link.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, verify]);

  return (
    <main className="page status-page">
      {done && (
        <>
          <CircleCheck aria-hidden="true" size={36} className="status-icon status-icon--ok" />
          <h1>You’re signed in</h1>
          <p>Your UBC email is verified, so you can vote on washrooms now.</p>
          <Link to="/" className="btn btn--primary">
            Back to the map
          </Link>
        </>
      )}
      {(!token || error) && (
        <>
          <CircleAlert aria-hidden="true" size={36} className="status-icon status-icon--error" />
          <h1>That link didn’t work</h1>
          <p role="alert">{error ?? "That sign-in link is missing a token."}</p>
          <p className="hint">Links work once and expire after 15 minutes.</p>
          <Link to="/?signin=1" className="btn btn--primary">
            Send a new link
          </Link>
        </>
      )}
      {token && !done && !error && (
        <>
          <LoaderCircle aria-hidden="true" size={36} className="status-icon spin" />
          <h1>Signing you in…</h1>
          <p>Checking your link.</p>
        </>
      )}
    </main>
  );
}
