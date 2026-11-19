import { describe, expect, it } from "vitest"

import {
  type ReportTask,
  REPORT_START_DATE,
  adjacentReportDay,
  dayScore,
  firstReportDay,
  isEditable,
  isReportDay,
  isWorkday,
  lockDeadline,
  needsUpdate,
  reportState,
  scoreLabel,
  taskKey,
  tasksForDay,
  workdaysBetween,
} from "./rules"

const H = new Set(["2026-12-07"]) // Senin libur

describe("tanggal laporan", () => {
  it("hari kerja = Senin–Sabtu bukan libur", () => {
    expect(isWorkday("2026-12-05", H)).toBe(true)
    expect(isWorkday("2026-12-06", H)).toBe(false)
    expect(isWorkday("2026-12-07", H)).toBe(false)
  })

  it("batas kunci: pukul 10.00 WIB hari kerja berikutnya", () => {
    expect(lockDeadline("2026-12-05", H).toISOString()).toBe("2026-12-08T03:00:00.000Z")
    expect(lockDeadline("2026-12-02", new Set()).toISOString()).toBe("2026-12-03T03:00:00.000Z")
    expect(lockDeadline("2026-12-05", new Set()).toISOString()).toBe("2026-12-07T03:00:00.000Z")
  })

  it("hari laporan pertama = yang lebih akhir dari go-live dan akun dibuat (WIB)", () => {
    expect(firstReportDay(new Date("2026-11-01T00:00:00Z"))).toBe(REPORT_START_DATE)
    expect(firstReportDay(new Date("2026-12-09T20:00:00Z"))).toBe("2026-12-10")
  })

  it("isReportDay menolak masa depan, sebelum awal, dan Minggu", () => {
    expect(isReportDay("2026-12-03", H, "2026-12-01", "2026-12-02")).toBe(false)
    expect(isReportDay("2026-11-30", H, "2026-12-01", "2026-12-02")).toBe(false)
    expect(isReportDay("2026-12-06", H, "2026-12-01", "2026-12-08")).toBe(false)
    expect(isReportDay("2026-12-02", H, "2026-12-01", "2026-12-02")).toBe(true)
  })

  it("workdaysBetween menghitung hari kerja di (after, upTo]", () => {
    expect(workdaysBetween("2026-12-04", "2026-12-08", H)).toBe(2)
  })
})

const none = new Set<string>()
const base = {
  routine: [],
  planner: [],
  manager: [],
  self: [],
  tuntasBefore: none,
  holidays: new Set<string>(),
}
const plan = [
  { id: 1, title: "Editing — Pentas", startDate: "2026-12-01", endDate: "2026-12-02" },
]

describe("tasksForDay", () => {
  it("tugas beberapa hari muncul tiap hari, lalu Tertunda dalam hari kerja", () => {
    const at = (date: string, tuntasBefore = none) =>
      tasksForDay({ ...base, planner: plan, date, tuntasBefore })
    expect(at("2026-12-01")[0]?.overdueDays).toBe(0)
    expect(at("2026-12-02")[0]?.overdueDays).toBe(0)
    expect(at("2026-12-04")[0]?.overdueDays).toBe(2)
    expect(at("2026-12-03", new Set(["planner:1"]))).toEqual([])
    expect(at("2026-11-30")).toEqual([])
  })

  it("tugas manajer yang digeser ke depan tidak muncul sebelum mulai", () => {
    const manager = [
      { id: 1, title: "Rapat", startDate: "2026-12-05", endDate: "2026-12-05" },
    ]
    expect(tasksForDay({ ...base, manager, date: "2026-12-03" })).toEqual([])
  })

  it("urutan rutin, planner, manajer, sendiri", () => {
    const r = tasksForDay({
      ...base,
      date: "2026-12-01",
      self: [{ id: 1, title: "s" }],
      manager: [
        { id: 1, title: "m", startDate: "2026-12-01", endDate: "2026-12-01" },
      ],
      planner: plan,
      routine: [{ id: 1, title: "r" }],
    })
    expect(r.map((t) => t.key)).toEqual([
      "rutin:1",
      "planner:1",
      "manajer:1",
      "sendiri:1",
    ])
    expect(taskKey("rutin", 1)).toBe("rutin:1")
  })
})

