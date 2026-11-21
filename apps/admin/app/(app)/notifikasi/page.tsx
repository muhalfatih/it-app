import { requireUser } from "@workspace/auth/session"
import { Separator } from "@workspace/ui/components/separator"

import { PushPanel } from "./_push"

export const metadata = { title: "Notifikasi · Unit IT & Media" }

const EVENTS: { what: string; who: string }[] = [
  { what: "Penugasan Media Planner baru atau berubah", who: "Orang yang ditugaskan" },
  { what: "Tugas dari Manajer baru atau berubah", who: "Orang yang ditugaskan" },
  { what: "Laporan harian dibuka untuk diisi ulang", who: "Pemilik laporan" },
  { what: "Pengingat laporan yang belum dikirim, pukul 15.45 WIB", who: "Staf pelapor" },
  { what: "Kartu konten masuk Review", who: "Manajer" },
  { what: "Kartu konten dikembalikan untuk revisi", who: "Orang yang ditugaskan" },
  { what: "Pengajuan SDM baru", who: "Manajer" },
  { what: "Status pengajuan SDM berubah", who: "Pengaju" },
  { what: "Alat belum dikembalikan melewati jadwal", who: "Pencatat peminjaman" },
]

export default async function NotifikasiPage() {
  await requireUser()

  return (
    <div className="flex max-w-2xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Notifikasi</h1>
        <p className="text-sm text-muted-foreground">
          Dapatkan pemberitahuan di HP atau laptop saat ada pekerjaan untuk
          Anda, walau aplikasi sedang tidak dibuka.
        </p>
      </div>

      <PushPanel publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />

      <section className="flex flex-col gap-3" aria-labelledby="pasang">
        <h2 id="pasang" className="text-base font-semibold">
          Pasang di layar utama
        </h2>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">Android (Chrome)</h3>
            <p className="text-muted-foreground">
              Buka menu ⋮, pilih <strong>Instal aplikasi</strong> atau{" "}
              <strong>Tambahkan ke layar utama</strong>.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">iPhone/iPad (Safari, iOS 16.4+)</h3>
            <p className="text-muted-foreground">
              Ketuk tombol Bagikan, pilih{" "}
              <strong>Tambahkan ke Layar Utama</strong>, lalu buka aplikasi dari
              ikonnya. Di iOS, notifikasi hanya bisa diaktifkan dari sana.
            </p>
          </div>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-3" aria-labelledby="kapan">
        <h2 id="kapan" className="text-base font-semibold">
          Kapan Anda diberi tahu
        </h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[1fr_auto]">
          {EVENTS.map((e) => (
            <div key={e.what} className="contents">
              <dt>{e.what}</dt>
              <dd className="text-muted-foreground max-sm:mb-2">{e.who}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          Pengaduan Internet tidak memicu notifikasi. Anda tidak diberi tahu
          tentang perubahan yang Anda buat sendiri.
        </p>
      </section>
    </div>
  )
}
