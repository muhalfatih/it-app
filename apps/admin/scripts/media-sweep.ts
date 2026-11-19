// Jalankan: pnpm --filter admin media:sweep (cron harian di server).
import { sweepOrphans } from "../lib/kanban/sweep"
import { sweepRundowns } from "../lib/layanan/rundown"

const { removed } = await sweepOrphans(new Date())
console.log(`Penyapu media: ${removed.length} objek yatim dihapus`)
const rundowns = await sweepRundowns(new Date())
console.log(`Penyapu rundown: ${rundowns.removed.length} objek yatim dihapus`)
process.exit(0)
