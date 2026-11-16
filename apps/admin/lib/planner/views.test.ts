import { describe, expect, it } from "vitest"

import { resolvePeriod } from "./rules"
import { a, entry, staff } from "./test-fixtures"
import {
  toCalendarEvents,
  toListRows,
  toPartitionRows,
  weekDays,
} from "./views"

describe("data tampilan Planner", () => {
  it("event tugas: end eksklusif, judul lengkap", () => {
    const [ev] = toCalendarEvents([
      entry({
        name: "Video Profil",
        assignments: [
          a({
            id: 7,
            userName: "Budi",
            taskTypeName: "Editing",
            start: "2026-11-18",
            end: "2026-11-20",
          }),
        ],
      }),
    ])
    expect(ev).toMatchObject({
      id: "t-7",
      title: "Editing · Budi — Video Profil",
      allDay: true,
    })
    expect(ev.start).toEqual(new Date(2026, 10, 18))
    expect(ev.end).toEqual(new Date(2026, 10, 21))
  })

  it("event tayang ada satu per entri", () => {
    const evs = toCalendarEvents([entry({ id: 3, publishDate: "2026-11-19" })])
    expect(evs.filter((e) => e.data?.kind === "tayang")).toHaveLength(1)
  })

  it("kalender pekerjaan saya: hanya tugas saya + tayang entrinya", () => {
    const evs = toCalendarEvents(
      [
        entry({
          id: 1,
          assignments: [a({ id: 1, userId: "me" }), a({ id: 2, userId: "x" })],
        }),
        entry({ id: 2, assignments: [a({ id: 3, userId: "x" })] }),
      ],
      { myWorkUserId: "me" }
    )
    expect(evs.map((e) => e.id).sort()).toEqual(["p-1", "t-1"])
  })

  it("partisi: penugasan lintas pekan terpotong di periode", () => {
    const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
    const [row] = toPartitionRows(
      [staff("u1", "Budi")],
      [
        entry({
          assignments: [
            a({ userId: "u1", start: "2026-11-13", end: "2026-11-17" }),
          ],
        }),
      ],
      w
    )
    expect(
      Object.keys(row.items).filter((k) => row.items[k].length)
    ).toEqual(["2026-11-16", "2026-11-17"])
  })

  it("partisi: staf nonaktif muncul hanya bila punya tugas di periode", () => {
    const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
    const rows = toPartitionRows(
      [staff("u1", "Ani"), staff("u2", "Budi", true), staff("u3", "Cici", true)],
      [
        entry({
          assignments: [
            a({ userId: "u2", start: "2026-11-16", end: "2026-11-16" }),
          ],
        }),
      ],
      w
    )
    expect(rows.map((r) => r.personId)).toEqual(["u1", "u2"])
  })

  it("partisi pekerjaan saya: hanya baris saya", () => {
    const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
    expect(
      toPartitionRows([staff("u1", "Ani"), staff("me", "Saya")], [], w, {
        myWorkUserId: "me",
      }).map((r) => r.personId)
    ).toEqual(["me"])
  })

  it("weekDays: Minggu hanya bila ada tugas Minggu", () => {
    const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
    const none = toPartitionRows([staff("u1", "Ani")], [], w)
    expect(weekDays(w, none).map((d) => d.key)).toHaveLength(6)
    const sunday = toPartitionRows(
      [staff("u1", "Ani")],
      [
        entry({
          assignments: [
            a({ userId: "u1", start: "2026-11-22", end: "2026-11-22" }),
          ],
        }),
      ],
      w
    )
    expect(weekDays(w, sunday).at(-1)?.key).toBe("2026-11-22")
  })

  it("toListRows terurut dan teks ringkas", () => {
    const rows = toListRows([
      entry({
        id: 2,
        name: "B",
        activityStart: "2026-11-20",
        activityEnd: "2026-11-20",
      }),
      entry({
        id: 1,
        name: "A",
        activityStart: "2026-11-16",
        activityEnd: "2026-11-18",
      }),
    ])
    expect(rows.map((r) => r.id)).toEqual([1, 2])
    expect(rows[0].activity).toBe("16–18 Nov")
  })
})
