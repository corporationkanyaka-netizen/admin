import Image from "next/image";

/** Kanyaka mark + "Desk" wordmark. */
export default function Logo({ dark = false, size = 36 }: { dark?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`relative inline-block shrink-0 overflow-hidden rounded-md ${dark ? "ring-1 ring-white/15" : "shadow-[0_6px_16px_-8px_rgba(18,36,58,0.55)] ring-1 ring-black/5"}`}
        style={{ width: size, height: size }}
      >
        <Image src="/icon.png" alt="Kanyaka Corporation" width={size} height={size} priority className="h-full w-full" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.05rem] font-semibold tracking-[-0.02em] ${dark ? "text-white" : "text-ink-950"}`}>Kanyaka</span>
        <span className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.3em] ${dark ? "text-brand-300" : "text-brand-700"}`}>Desk</span>
      </span>
    </span>
  );
}
