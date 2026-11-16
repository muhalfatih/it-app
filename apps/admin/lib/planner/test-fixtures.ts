// Default sengaja di luar pekan uji (Oktober): tiap tes hanya mengandalkan tanggal yang ia set sendiri.
import type { PlannerAssignment, PlannerEntry, StaffMember } from "./types"

export function a(patch: Partial<PlannerAssignment> = {}): PlannerAssignment {
  return {
    id: 1,
    userId: "u1",
    userName: "Budi",
    taskTypeId: 1,
    taskTypeName: "Editing",
    start: "2026-10-06",
    end: "2026-10-06",
    ...patch,
  }
}

export function entry(patch: Partial<PlannerEntry> = {}): PlannerEntry {
  return {
    id: 1,
    name: "Konten",
    activityStart: null,
    activityEnd: null,
    publishDate: "2026-10-07",
    stage: "ide",
    updatedAt: "2026-10-01T00:00:00.000Z",
    assignments: [a()],
    channels: [{ id: 1, name: "Instagram" }],
    ...patch,
  }
}

export function staff(id: string, name: string, disabled = false): StaffMember {
  return { id, name, disabled }
}
