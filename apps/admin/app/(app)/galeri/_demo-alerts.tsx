import {
  BoxIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  EyeIcon,
  LockIcon,
  RefreshCwIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/reui/alert"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"

/** Ringkasan hal yang perlu ditindaklanjuti hari ini (pola c-alert-17: alert bertumpuk dalam Frame). */
const TODAY = [
  {
    variant: "warning",
    icon: ClipboardListIcon,
    title: "Laporan hari ini belum dikirim",
    description: "Pengingat 15.45 WIB. Terkunci besok pukul 10.00.",
    action: "Isi laporan",
  },
  {
    variant: "info",
    icon: EyeIcon,
    title: "2 kartu menunggu Review",
    description: "Video Profil Sekolah 2026 · Poster Pentas Seni",
    action: "Buka Kanban",
  },
  {
    variant: "destructive",
    icon: BoxIcon,
    title: "Kamera Sony A7 III belum dikembalikan",
    description:
      "Dipinjam Unit SMP, lewat 1 hari dari jadwal (Sen, 16 Nov 15.00).",
    action: "Hubungi",
  },
] as const

export function AlertsDemo() {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-3">
        {/* Peringatan di halaman dengan aksi langsung (pola c-alert-3). */}
        <Alert variant="warning">
          <RefreshCwIcon />
          <AlertTitle>Laporan perlu diperbarui</AlertTitle>
          <AlertDescription>
            Penugasan “Editing Video Profil Sekolah” berubah. Jawaban lama tetap
            terisi, cukup isi tugas yang baru.
          </AlertDescription>
          <AlertAction>
            <Button size="xs">Perbarui</Button>
          </AlertAction>
        </Alert>

        <Alert variant="destructive">
          <LockIcon />
          <AlertTitle>Laporan Sabtu, 14 Nov terkunci</AlertTitle>
          <AlertDescription>
            Batas pengisian lewat pukul 10.00 WIB. Hari itu dihitung 0 dari
            total tugas sampai Manajer membuka kunci.
          </AlertDescription>
          <AlertAction>
            <Button size="xs" variant="outline">
              Minta buka kunci
            </Button>
          </AlertAction>
        </Alert>

        <Alert variant="success" role="status">
          <CheckCircle2Icon />
          <AlertTitle>Pengaduan terkirim</AlertTitle>
          <AlertDescription>
            Terima kasih, pengaduan Anda sudah kami terima dan akan menjadi
            bahan evaluasi layanan internet sekolah.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <Frame stacked>
          <FrameHeader className="flex flex-row items-center gap-2">
            <FrameTitle>Perlu tindakan hari ini</FrameTitle>
            <Badge variant="outline" size="sm" className="ml-auto">
              {TODAY.length}
            </Badge>
          </FrameHeader>
          {TODAY.map(({ variant, icon: Icon, title, description, action }) => (
            <FramePanel key={title} className="overflow-hidden p-0!">
              <Alert
                variant={variant}
                role="status"
                className="border-0 bg-transparent shadow-none"
              >
                <Icon />
                <AlertTitle>{title}</AlertTitle>
                <AlertDescription>{description}</AlertDescription>
                <AlertAction>
                  <Button size="xs" variant="outline">
                    {action}
                  </Button>
                </AlertAction>
              </Alert>
            </FramePanel>
          ))}
        </Frame>

        {/* Notifikasi dari orang (pola c-alert-19). */}
        <Frame>
          <FramePanel className="overflow-hidden p-0!">
            <Alert
              role="status"
              className="grid-cols-[32px_1fr] gap-x-3 border-0 shadow-none"
            >
              <Avatar className="size-8 border">
                <AvatarFallback>RS</AvatarFallback>
              </Avatar>
              <AlertTitle className="line-clamp-none">
                Ratna Sari · Unit SD{" "}
                <span className="font-normal text-muted-foreground">
                  mengajukan SDM
                </span>
              </AlertTitle>
              <AlertDescription className="line-clamp-2">
                Pentas Seni Akhir Semester, 22–23 Nov · 2 SDM: Dokumentasi, Take
                footage
              </AlertDescription>
              <AlertAction>
                <Button size="xs" variant="outline">
                  Tolak
                </Button>
                <Button size="xs">Tinjau</Button>
              </AlertAction>
            </Alert>
          </FramePanel>
        </Frame>
      </div>
    </div>
  )
}
