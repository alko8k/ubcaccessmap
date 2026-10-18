import { useEffect, useRef, useState, type FormEvent } from "react";
import { fetchDevMagicLink } from "../../api/client.ts";
import { useAuth } from "../../lib/auth.tsx";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AuthDialog({ open, onClose }: Props) {
  const { requestLink } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  /*
   * A native modal dialog gives Escape-to-close, keeps focus inside, makes the
   * page behind it inert, and returns focus to the opener when it closes.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await requestLink(email);
      setMessage("Check your inbox for a single-use sign-in link. It expires in 15 minutes.");
      if (import.meta.env.DEV) {
        // Returns a link only while the API is falling back to the in-memory
        // adapter; once SMTP is configured the mail is really sent.
        const inbox = await fetchDevMagicLink(email);
        setDevUrl(inbox.url);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send that link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="auth-title"
      // Escape fires "cancel"; let React state drive the actual close.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the dialog element itself, not its children, is a click on
      // the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="dialog-body">
        <h2 id="auth-title">Verify a UBC email</h2>
        <p>
          Voting is limited to <code>@student.ubc.ca</code> and <code>@ubc.ca</code> addresses. This
          checks affiliation, not current enrolment, and we never collect student numbers or ID
          photos.
        </p>
        <form onSubmit={onSubmit}>
          <label>
            UBC email
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <div className="dialog-actions">
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Sending…" : "Email me a link"}
            </button>
            <button type="button" className="text-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
        {message && <p role="status">{message}</p>}
        {devUrl && (
          <p className="notice">
            <a href={devUrl}>Open sign-in link →</a>
          </p>
        )}
      </div>
    </dialog>
  );
}
