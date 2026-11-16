"use server"

import { withPermission } from "@workspace/auth/session"
import { building, unit } from "@workspace/db/schema"

import { addRow, updateRow } from "@/lib/setting-crud"

const PATH = "/setting/unit-gedung"
type Patch = { name?: string; active?: boolean }

export const addUnit = withPermission("setting.kelola", async (name: string) =>
  addRow(unit, PATH, name)
)
export const updateUnit = withPermission(
  "setting.kelola",
  async (id: number, patch: Patch) => updateRow(unit, PATH, id, patch)
)
export const addBuilding = withPermission(
  "setting.kelola",
  async (name: string) => addRow(building, PATH, name)
)
export const updateBuilding = withPermission(
  "setting.kelola",
  async (id: number, patch: Patch) => updateRow(building, PATH, id, patch)
)
