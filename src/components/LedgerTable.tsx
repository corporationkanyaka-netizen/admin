import { MovementChip, Table, Td, Th } from "@/components/ui";
import { date, kgLabel, stockLabel } from "@/lib/format";

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
    <Table minWidth={760}>
      <thead>
        <tr>
          <Th>Date</Th>
          {showProduct && <Th>Product</Th>}
          <Th>Entry</Th>
          <Th>Warehouse</Th>
          <Th>Party / reference</Th>
          <Th align="right">In</Th>
          <Th align="right">Out</Th>
          {withBalance && <Th align="right">Balance</Th>}
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
          return (
            <tr key={m.id} className="hover:bg-paper/60">
              <Td className="whitespace-nowrap text-slate-700">{date(m.occurredOn)}</Td>
              {showProduct && <Td className="font-medium text-ink-900">{m.product.name}</Td>}
              <Td>
                <MovementChip type={m.type} />
                {m.actor && <div className="mt-1 text-[11px] text-slate-400">by {m.actor}</div>}
              </Td>
              <Td className="text-slate-700">{m.warehouse.name.replace(/ warehouse$/i, "")}</Td>
              <Td className="text-slate-700">
                {m.party ?? <span className="text-slate-400">—</span>}
                {m.reference && <div className="font-mono text-[11px] text-slate-500">{m.reference}</div>}
                {m.note && <div className="text-xs text-slate-500">{m.note}</div>}
              </Td>
              <Td align="right" className="num text-emerald-700">
                {kg > 0 ? label(kg) : ""}
              </Td>
              <Td align="right" className="num text-rose-700">
                {kg < 0 ? label(-kg) : ""}
              </Td>
              {withBalance && (
                <Td align="right" className="num font-medium text-ink-950">
                  {m.balance !== undefined && label(m.balance)}
                </Td>
              )}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
