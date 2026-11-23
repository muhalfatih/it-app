import { describe, expect, it } from "vitest"

import { overdueMessages } from "./overdue"

describe("overdueMessages", () => {
  it("satu peminjaman: teks per nama peminjam", () => {
    expect(overdueMessages([{ borrower: "Budi", recordedBy: "a" }])).toEqual([
      {
        userId: "a",
        msg: {
          title: "Alat belum dikembalikan",
          body: "Peminjaman Budi melewati jadwal kembali",
          url: "/inventaris/peminjaman",
        },
      },
    ])
  })

  it("digabung per pencatat: satu notifikasi per staf", () => {
    const out = overdueMessages([
      { borrower: "Budi", recordedBy: "a" },
      { borrower: "Sari", recordedBy: "b" },
      { borrower: "Andi", recordedBy: "a" },
    ])
    expect(out.map((o) => [o.userId, o.msg.body])).toEqual([
      ["a", "2 peminjaman melewati jadwal kembali: Budi, Andi"],
      ["b", "Peminjaman Sari melewati jadwal kembali"],
    ])
  })

  it("tanpa peminjaman terlambat: tidak ada notifikasi", () => {
    expect(overdueMessages([])).toEqual([])
  })
})
