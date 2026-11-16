"use server"

import { z } from "zod"

import { withPermission } from "@workspace/auth/session"
import { db } from "@workspace/db/client"
import { eq } from "@workspace/db/orm"
import { routineTask, userRole } from "@workspace/db/schema"

import { guarded, nameSchema } from "@/lib/setting-crud"

const PATH = "/setting/tugas-rutin"

export const addRoutineTask = withPermission(
  "setting.kelola",
  async (userId: string, title: string) =>
    guarded(PATH, async () => {
      const id = z.string().min(1).parse(userId)
      // Tugas rutin hanya untuk staf unit (akun yang punya peran).
      const [staff] = await db
        .select({ userId: userRole.userId })
        .from(userRole)
        .where(eq(userRole.userId, id))
        .limit(1)
      if (!staff)
        throw new z.ZodError([
          {
            code: "custom",
            path: ["userId"],
            message: "Orang itu bukan staf unit",
            input: id,
          },
        ])
      await db
        .insert(routineTask)
        .values({ userId: id, title: nameSchema.parse(title) })
    })
)

export const updateRoutineTask = withPermission(
  "setting.kelola",
  async (id: number, patch: { name?: string; active?: boolean }) =>
    guarded(PATH, async () => {
      const rowId = z.number().int().positive().parse(id)
      const parsed = z
        .object({ name: nameSchema.optional(), active: z.boolean().optional() })
        .parse(patch)
      await db
        .update(routineTask)
        .set({ title: parsed.name, active: parsed.active })
        .where(eq(routineTask.id, rowId))
    })
)
