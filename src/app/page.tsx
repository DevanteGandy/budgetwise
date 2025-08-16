import { prisma } from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { createTransaction, deleteTransaction, createCategory, seedDemo } from "./actions/finance";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import ClientCharts from "./ClientCharts";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function money(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const v = Math.abs(cents) / 100;
  return `${sign}$${v.toFixed(2)}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  noStore();
  const params = await searchParams;

  const now = new Date();
  const month = Number(params.month ?? now.getMonth() + 1);
  const year = Number(params.year ?? now.getFullYear());
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 1);

  const q = typeof params.q === "string" ? params.q : undefined;
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;

  const where: Prisma.TransactionWhereInput = { date: { gte: from, lt: to } };
  if (q && q.trim()) where.note = { contains: q };
  if (categoryId) where.categoryId = categoryId;

  const [txns, cats] = await Promise.all([
    prisma.transaction.findMany({ where, include: { category: true }, orderBy: { date: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, income: 0, expense: 0 }));
  for (const t of txns) {
    const d = new Date(t.date).getDate();
    if (t.amountCents >= 0) daily[d - 1].income += t.amountCents / 100;
    else daily[d - 1].expense += Math.abs(t.amountCents) / 100;
  }

  const byCat = cats
    .map((c) => ({
      name: c.name,
      color: c.color ?? "#64748b",
      income: txns.filter((t) => t.categoryId === c.id && t.amountCents > 0).reduce((s, t) => s + t.amountCents, 0) / 100,
      expense: txns.filter((t) => t.categoryId === c.id && t.amountCents < 0).reduce((s, t) => s + Math.abs(t.amountCents), 0) / 100,
    }))
    .filter((x) => x.income > 0 || x.expense > 0);

  const totalIncome  = txns.filter(t => t.amountCents > 0).reduce((s,t)=>s+t.amountCents,0)/100;
  const totalExpense = txns.filter(t => t.amountCents < 0).reduce((s,t)=>s+Math.abs(t.amountCents),0)/100;
  const net = totalIncome - totalExpense;

  const qs = new URLSearchParams({ month: String(month), year: String(year) });
  if (q) qs.set("q", q);
  if (categoryId) qs.set("categoryId", categoryId);
  const prev = new URLSearchParams(qs); prev.set("month", String(month === 1 ? 12 : month - 1)); prev.set("year", String(month === 1 ? year - 1 : year));
  const next = new URLSearchParams(qs); next.set("month", String(month === 12 ? 1 : month + 1)); next.set("year", String(month === 12 ? year + 1 : year));

  return (
    <main className="mx-auto max-w-6xl p-6 lg:p-10 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">BudgetWise</h1>
          <p className="text-sm text-slate-400 mt-1">Track income, tame expenses, see trends.</p>
        </div>
        <form action={seedDemo}>
          <button className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm border border-indigo-500">
            Seed demo
          </button>
        </form>
      </header>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Income"  value={`$${totalIncome.toFixed(2)}`} />
        <Stat label="Expense" value={`$${totalExpense.toFixed(2)}`} />
        <Stat label="Net"     value={`${net < 0 ? "-" : ""}$${Math.abs(net).toFixed(2)}`} />
      </section>

      {/* Month nav + filters */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Link href={`/?${prev.toString()}`} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800">← Prev</Link>
          <div className="text-sm text-slate-300 font-medium">
            {new Date(year, month - 1).toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
          <Link href={`/?${next.toString()}`} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800">Next →</Link>
        </div>

        <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <select name="categoryId" defaultValue={categoryId ?? ""} className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input name="q" defaultValue={q ?? ""} placeholder="Search notes…" className="md:col-span-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <button className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm border border-indigo-500">Apply</button>
        </form>
      </section>

      {/* Charts */}
      <ClientCharts daily={daily} byCat={byCat} />

      {/* Forms */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">New transaction</h2>
          <form action={createTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="date" name="date" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <input type="number" step="0.01" name="amount" placeholder="Amount (− = expense, + = income)" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <select name="categoryId" defaultValue="" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">No category</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="note" placeholder="Note" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <div className="md:col-span-2 flex justify-end">
              <button className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm border border-indigo-500">Add</button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">New category</h2>
          <form action={createCategory} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input name="name" placeholder="Name (e.g. Food)" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            <select name="type" defaultValue="EXPENSE" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="EXPENSE">EXPENSE</option>
              <option value="INCOME">INCOME</option>
            </select>
            <input name="color" type="color" defaultValue="#64748b" className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm h-10" />
            <div className="md:col-span-3 flex justify-end">
              <button className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm border border-indigo-500">Add</button>
            </div>
          </form>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/70">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Note</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                  <td className="px-4 py-3">{new Date(t.date).toISOString().slice(0,10)}</td>
                  <td className="px-4 py-3">{t.category?.name ?? "-"}</td>
                  <td className="px-4 py-3">{t.note ?? "-"}</td>
                  <td className={`px-4 py-3 text-right ${t.amountCents < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {money(t.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteTransaction} className="inline">
                      <input type="hidden" name="id" value={t.id} />
                      <button className="rounded-md bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 text-sm border border-rose-600/80">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {txns.length === 0 && (
                <tr><td className="px-4 py-10 text-center text-slate-400" colSpan={5}>No transactions this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
