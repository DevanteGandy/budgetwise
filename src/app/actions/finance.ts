"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CatType, Prisma } from "@prisma/client";


const newTxnSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number(), // dollars from form; we'll convert to cents
  note: z.string().optional(),
  categoryId: z.string().optional(),
});

export async function createTransaction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const data = newTxnSchema.parse(raw);

  await prisma.transaction.create({
    data: {
      date: data.date,
      amountCents: Math.round(data.amount * 100),
      note: data.note || null,
      categoryId: data.categoryId || null,
    },
  });

  revalidatePath("/");
}

export async function deleteTransaction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/");
}

const catSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["INCOME","EXPENSE"]),
  color: z.string().optional(), // e.g. #10b981
});

export async function createCategory(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const data = catSchema.parse(raw);
  await prisma.category.create({
    data: { name: data.name, type: data.type as CatType, color: data.color || null },
  });
  revalidatePath("/");
}

export async function seedDemo() {
  // Upsert core categories (idempotent)
  const [work, food, rent, fun] = await Promise.all([
    prisma.category.upsert({
      where: { name: "Work" },
      update: {},
      create: { name: "Work", type: "INCOME", color: "#10b981" },
    }),
    prisma.category.upsert({
      where: { name: "Food" },
      update: {},
      create: { name: "Food", type: "EXPENSE", color: "#ef4444" },
    }),
    prisma.category.upsert({
      where: { name: "Rent" },
      update: {},
      create: { name: "Rent", type: "EXPENSE", color: "#3b82f6" },
    }),
    prisma.category.upsert({
      where: { name: "Entertainment" },
      update: {},
      create: { name: "Entertainment", type: "EXPENSE", color: "#a855f7" },
    }),
  ]);

  // Spread a few txns across the current month
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = (day: number) => new Date(y, m, day);

  // Insert sample transactions (positive = income, negative = expense)
  await prisma.transaction.createMany({
    data: [
      { date: d(2),  amountCents:  200000, note: "Paycheck",      categoryId: work.id },
      { date: d(3),  amountCents:   -3999, note: "Groceries",     categoryId: food.id },
      { date: d(5),  amountCents:   -1899, note: "Coffee",        categoryId: food.id },
      { date: d(10), amountCents: -120000, note: "Monthly Rent",  categoryId: rent.id },
      { date: d(14), amountCents:   -1299, note: "Movie night",   categoryId: fun.id },
      { date: d(21), amountCents:  200000, note: "Paycheck",      categoryId: work.id },
      { date: d(22), amountCents:   -2599, note: "Groceries",     categoryId: food.id },
    ],
    skipDuplicates: true,
  });

  // Revalidate the dashboard so the new data shows immediately
  revalidatePath("/");
}