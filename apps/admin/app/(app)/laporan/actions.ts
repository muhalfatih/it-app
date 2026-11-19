"use server"

import { getCurrentUser, withPermission } from "@workspace/auth/session"
import type { AnswerStatus } from "@workspace/db/schema/stages"

import type { IsoDate } from "@/lib/planner/types"
import {
  addSelfTask,
  deleteSelfTask,
  renameSelfTask,
  saveNotes,
  setAnswer,
  submitReport,
} from "@/lib/report/mutations"
import { guarded, type CrudResult } from "@/lib/setting-crud"

// userId selalu dari sesi, tidak pernah dari klien.
const PATH = "/laporan"

export const answerTask = withPermission(
  "laporan.isi",
  async (
    date: IsoDate,
    key: string,
    status: AnswerStatus
  ): Promise<CrudResult> => {
    const user = await getCurrentUser()
    return guarded(PATH, () => setAnswer(user!.id, date, key, status))
  }
)

export const saveReportNotes = withPermission(
  "laporan.isi",
  async (
    date: IsoDate,
    obstacles: string,
    priorities: string
  ): Promise<CrudResult> => {
    const user = await getCurrentUser()
    return guarded(PATH, () => saveNotes(user!.id, date, obstacles, priorities))
  }
)

export const addOwnTask = withPermission(
  "laporan.isi",
  async (date: IsoDate, title: string): Promise<CrudResult> => {
    const user = await getCurrentUser()
    return guarded(PATH, async () => {
      await addSelfTask(user!.id, date, title)
    })
  }
)

export const renameOwnTask = withPermission(
  "laporan.isi",
  async (id: number, title: string): Promise<CrudResult> => {
    const user = await getCurrentUser()
    return guarded(PATH, () => renameSelfTask(user!.id, id, title))
  }
)

export const removeOwnTask = withPermission(
  "laporan.isi",
  async (id: number): Promise<CrudResult> => {
    const user = await getCurrentUser()
    return guarded(PATH, () => deleteSelfTask(user!.id, id))
  }
)

export const sendReport = withPermission(
  "laporan.isi",
  async (date: IsoDate): Promise<CrudResult> => {
    const user = await getCurrentUser()
    return guarded(PATH, () => submitReport(user!.id, date))
  }
)
