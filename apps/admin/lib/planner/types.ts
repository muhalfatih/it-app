import type { ContentStage } from "@workspace/db/schema/stages"

export type IsoDate = string // yyyy-MM-dd

export type PlannerAssignment = {
  id: number
  userId: string
  userName: string
  taskTypeId: number
  taskTypeName: string
  start: IsoDate
  end: IsoDate
}

export type PlannerEntry = {
  id: number
  name: string
  activityStart: IsoDate | null
  activityEnd: IsoDate | null
  publishDate: IsoDate
  stage: ContentStage
  /** ISO instan; versi untuk mendeteksi formulir basi. */
  updatedAt: string
  assignments: PlannerAssignment[]
  channels: { id: number; name: string }[]
}

/** Inklusif di kedua ujung. */
export type Period = { kind: "pekan" | "bulan"; start: IsoDate; end: IsoDate }

export type PlannerView = "daftar" | "kalender" | "partisi"

export type PlannerParams = {
  tampilan: PlannerView
  tanggal: IsoDate
  rentang: "pekan" | "bulan"
  saya: boolean
}

export type StaffMember = { id: string; name: string; disabled: boolean }
