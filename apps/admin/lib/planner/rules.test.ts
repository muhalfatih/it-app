import { describe, expect, it } from "vitest"

import { permissionsFor } from "@workspace/auth/permissions"

import {
  applyMyWork,
  buildPlannerHref,
  canDeleteEntry,
  inPeriod,
  needsNameConfirm,
  parsePlannerParams,
  resolvePeriod,
  shiftPeriod,
  sortKey,
  todayWib,
} from "./rules"
import { a, entry } from "./test-fixtures"

describe("aturan Planner", () => {
  it("todayWib memakai WIB, bukan UTC", () => {
    expect(todayWib(new Date("2026-11-15T17:30:00Z"))).toBe("2026-11-16")
  })

  it("pekan = Senin–Minggu", () => {
    expect(resolvePeriod({ tanggal: "2026-11-18", rentang: "pekan" })).toEqual({
      kind: "pekan",
      start: "2026-11-16",
      end: "2026-11-22",
    })
    expect(
      resolvePeriod({ tanggal: "2026-11-22", rentang: "pekan" }).start
    ).toBe("2026-11-16")
  })

  it("pekan lintas tahun dan bulan Februari", () => {
    expect(resolvePeriod({ tanggal: "2027-01-01", rentang: "pekan" })).toEqual({
      kind: "pekan",
      start: "2026-12-28",
      end: "2027-01-03",
    })
    expect(resolvePeriod({ tanggal: "2027-02-10", rentang: "bulan" })).toEqual({
      kind: "bulan",
      start: "2027-02-01",
      end: "2027-02-28",
    })
  })

  it("shiftPeriod pekan dan bulan", () => {
    const w = resolvePeriod({ tanggal: "2026-11-18", rentang: "pekan" })
    expect(shiftPeriod(w, -1)).toBe("2026-11-09")
    const m = resolvePeriod({ tanggal: "2026-01-31", rentang: "bulan" })
    expect(shiftPeriod(m, 1)).toBe("2026-02-01")
  })

  it("parsePlannerParams: nilai rusak jatuh ke default", () => {
    const now = new Date("2026-11-18T03:00:00Z")
    for (const tanggal of ["2026-02-30", "abc", ["2026-11-01", "2026-11-02"]])
      expect(parsePlannerParams({ tanggal }, ["manajer"], now).tanggal).toBe(
        "2026-11-18"
      )
    expect(
      parsePlannerParams({ tampilan: "x" }, ["manajer"], now).tampilan
    ).toBe("daftar")
    expect(
      parsePlannerParams(
        { tampilan: "kalender", rentang: "bulan" },
        ["manajer"],
        now
      ).rentang
    ).toBe("pekan")
  })

  it("parsePlannerParams: default saya per peran, saya=0 mematikan", () => {
    expect(parsePlannerParams({}, ["sdm_khusus"]).saya).toBe(true)
    expect(parsePlannerParams({}, ["sdm_khusus", "sdm_strategi"]).saya).toBe(
      false
    )
    expect(parsePlannerParams({ saya: "0" }, ["sdm_khusus"]).saya).toBe(false)
    expect(parsePlannerParams({ saya: "1" }, ["manajer"]).saya).toBe(true)
  })

  it("inPeriod lewat kegiatan, penugasan, atau tayang saja", () => {
    const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
    expect(
      inPeriod(
        entry({ activityStart: "2026-11-10", activityEnd: "2026-11-16" }),
        w
      )
    ).toBe(true)
    expect(
      inPeriod(
        entry({ assignments: [a({ start: "2026-11-13", end: "2026-11-17" })] }),
        w
      )
    ).toBe(true)
    expect(inPeriod(entry({ publishDate: "2026-11-22" }), w)).toBe(true) // Minggu
    expect(inPeriod(entry({ publishDate: "2026-11-23" }), w)).toBe(false)
  })

  it("sortKey: kegiatan, lalu penugasan paling awal", () => {
    expect(
      sortKey(
        entry({
          activityStart: "2026-11-20",
          activityEnd: "2026-11-20",
          assignments: [a({ start: "2026-11-01", end: "2026-11-02" })],
        })
      )
    ).toBe("2026-11-20")
    expect(
      sortKey(
        entry({
          activityStart: null,
          activityEnd: null,
          assignments: [
            a({ start: "2026-11-05", end: "2026-11-06" }),
            a({ start: "2026-11-03", end: "2026-11-03" }),
          ],
        })
      )
    ).toBe("2026-11-03")
  })

  it("applyMyWork: hanya penugasan saya yang beririsan periode", () => {
    const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
    const mine = entry({
      id: 1,
      assignments: [a({ userId: "me", start: "2026-11-17", end: "2026-11-17" })],
    })
    const otherWeek = entry({
      id: 2,
      assignments: [
        a({ userId: "me", start: "2026-11-30", end: "2026-11-30" }),
        a({ userId: "x", start: "2026-11-17", end: "2026-11-17" }),
      ],
    })
    expect(applyMyWork([mine, otherWeek], "me", w).map((e) => e.id)).toEqual([
      1,
    ])
  })

  it("canDeleteEntry dan needsNameConfirm per tahap", () => {
    const strategi = permissionsFor(["sdm_strategi"])
    const manajer = permissionsFor(["manajer"])
    expect(canDeleteEntry(strategi, "draft")).toBe(true)
    expect(canDeleteEntry(strategi, "review")).toBe(false)
    expect(canDeleteEntry(manajer, "tayang")).toBe(true)
    expect(canDeleteEntry(permissionsFor(["sdm_khusus"]), "ide")).toBe(false)
    expect(needsNameConfirm("ide")).toBe(false)
    expect(needsNameConfirm("disetujui")).toBe(true)
  })

  it("buildPlannerHref menulis saya eksplisit dan rentang hanya untuk daftar", () => {
    const p = {
      tampilan: "kalender",
      tanggal: "2026-11-16",
      rentang: "pekan",
      saya: false,
    } as const
    expect(buildPlannerHref(p, {})).toBe(
      "/planner?tampilan=kalender&tanggal=2026-11-16&saya=0"
    )
    expect(buildPlannerHref(p, { tampilan: "daftar", rentang: "bulan" })).toBe(
      "/planner?tampilan=daftar&tanggal=2026-11-16&rentang=bulan&saya=0"
    )
  })
})
