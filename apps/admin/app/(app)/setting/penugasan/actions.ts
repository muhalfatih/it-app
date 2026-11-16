"use server"

import { withPermission } from "@workspace/auth/session"
import { taskType } from "@workspace/db/schema"

import { addRow, updateRow } from "@/lib/setting-crud"

const PATH = "/setting/penugasan"

export const addTaskType = withPermission(
  "setting.kelola",
  async (name: string) => addRow(taskType, PATH, name)
)

export const updateTaskType = withPermission(
  "setting.kelola",
  async (id: number, patch: { name?: string; active?: boolean }) =>
    updateRow(taskType, PATH, id, patch)
)
