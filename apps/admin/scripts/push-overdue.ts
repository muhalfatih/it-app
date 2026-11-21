// Jalankan: pnpm --filter admin push:overdue (cron, mis. tiap pagi hari kerja).
// Memberi tahu pencatat peminjaman yang alatnya belum kembali melewati jadwal (§10.2).
import { db } from "@workspace/db/client"
import { and, isNull, lt } from "@workspace/db/orm"
import { loan } from "@workspace/db/schema"

import { notify } from "../lib/push/send"

const overdue = await db
  .select({ borrower: loan.borrowerName, recordedBy: loan.recordedBy })
  .from(loan)
  .where(and(lt(loan.dueAt, new Date()), isNull(loan.returnedAt)))

// Satu notifikasi per peminjaman; pencatat yang sama bisa menerima beberapa.
await Promise.all(
  overdue.map((l) =>
    notify(
      { userIds: [l.recordedBy] },
      {
        title: "Alat belum dikembalikan",
        body: `Peminjaman ${l.borrower} melewati jadwal kembali`,
        url: "/inventaris/peminjaman",
      }
    )
  )
)
console.log(`Peminjaman terlambat: ${overdue.length}`)
process.exit(0)
