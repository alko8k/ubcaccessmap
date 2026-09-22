import type { EmailAdapter, MagicLinkEmail } from "./adapter.js";

export function createMemoryEmailAdapter(): EmailAdapter {
  const latest = new Map<string, string>();

  return {
    async sendMagicLink(email: MagicLinkEmail) {
      latest.set(email.to.toLowerCase(), email.verifyUrl);
      console.info(`[email:memory] magic link for ${email.to}: ${email.verifyUrl}`);
    },
    getLatestMagicLink(to: string) {
      return latest.get(to.toLowerCase());
    },
  };
}
