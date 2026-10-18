import { Table, td, th } from "./ui";
import { date, kgLabel, stockLabel } from "@/lib/format";
import { MOVEMENT, type MovementKey } from "@/lib/labels";

export type LedgerRow = {
  id: string;
  type: string;
  quantityKg: unknown;
  occurredOn: Date;
  party: string | null;
  reference: string | null;
  note: string | null;
  actor: string | null;
  product: { name: string; packKg: unknown };
  warehouse: { name: string };
  balance?: number;
};

/** Stock register rows. Pass `balance` to show a running balance column (single-product view). */
export default function LedgerTable({ rows, showProduct = true }: { rows: LedgerRow[]; showProduct?: boolean }) {
  const withBalance = rows.some((r) => r.balance !== undefined);
  return (
    <Table>
      <thead>
        <tr>
          <th className={th}>Date</th>
          {showProduct && <th className={th}>Product</th>}
          <th className={th}>Entry</th>
          <th className={th}>Warehouse</th>
          <th className={th}>Party / reference</th>
          <th className={`${th} text-right`}>In</th>
          <th className={`${th} text-right`}>Out</th>
          {withBalance && <th className={`${th} text-right`}>Balance</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => {
          const kg = Number(m.quantityKg);
          const label = (v: number) => (
            <>
              {stockLabel(v, m.product.packKg as number)}
              {Boolean(m.product.packKg) && <div className="text-[11px] text-slate-500">{kgLabel(v)}</div>}
            </>
          );
          const mv = MOVEMENT[m.type as MovementKey];
          return (
            <tr key={m.id} className="hover:bg-paper/60">
              <td className={`${td} whitespace-nowrap text-slate-700`}>{date(m.occurredOn)}</td>
              {showProduct && <td className={`${td} font-medium text-ink-900`}>{m.product.name}</td>}
              <td className={td}>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${mv?.tone ?? ""}`}>{mv?.short ?? m.type}</span>
                {m.actor && <div className="mt-1 text-[11px] text-slate-400">by {m.actor}</div>}
              </td>
              <td className={`${td} text-slate-700`}>{m.warehouse.name.replace(/ warehouse$/i, "")}</td>
              <td className={`${td} text-slate-700`}>
                {m.party ?? <span className="text-slate-400">—</span>}
                {m.reference && <div className="font-mono text-[11px] text-slate-500">{m.reference}</div>}
                {m.note && <div className="text-xs text-slate-500">{m.note}</div>}
              </td>
              <td className={`${td} num text-right text-emerald-700`}>{kg > 0 ? label(kg) : ""}</td>
              <td className={`${td} num text-right text-rose-700`}>{kg < 0 ? label(-kg) : ""}</td>
              {withBalance && <td className={`${td} num text-right font-medium text-ink-950`}>{m.balance !== undefined && label(m.balance)}</td>}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
