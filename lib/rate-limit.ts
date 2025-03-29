import { Ratelimit } from "@upstash/ratelimit";
// Import the underlying Redis client instance provided by @vercel/kv
import { kv } from "@vercel/kv";


export const ratelimit = new Ratelimit({

  redis: kv, // Use the redis client instance from @vercel/kv
  limiter: Ratelimit.slidingWindow(2, "60 s"),
  analytics: true, // Note: Analytics with Vercel KV might have limitations compared to direct Upstash. Check docs if this is critical.
  prefix: "@vercel/ratelimit", // Optional: Changed prefix to reflect Vercel KV usage
});