describe("dayScore & scoreLabel", () => {
  const tasks = [
    ...[1, 2, 3, 4].map((i) => ({ key: `rutin:${i}`, source: "rutin" as const })),
    ...[1, 2, 3, 4, 5].map((i) => ({ key: `planner:${i}`, source: "planner" as const })),
    ...[1, 2].map((i) => ({ key: `manajer:${i}`, source: "manajer" as const })),
  ]
  const answers = new Map<string, "T" | "TL">(
    tasks.slice(0, 6).map((t) => [t.key, "T"] as [string, "T"])
  )
  answers.set("manajer:1", "TL")
  it("hitung tuntas per sumber dan label", () => {
    const s = dayScore(tasks, answers)
    expect(s.done).toBe(6)
    expect(s.total).toBe(11)
    expect(s.bySource.planner.total).toBe(5)
    expect(scoreLabel(s)).toBe("6 dari 11 tuntas · 54,5%")
    expect(scoreLabel(dayScore([], new Map()))).toBeNull()
  })
})

describe("needsUpdate", () => {
  const cur: ReportTask[] = [
    { key: "a:1", source: "rutin", title: "A", overdueDays: 0 },
  ]
  it("true hanya bila sudah dikirim dan himpunan key|title berbeda", () => {
    expect(needsUpdate(null, cur)).toBe(false)
    expect(needsUpdate([{ key: "a:1", title: "A" }], cur)).toBe(false)
    expect(needsUpdate([{ key: "a:1", title: "B" }], cur)).toBe(true)
    expect(needsUpdate([], cur)).toBe(true)
    expect(
      needsUpdate([{ key: "a:1", title: "A" }, { key: "a:2", title: "Z" }], cur)
    ).toBe(true)
  })
})

describe("reportState", () => {
  const i = {
    workday: true,
    inRange: true,
    attendance: null,
    frozen: false,
    editable: true,
    submitted: false,
    stale: false,
  } as const
  it("urutan prioritas", () => {
    expect(reportState({ ...i, attendance: "sakit", frozen: true })).toBe("disembunyikan")
    expect(reportState({ ...i, workday: false })).toBe("libur")
    expect(reportState({ ...i, inRange: false })).toBe("bukan_hari_laporan")
    expect(reportState({ ...i, frozen: true, submitted: true })).toBe("terkunci")
    expect(reportState({ ...i, submitted: true, stale: true })).toBe("perlu_diperbarui")
    expect(reportState({ ...i, submitted: true })).toBe("dikirim")
    expect(reportState(i)).toBe("terbuka")
  })
})

describe("isEditable", () => {
  const e = { date: "2026-12-03", holidays: new Set<string>(), unlocked: false, frozen: false }
  it("sebelum 10.00 WIB hari berikutnya, atau dibuka kuncinya", () => {
    expect(isEditable({ ...e, now: new Date("2026-12-04T02:59:00Z") })).toBe(true)
    expect(isEditable({ ...e, now: new Date("2026-12-04T03:00:00Z") })).toBe(false)
    expect(isEditable({ ...e, now: new Date("2026-12-09T03:00:00Z"), unlocked: true })).toBe(true)
    expect(
      isEditable({ ...e, now: new Date("2026-12-04T00:00:00Z"), unlocked: true, frozen: true })
    ).toBe(false)
  })
})

describe("adjacentReportDay", () => {
  const first = "2026-12-01"
  const today = "2026-12-09"
  it("melompati Minggu dan hari libur, berhenti di batas awal dan hari ini", () => {
    expect(adjacentReportDay("2026-12-08", -1, H, first, today)).toBe("2026-12-05")
    expect(adjacentReportDay("2026-12-05", 1, H, first, today)).toBe("2026-12-08")
    expect(adjacentReportDay("2026-12-09", 1, H, first, today)).toBeNull()
    expect(adjacentReportDay("2026-12-01", -1, H, first, today)).toBeNull()
  })
})
