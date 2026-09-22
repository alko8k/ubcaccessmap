import { tooManyRequests } from "../errors.js";

type Bucket = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(options: { windowMs: number; max: number }) {
  const buckets = new Map<string, Bucket>();

  return function consume(key: string) {
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return;
    }

    if (current.count >= options.max) {
      throw tooManyRequests();
    }

    current.count += 1;
  };
}
