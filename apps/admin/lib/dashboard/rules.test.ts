import { describe, expect, it } from "vitest"

import type { PlannerEntry } from "../planner/types"
import { dayScore } from "../report/rules"
import type { RecapDay } from "../report/recap"
import {
  attendancePerDay,
  entriesPerDay,
  weekStartOf,
  weeklyAverages,
  workloadPerPerson,
} from "./rules"

describe("attendancePerDay", () => {
  it("tanpa baris dihitung hadir, staf lain diabaikan", () => {
    const [d] = attendancePerDay(
      ["2026-11-23"],
      ["a", "b", "c"],
      [
        { userId: "a", date: "2026-11-23", status: "sakit" },
        { userId: "x", date: "2026-11-23", status: "izin" },
      ]
    )
    expect(d).toMatchObject({ hadir: 2, sakit: 1, izin: 0, tanpa_keterangan: 0 })
  })
})

describe("weeklyAverages", () => {
  const day = (date: string, done: number, total: number): RecapDay => {
    const tasks = Array.from({ length: total }, (_, i) => ({
      key: `rutin:${i}`,
      source: "rutin" as const,
      title: "t",
      status: i < done ? ("T" as const) : null,
      overdueDays: 0,
    }))
    const answers = new Map(
      tasks.flatMap((t) => (t.status ? [[t.key, t.status] as const] : []))
    )
    return { date, state: "dikirim", tasks, obstacles: "", score: dayScore(tasks, answers) }
  }
  it("merata-ratakan per pekan; pekan kosong null", () => {
    const r = weeklyAverages(
      ["2026-11-16", "2026-11-23"],
      [day("2026-11-24", 1, 2), day("2026-11-25", 2, 2)]
    )
    expect(r[0]!.average).toBeNull()
    expect(r[1]!.average).toBe(75)
  })
})

const entry = (
  id: number,
  assignments: { userId: string; userName: string; start: string; end: string }[],
  over: Partial<PlannerEntry> = {}
): PlannerEntry => ({
  id,
  name: `E${id}`,
  activityStart: null,
  activityEnd: null,
  publishDate: "2026-12-30",
  stage: "ide",
  updatedAt: "",
  channels: [],
  assignments: assignments.map((a, i) => ({ id: i, taskTypeId: 1, taskTypeName: "x", ...a })),
  ...over,
})

describe("workloadPerPerson", () => {
  it("hanya penugasan yang beririsan, urut terbanyak lalu nama", () => {
    const rows = workloadPerPerson(
      [
        entry(1, [
          { userId: "b", userName: "Budi", start: "2026-11-23", end: "2026-11-24" },
          { userId: "a", userName: "Ani", start: "2026-11-23", end: "2026-11-23" },
          { userId: "c", userName: "Cici", start: "2026-12-10", end: "2026-12-11" },
        ]),
        entry(2, [{ userId: "b", userName: "Budi", start: "2026-11-29", end: "2026-12-02" }]),
      ],
      "2026-11-23",
      "2026-11-29"
    )
    expect(rows.map((r) => [r.name, r.count])).toEqual([
      ["Budi", 2],
      ["Ani", 1],
    ])
  })
})

describe("entriesPerDay", () => {
  it("memakai rentang kegiatan, penugasan, dan tanggal tayang", () => {
    const e = [
      entry(1, [], { activityStart: "2026-11-23", activityEnd: "2026-11-24" }),
      entry(2, [], { publishDate: "2026-11-25" }),
    ]
    const r = entriesPerDay(e, ["2026-11-24", "2026-11-25", "2026-11-26"])
    expect(r.map((d) => d.entries.map((x) => x.id))).toEqual([[1], [2], []])
  })
})

describe("weekStartOf", () => {
  it("Senin pekan itu", () => {
    expect(weekStartOf("2026-11-29")).toBe("2026-11-23")
  })
})
