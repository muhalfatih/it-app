// Validasi entri Planner (zod murni; dipakai server dan formulir klien).
import { z } from "zod"

const assignmentMsg = "Setiap penugasan wajib punya orang, jenis, dan tanggal"
const isoDate = (message: string) => z.iso.date({ error: message })

const assignmentSchema = z
  .object({
    id: z.string().optional(),
    personId: z.string({ error: assignmentMsg }).min(1, assignmentMsg),
    taskTypeId: z.string({ error: assignmentMsg }).min(1, assignmentMsg),
    start: isoDate(assignmentMsg),
    end: isoDate(assignmentMsg),
  })
  .refine((a) => a.end >= a.start, {
    message: "Tanggal selesai penugasan tidak boleh sebelum tanggal mulai",
  })

export const entryInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: "Nama konten minimal 2 karakter" })
      .max(120, { message: "Nama konten maksimal 120 karakter" }),
    activityStart: isoDate("Tanggal kegiatan tidak valid").nullable(),
    activityEnd: isoDate("Tanggal kegiatan tidak valid").nullable(),
    publishDate: isoDate("Tanggal tayang wajib diisi"),
    assignments: z
      .array(assignmentSchema)
      .min(1, { message: "Tambahkan minimal satu penugasan" }),
    channelIds: z
      .array(z.number().int().positive())
      .min(1, { message: "Pilih minimal satu kanal" })
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Kanal tidak boleh ganda",
      }),
  })
  .refine((e) => (e.activityStart === null) === (e.activityEnd === null), {
    message: "Isi tanggal mulai dan selesai kegiatan, atau kosongkan keduanya",
    path: ["activityEnd"],
  })
  .refine(
    (e) =>
      e.activityStart === null ||
      e.activityEnd === null ||
      e.activityEnd >= e.activityStart,
    {
      message: "Tanggal selesai kegiatan tidak boleh sebelum tanggal mulai",
      path: ["activityEnd"],
    }
  )

export type EntryInput = z.infer<typeof entryInputSchema>
