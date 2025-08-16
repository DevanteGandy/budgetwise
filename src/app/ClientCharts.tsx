"use client";

import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell,
} from "recharts";

const INCOME_COLOR = "#10b981";  // emerald
const EXPENSE_COLOR = "#ef4444"; // rose

export default function ClientCharts({
  daily,
  byCat,
}: {
  daily: { day: number; income: number; expense: number }[];
  byCat: { name: string; color: string; income: number; expense: number }[];
}) {
  // Only show categories that actually have EXPENSE
  const pieData = byCat
    .filter((c) => c.expense > 0)
    .map((c) => ({ name: c.name, value: c.expense, color: c.color }));

  const tooltipStyle = {
    background: "#0f172a",
    border: "1px solid #1f2937",
    color: "#e2e8f0",
  };

  return (
    <section className="grid gap-6 md:grid-cols-3">
      {/* Daily bars */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur p-5 md:col-span-2">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          Daily income vs expense
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} />
              <Bar dataKey="income" name="Income" fill={INCOME_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie by category */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          Expenses by category
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {pieData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {pieData.length === 0 && (
          <div className="text-sm text-slate-400 mt-2">
            No expenses this month.
          </div>
        )}
      </div>
    </section>
  );
}
