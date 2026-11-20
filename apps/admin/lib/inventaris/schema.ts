// Validasi Inventaris (zod murni; dipakai server dan formulir klien).
import { z } from "zod"

import { normalizeWa } from "@/lib/wa"

const id = z.number().int().positive().max(2_147_483_647)
const FUTURE_SLACK_MS = 5 * 60_000
const notFuture = (message: string) =>
  z.date().refine((d) => d.getTime() <= Date.now() + FUTURE_SLACK_MS, { message })

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, { message: `${label} minimal ${min} karakter` })
    .max(max, { message: `${label} maksimal ${max} karakter` })

export const equipmentInputSchema = z.object({
  name: text("Nama alat", 2, 80),
  brand: text("Merek", 1, 80),
  total: z
    .number({ error: "Jumlah wajib diisi" })
    .int({ message: "Jumlah harus bilangan bulat" })
    .min(1, { message: "Jumlah minimal 1" })
    .max(2_147_483_647),
})

export type EquipmentInput = z.infer<typeof equipmentInputSchema>

export const loanInputSchema = z
  .object({
    borrowerName: text("Nama peminjam", 2, 80),
    unitId: id,
    // Opsional: kosong → null; bila diisi harus nomor WA yang valid.
    waNumber: z.string().transform((v, ctx) => {
      if (v.trim() === "") return null
      const n = normalizeWa(v)
      if (!n) ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid" })
      return n
    }),
    startedAt: notFuture("Waktu pinjam tidak boleh di masa depan"),
    dueAt: z.date(),
    items: z
      .array(
        z.object({
          equipmentId: id,
          qty: z.number().int().min(1, { message: "Jumlah minimal 1" }).max(2_147_483_647),
        })
      )
      .min(1, { message: "Tambahkan minimal satu alat" })
      .max(20, { message: "Maksimal 20 alat" })
      .refine((rows) => new Set(rows.map((r) => r.equipmentId)).size === rows.length, {
        message: "Alat tidak boleh ganda",
      }),
  })
  .refine((l) => l.dueAt.getTime() > l.startedAt.getTime(), {
    message: "Batas kembali harus setelah waktu pinjam",
    path: ["dueAt"],
  })

export type LoanInput = z.infer<typeof loanInputSchema>

export const returnInputSchema = z.object({
  returnedAt: notFuture("Waktu kembali tidak boleh di masa depan"),
  items: z.array(
    z
      .object({
        equipmentId: id,
        problemQty: z.number().int().min(0, { message: "Jumlah bermasalah minimal 0" }),
        problemNote: z
          .string()
          .trim()
          .max(500, { message: "Catatan maksimal 500 karakter" })
          .nullable()
          .transform((v) => v || null),
      })
      .refine((r) => r.problemQty === 0 || (r.problemNote?.length ?? 0) >= 3, {
        message: "Catatan minimal 3 karakter bila ada alat bermasalah",
        path: ["problemNote"],
      })
      // Catatan tanpa angka bermasalah tidak disimpan (cek database menolaknya).
      .transform((r) => (r.problemQty === 0 ? { ...r, problemNote: null } : r))
  ),
})

export type ReturnInput = z.infer<typeof returnInputSchema>
