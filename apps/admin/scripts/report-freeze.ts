// Jalankan: pnpm --filter admin report:freeze (cron harian, mis. setelah pukul 10.00 WIB).
// Membekukan laporan harian yang lewat batas kunci walau tidak ada yang membukanya.
import { freezeDue } from "../lib/report/freeze"
import { listReporters } from "../lib/report/queries"

const people = await listReporters()
const frozen = await freezeDue(
  people.map((p) => p.id),
  new Date()
)
console.log(`Pembeku laporan: ${frozen} hari laporan dibekukan untuk ${people.length} staf`)
process.exit(0)
