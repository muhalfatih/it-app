import { z } from "zod"

const isoDate = z.iso.date({ error: "Tanggal tidak valid" })

export const managerTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Judul minimal 2 karakter")
      .max(120, "Judul maksimal 120 karakter"),
    note: z.string().trim().max(2000, "Catatan maksimal 2000 karakter").optional(),
    startDate: isoDate,
    endDate: isoDate,
    assigneeIds: z.array(z.string()).min(1, "Pilih minimal satu staf"),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "Tanggal selesai harus setelah tanggal mulai",
    path: ["endDate"],
  })

export type ManagerTaskInput = z.input<typeof managerTaskSchema>
