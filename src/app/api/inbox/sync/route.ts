import { getCurrentUser } from "@/server/auth";
import { syncInbox } from "@/server/inbox";

// Polled by <InboxSync /> with fetch (not a server action), so a slow Gmail connection
// never queues up behind — or holds up — the buttons staff are pressing.
export async function POST() {
  if (!(await getCurrentUser())) return Response.json({ ok: false, added: 0, error: "Signed out" }, { status: 401 });
  return Response.json(await syncInbox());
}
