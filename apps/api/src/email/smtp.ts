import nodemailer from "nodemailer";
import type { EmailAdapter, MagicLinkEmail } from "./adapter.js";

type SmtpOptions = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

/**
 * Sends sign-in links over SMTP.
 *
 * Configured for Gmail by default, which needs an App Password rather than the
 * account password (Google blocks plain password auth). Gmail also caps sending
 * at roughly 500 messages a day, which is fine at this scale but is the first
 * thing to outgrow: swapping to a provider means writing another adapter
 * against this same interface, not touching the auth routes.
 */
export function createSmtpEmailAdapter(options: SmtpOptions): EmailAdapter {
  const transporter = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.port === 465,
    auth: { user: options.user, pass: options.pass },
  });

  return {
    async sendMagicLink({ to, verifyUrl }: MagicLinkEmail) {
      await transporter.sendMail({
        from: options.from,
        to,
        subject: "Your UBC Access Map sign-in link",
        text: [
          "Here is your sign-in link for UBC Access Map:",
          "",
          verifyUrl,
          "",
          "The link works once and expires in 15 minutes.",
          "If you did not request it, you can ignore this email — no account is created until the link is used.",
        ].join("\n"),
        html: [
          '<div style="font-family:system-ui,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#16181a">',
          "<p>Here is your sign-in link for UBC Access Map:</p>",
          `<p><a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#6d4aa8;color:#fff;border-radius:4px;text-decoration:none">Sign in</a></p>`,
          '<p style="color:#5c6469;font-size:13px">The link works once and expires in 15 minutes.</p>',
          '<p style="color:#5c6469;font-size:13px">If you did not request it, you can ignore this email — no account is created until the link is used.</p>',
          `<p style="color:#8b9297;font-size:12px;word-break:break-all">${verifyUrl}</p>`,
          "</div>",
        ].join(""),
      });
    },
  };
}
