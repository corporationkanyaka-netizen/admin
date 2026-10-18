"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  ChevronDown,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ScrollText,
  Search,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Logo from "./Logo";
import { SnackbarProvider } from "./ui";
import { initials } from "@/lib/format";

type User = { name: string; email: string; role: string };
type Counts = { newEnquiries: number; chatsToday: number; lowStock: number };

const NAV = [
  {
    title: "Sales",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/enquiries", label: "Enquiries", icon: Inbox, count: "newEnquiries" as const },
      { href: "/quotes", label: "Quotations", icon: FileText },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/chats", label: "Website chats", icon: MessageCircle, count: "chatsToday" as const },
    ],
  },
  {
    title: "Stock",
    items: [
      { href: "/stock", label: "Stock on hand", icon: Boxes, count: "lowStock" as const, alert: true },
      { href: "/stock/ledger", label: "Stock register", icon: ScrollText },
    ],
  },
  {
    title: "Settings",
    admin: true,
    items: [
      { href: "/settings/products", label: "Products", icon: Package },
      { href: "/settings/users", label: "Users", icon: UserCog },
    ],
  },
];

const NEW_MENU = [
  { href: "/enquiries/new", label: "Enquiry", hint: "Phone, WhatsApp or walk-in", icon: Inbox },
  { href: "/stock/entry?type=PURCHASE", label: "Stock in", hint: "Material received", icon: ArrowDownToLine },
  { href: "/stock/entry?type=SALE", label: "Stock out", hint: "Dispatch to a customer", icon: ArrowUpFromLine },
  { href: "/stock/entry?type=TRANSFER", label: "Transfer", hint: "Between warehouses", icon: ArrowLeftRight },
];

/** Closes a popup menu on outside click or Escape. */
function usePopup() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

type SyncState = { at?: Date; status: "idle" | "checking" | "ok" | "error" | "off" };

