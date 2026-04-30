import "server-only";
import { recordError } from "./error-log.ts";

/**
 * Wrap a Next.js route handler so any thrown error is captured in the
 * process-wide ring buffer (and the dev-server log) before being re-thrown
 * for Next.js to render its 500 page. Apply to a handful of high-traffic
 * routes — see `app/api/generate/route.ts` etc.
 *
 * The handler signature is intentionally loose; Next.js gives the second
 * argument shapes like `{ params: Promise<{ id: string }> }` that vary per
 * route, so we forward whatever the runtime hands us.
 */
export function withErrorCapture<Ctx = unknown>(
  name: string,
  handler: (req: Request, ctx: Ctx) => Promise<Response>,
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req: Request, ctx: Ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      let url: string | undefined;
      let method: string | undefined;
      try {
        url = req.url;
        method = req.method;
      } catch {
        /* req may be a stream that's already drained */
      }
      recordError(err, name, { url, method });
      throw err;
    }
  };
}
