// Jalankan: pnpm --filter admin push:overdue (cron, mis. tiap pagi hari kerja).
// Memberi tahu pencatat peminjaman yang alatnya belum kembali melewati jadwal (§10.2).
import { db } from "@workspace/db/client"
import { and, isNull, lt } from "@workspace/db/orm"
import { loan } from "@workspace/db/schema"

import { overdueMessages } from "../lib/push/overdue"
import { notify } from "../lib/push/send"

const overdue = await db
  .select({ borrower: loan.borrowerName, recordedBy: loan.recordedBy })
  .from(loan)
  .where(and(lt(loan.dueAt, new Date()), isNull(loan.returnedAt)))

// Satu notifikasi per pencatat per hari, berisi semua peminjamannya yang terlambat (keputusan #11).
await Promise.all(
  overdueMessages(overdue).map(({ userId, msg }) => notify({ userIds: [userId] }, msg))
)
console.log(`Peminjaman terlambat: ${overdue.length}`)
process.exit(0)
