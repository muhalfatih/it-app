// Jalankan: pnpm --filter admin media:sweep (cron harian di server).
import { sweepOrphans } from "../lib/kanban/sweep"

const { removed } = await sweepOrphans(new Date())
console.log(`Penyapu media: ${removed.length} objek yatim dihapus`)
process.exit(0)
