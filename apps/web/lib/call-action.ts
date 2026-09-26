import type { ActionResult } from "./action-result"

// Calls a Server Action from the browser. If the request itself fails
// (offline, server restarting), the promise rejects instead of returning a
// result; this turns that into an ordinary error result, so every caller
// shows a message and releases its buttons instead of spinning forever.
export async function callAction<T>(
  action: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await action()
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the server. Check the connection and try again.",
    }
  }
}
