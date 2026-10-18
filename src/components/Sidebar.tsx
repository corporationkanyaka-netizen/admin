"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Boxes, FileText, Inbox, LayoutDashboard, LogOut, Menu, MessageCircle, Package, ScrollText, Users, UserCog, X } from "lucide-react";
import Logo from "./Logo";
import { initials } from "@/lib/format";

type Counts = { newEnquiries: number; chatsToday: number; lowStock: number };

const groups = [
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

export default function Sidebar({ user, counts, signOut }: { user: { name: string; email: string; role: string }; counts: Counts; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : href === "/stock" ? pathname === "/stock" || /^\/stock\/(?!ledger)/.test(pathname) : pathname.startsWith(href));

  const nav = (
    <nav className="scroll-thin-dark flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups
        .filter((g) => !g.admin || user.role === "ADMIN")
        .map((g) => (
          <div key={g.title}>
            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{g.title}</div>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const count = "count" in item && item.count ? counts[item.count] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                        active ? "bg-white/10 font-medium text-white shadow-[inset_2px_0_0_#38bdf8]" : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300"}`} />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && (
                        <span
                          className={`num min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-semibold ${
                            "alert" in item && item.alert ? "bg-rose-500/90 text-white" : "bg-brand-500 text-white"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initials(user.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">{user.name}</div>
          <div className="truncate text-[11px] text-slate-400">{user.role === "ADMIN" ? "Admin" : "Staff"}</div>
        </div>
        <form action={signOut}>
          <button type="submit" title="Sign out" className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Phone top bar */}
      <div className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-ink-950 px-4 lg:hidden">
        <Link href="/">
          <Logo dark size={30} />
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-md text-white ring-1 ring-white/15">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Phone drawer */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-ink-950">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo dark size={30} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-md text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink-950 lg:flex">
        <Link href="/" className="flex h-16 items-center border-b border-white/10 px-5">
          <Logo dark size={34} />
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}
