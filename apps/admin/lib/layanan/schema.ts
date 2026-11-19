// Validasi Layanan (zod murni; dipakai server dan formulir klien).
import { ISSUES, OTHERS_AFFECTED } from "@workspace/db/schema"
import { z } from "zod"

import { normalizeWa } from "./rules"

const isoDate = (message: string) => z.iso.date({ error: message })
const id = z.number().int().positive().max(2_147_483_647)

export const reasonSchema = z
  .string()
  .trim()
  .min(3, { message: "Isi minimal 3 karakter" })
  .max(500, { message: "Isi maksimal 500 karakter" })

export const requestInputSchema = z
  .object({
    activityName: z
      .string()
      .trim()
      .min(2, { message: "Nama kegiatan minimal 2 karakter" })
      .max(120, { message: "Nama kegiatan maksimal 120 karakter" }),
    startDate: isoDate("Tanggal mulai tidak valid"),
    endDate: isoDate("Tanggal selesai tidak valid"),
    unitId: id,
    waNumber: z.string().transform((v, ctx) => {
      const n = normalizeWa(v)
      if (!n) ctx.addIssue({ code: "custom", message: "Nomor WhatsApp tidak valid" })
      return n ?? ""
    }),
    feeAgreed: z.literal(true, { error: "Persetujuan fee wajib dicentang" }),
    needs: z
      .array(z.object({ taskTypeId: id }))
      .min(1, { message: "Tambahkan minimal satu kebutuhan SDM" })
      .max(20, { message: "Maksimal 20 kebutuhan SDM" }),
    rundownKey: z.string().nullable(),
    rundownName: z.string().nullable(),
  })
  .refine((r) => r.endDate >= r.startDate, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["endDate"],
  })

export type RequestInput = z.infer<typeof requestInputSchema>

export const approveTasksSchema = z.object({
  rows: z
    .array(
      z
        .object({
          personId: z.string().min(1),
          taskTypeId: id,
          start: isoDate("Tanggal tidak valid"),
          end: isoDate("Tanggal tidak valid"),
        })
        .refine((r) => r.end >= r.start, {
          message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
        })
    )
    .min(1, { message: "Tambahkan minimal satu baris" })
    .max(20, { message: "Maksimal 20 baris" }),
  note: z.string().trim().max(500, { message: "Catatan maksimal 500 karakter" }).nullable(),
})

export const complaintInputSchema = z.object({
  buildingId: id,
  room: z.string().trim().min(1, { message: "Ruangan wajib diisi" }).max(80),
  issue: z.enum(ISSUES),
  startedAt: z.date().refine((d) => d.getTime() <= Date.now() + 5 * 60_000, {
    message: "Waktu mulai tidak boleh di masa depan",
  }),
  othersAffected: z.enum(OTHERS_AFFECTED),
  description: z.string().trim().max(1000).nullable(),
})

export type ComplaintInput = z.infer<typeof complaintInputSchema>
