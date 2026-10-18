"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While the Desk is open, checks the company Gmail for customer replies every 3 minutes. */
export default function InboxSync() {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (document.visibilityState !== "visible") return;
      const res = (await fetch("/api/inbox/sync", { method: "POST" })
        .then((r) => r.json())
        .catch(() => null)) as { added?: number } | null;
      if (alive && res?.added) router.refresh();
    };
    void run();
    const timer = window.setInterval(run, 3 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [router]);
  return null;
}
