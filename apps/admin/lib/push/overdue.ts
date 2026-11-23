// Modul murni: pengingat peminjaman terlambat, satu notifikasi per pencatat (keputusan #11).
import type { PushMessage } from "./send"

export function overdueMessages(
  loans: { borrower: string; recordedBy: string }[]
): { userId: string; msg: PushMessage }[] {
  const byStaff = new Map<string, typeof loans>()
  for (const l of loans) byStaff.set(l.recordedBy, [...(byStaff.get(l.recordedBy) ?? []), l])
  return [...byStaff].map(([userId, list]) => ({
    userId,
    msg: {
      title: "Alat belum dikembalikan",
      body:
        list.length === 1
          ? `Peminjaman ${list[0]!.borrower} melewati jadwal kembali`
          : `${list.length} peminjaman melewati jadwal kembali: ${list.map((l) => l.borrower).join(", ")}`,
      url: "/inventaris/peminjaman",
    },
  }))
}
