"use server"

import { getCurrentUser, withPermission } from "@workspace/auth/session"

import {
  createEquipment,
  deleteEquipment,
  resolveProblem,
  setEquipmentActive,
  updateEquipment,
} from "@/lib/inventaris/mutations"
import type { CrudResult } from "@/lib/setting-crud"

export const createEquipmentAction = withPermission(
  "inventaris.kelola",
  async (input: unknown): Promise<CrudResult<number>> => createEquipment(input)
)

export const updateEquipmentAction = withPermission(
  "inventaris.kelola",
  async (id: number, input: unknown): Promise<CrudResult> =>
    updateEquipment(id, input)
)

export const setEquipmentActiveAction = withPermission(
  "inventaris.kelola",
  async (id: number, active: boolean): Promise<CrudResult> =>
    setEquipmentActive(id, active)
)

export const deleteEquipmentAction = withPermission(
  "inventaris.kelola",
  async (id: number): Promise<CrudResult> => deleteEquipment(id)
)

export const resolveProblemAction = withPermission(
  "inventaris.kelola",
  async (loanId: number, equipmentId: number): Promise<CrudResult> => {
    const user = await getCurrentUser()
    if (!user) return { error: "Sesi berakhir" }
    return resolveProblem(loanId, equipmentId, user.id)
  }
)