export default function AppShell({ user, counts, signOut, children }: { user: User; counts: Counts; signOut: () => Promise<void>; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false); // phone drawer
  const [rail, setRail] = useState(false); // desktop: icons only
  const newMenu = usePopup();
  const userMenu = usePopup();
  const [sync, setSync] = useState<SyncState>({ status: "idle" });

  useEffect(() => {
    try {
      setRail(localStorage.getItem("kd-rail") === "1");
    } catch {}
  }, []);
  const toggleRail = () => {
    setRail((r) => {
      try {
        localStorage.setItem("kd-rail", r ? "0" : "1");
      } catch {}
      return !r;
    });
  };

  // While the Desk is open, check the company Gmail for customer replies every 3 minutes.
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (document.visibilityState !== "visible") return;
      setSync((s) => ({ ...s, status: "checking" }));
      const res = (await fetch("/api/inbox/sync", { method: "POST" })
        .then((r) => r.json())
        .catch(() => null)) as { ok?: boolean; added?: number; skipped?: string } | null;
      if (!alive) return;
      setSync({ at: new Date(), status: !res ? "error" : res.skipped === "not-configured" ? "off" : res.ok ? "ok" : "error" });
      if (res?.added) router.refresh();
    };
    void run();
    const timer = window.setInterval(run, 3 * 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [router]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : href === "/stock" ? pathname === "/stock" || /^\/stock\/(?!ledger)/.test(pathname) : pathname.startsWith(href);

  const nav = (compact: boolean) => (
    <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-2">
      {NAV.filter((g) => !g.admin || user.role === "ADMIN").map((g, gi) => (
        <div key={g.title} className={gi ? "mt-2 border-t border-line pt-2" : ""}>
          {!compact && <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{g.title}</div>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const count = "count" in item && item.count ? counts[item.count] : 0;
              const alert = "alert" in item && item.alert;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={compact ? item.label : undefined}
                    onClick={() => setDrawer(false)}
                    className={`relative flex h-9 items-center gap-3 rounded-full text-[13px] transition ${compact ? "justify-center px-0" : "px-3"} ${
                      active ? "bg-brand-100 font-semibold text-brand-700" : "text-slate-700 hover:bg-paper"
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand-700" : "text-slate-500"}`} />
                    {!compact && <span className="flex-1 truncate">{item.label}</span>}
                    {count > 0 &&
                      (compact ? (
                        <span className={`absolute right-2 top-1.5 h-2 w-2 rounded-full ${alert ? "bg-rose-500" : "bg-brand-500"}`} />
                      ) : (
                        <span className={`num min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold text-white ${alert ? "bg-rose-500" : "bg-brand-600"}`}>{count}</span>
                      ))}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const syncLabel =
    sync.status === "checking"
      ? "Checking Gmail for replies…"
      : sync.status === "ok"
        ? `Customer replies checked ${sync.at?.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
        : sync.status === "error"
          ? "Gmail not reachable — will retry"
          : sync.status === "off"
            ? "Reply sync off"
            : "Starting…";
  const syncDot = { checking: "bg-amber-400 animate-pulse", ok: "bg-emerald-500", error: "bg-rose-500", off: "bg-slate-300", idle: "bg-slate-300" }[sync.status];

  return (
    <SnackbarProvider>
      <div className="min-h-screen">
        {/* ── Top app bar ─────────────────────────────────────────── */}
        <header className="no-print fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-2 bg-ink-950 px-2 text-white shadow-e2 sm:px-3">
          <button
            onClick={() => (window.matchMedia("(min-width: 1024px)").matches ? toggleRail() : setDrawer(true))}
            aria-label="Toggle navigation"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <Menu className="h-5 w-5 lg:hidden" />
            {rail ? <PanelLeftOpen className="hidden h-5 w-5 lg:block" /> : <PanelLeftClose className="hidden h-5 w-5 lg:block" />}
          </button>
          <Link href="/" className="mr-2 shrink-0">
            <Logo dark size={28} />
          </Link>

          <form action="/search" className="relative mx-auto hidden max-w-xl flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              placeholder="Search enquiries, customers, quotations, products…"
              className="h-9 w-full rounded-md bg-white/10 pl-9 pr-3 text-[13px] text-white outline-none ring-1 ring-white/10 transition placeholder:text-slate-400 focus:bg-white focus:text-ink-900 focus:ring-brand-400 focus:placeholder:text-slate-400"
            />
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Link href="/search" aria-label="Search" className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:bg-white/10 md:hidden">
              <Search className="h-5 w-5" />
            </Link>

            <div ref={newMenu.ref} className="relative">
              <button
                onClick={() => newMenu.setOpen(!newMenu.open)}
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md bg-brand-600 pl-2 pr-2.5 text-[13px] font-medium text-white shadow-e1 hover:bg-brand-500"
              >
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
              {newMenu.open && (
                <div className="absolute right-0 top-10 w-64 rounded-md bg-white py-1 text-ink-900 shadow-e3 ring-1 ring-black/5">
                  {NEW_MENU.map((m) => {
                    const Icon = m.icon;
                    return (
                      <Link key={m.href} href={m.href} onClick={() => newMenu.setOpen(false)} className="flex items-center gap-3 px-3 py-2 hover:bg-paper">
                        <Icon className="h-4 w-4 text-slate-500" />
                        <span>
                          <span className="block text-[13px] font-medium">{m.label}</span>
                          <span className="block text-[11px] text-slate-500">{m.hint}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div ref={userMenu.ref} className="relative">
              <button
                onClick={() => userMenu.setOpen(!userMenu.open)}
                aria-label="Account"
                className="ml-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-brand-500 text-xs font-semibold text-white ring-2 ring-white/20 hover:ring-white/40"
              >
                {initials(user.name)}
              </button>
              {userMenu.open && (
                <div className="absolute right-0 top-10 w-64 rounded-md bg-white text-ink-900 shadow-e3 ring-1 ring-black/5">
                  <div className="flex items-center gap-3 border-b border-line px-3 py-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initials(user.name)}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">{user.name}</div>
                      <div className="truncate text-[11px] text-slate-500">{user.email}</div>
                      <div className="mt-0.5 inline-block rounded-full bg-brand-50 px-1.5 text-[10px] font-medium text-brand-700">{user.role === "ADMIN" ? "Admin" : "Staff"}</div>
                    </div>
                  </div>
                  <form action={signOut}>
                    <button type="submit" className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-[13px] hover:bg-paper">
                      <LogOut className="h-4 w-4 text-slate-500" /> Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Navigation drawer (desktop) ─────────────────────────── */}
        <aside className={`no-print fixed bottom-7 left-0 top-12 z-20 hidden flex-col border-r border-line bg-white transition-[width] lg:flex ${rail ? "w-[60px]" : "w-56"}`}>
          {nav(rail)}
        </aside>

        {/* ── Navigation drawer (phone) ───────────────────────────── */}
        {drawer && (
          <div className="no-print fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink-950/50" onClick={() => setDrawer(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-e3">
              <div className="flex h-12 items-center justify-between bg-ink-950 px-3">
                <Logo dark size={28} />
                <button onClick={() => setDrawer(false)} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {nav(false)}
            </aside>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────── */}
        <main className={`print-main pb-10 pt-12 transition-[padding] ${rail ? "lg:pl-[60px]" : "lg:pl-56"}`}>
          <div className="px-3 py-3 sm:px-4 lg:px-6 lg:py-4">{children}</div>
        </main>

        {/* ── Footer status bar ───────────────────────────────────── */}
        <footer className="no-print fixed inset-x-0 bottom-0 z-30 flex h-7 items-center gap-3 border-t border-line bg-white px-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${syncDot}`} />
            {syncLabel}
          </span>
          <span className="ml-auto hidden sm:inline">
            Signed in as <span className="font-medium text-ink-900">{user.name}</span> · {user.role === "ADMIN" ? "Admin" : "Staff"}
          </span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline">© {new Date().getFullYear()} Kanyaka Corporation · Kanyaka Desk</span>
        </footer>
      </div>
    </SnackbarProvider>
  );
}
