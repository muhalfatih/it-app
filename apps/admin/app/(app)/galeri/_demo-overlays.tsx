"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  BellRingIcon,
  Undo2Icon,
  BoxIcon,
  CalendarIcon,
  CopyIcon,
  InfoIcon,
  MoreHorizontalIcon,
  PanelRightIcon,
  PencilIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Progress } from "@workspace/ui/components/progress"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@workspace/ui/components/reui/timeline"
import { Separator } from "@workspace/ui/components/separator"
import { Pattern as ToastVariants } from "@workspace/ui/components/examples/c-sonner-4"
import { Pattern as ToastAction } from "@workspace/ui/components/examples/c-sonner-6"
import { Pattern as ToastPromise } from "@workspace/ui/components/examples/c-sonner-7"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

/** Satu kartu skenario: kapan overlay dipakai + tombol untuk mencobanya. */
function Scenario({
  icon: Icon,
  title,
  when,
  children,
}: {
  icon: React.ComponentType<{ "aria-hidden"?: boolean; className?: string }>
  title: string
  when: string
  children: React.ReactNode
}) {
  return (
    <FramePanel className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{when}</span>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">{children}</div>
    </FramePanel>
  )
}

/* Dialog form: menolak pengajuan, alasan wajib. */
function RejectDialog() {
  const [reason, setReason] = React.useState("")
  const [open, setOpen] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Tolak pengajuan
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tolak Pengajuan SDM</DialogTitle>
          <DialogDescription>
            Pentas Seni Akhir Semester · Unit SD · 22–23 Nov. Alasan terlihat di
            “Pengajuan Saya” milik pengaju.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="alasan">Alasan penolakan</FieldLabel>
            <Textarea
              id="alasan"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="mis. Semua SDM sudah bertugas di tanggal itu."
            />
            <FieldDescription>Wajib diisi.</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => {
              setOpen(false)
              setReason("")
              toast("Pengajuan ditolak", {
                description: "Pengaju mendapat notifikasi.",
              })
            }}
          >
            Tolak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* Konfirmasi dua langkah untuk menghapus entri tahap Review ke atas (spesifikasi §4.5), pola c-dialog-7. */
function TwoStepDelete() {
  const [first, setFirst] = React.useState(false)
  const [second, setSecond] = React.useState(false)
  const icon = (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <AlertTriangleIcon aria-hidden className="size-5" />
    </div>
  )
  return (
    <>
      <AlertDialog open={first} onOpenChange={setFirst}>
        <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
          <Trash2Icon data-icon="inline-start" />
          Hapus entri
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              {icon}
              <div className="flex flex-col gap-1">
                <AlertDialogTitle>Hapus entri Planner?</AlertDialogTitle>
                <AlertDialogDescription>
                  Kartu “Video Profil Sekolah 2026” sudah di tahap Review. Kartu
                  beserta 4 file konten ikut terhapus.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                // AlertDialogAction bukan tombol tutup: tutup langkah 1 sebelum membuka langkah 2.
                setFirst(false)
                setSecond(true)
              }}
            >
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={second} onOpenChange={setSecond}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              {icon}
              <div className="flex flex-col gap-1">
                <AlertDialogTitle>Konfirmasi sekali lagi</AlertDialogTitle>
                <AlertDialogDescription>
                  Penghapusan permanen dan tidak bisa dibatalkan.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setSecond(false)
                toast.success("Entri dihapus (contoh).")
              }}
            >
              Hapus permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* Dialog detail kartu dengan konten yang bisa di-scroll dan footer sticky (pola c-dialog-3). */
function CardDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Detail kartu
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning-light">Review</Badge>
            <span className="text-xs text-muted-foreground">Isi terkunci</span>
          </div>
          <DialogTitle>Video Profil Sekolah 2026</DialogTitle>
          <DialogDescription>
            Tayang Kamis, 19 November · YouTube, TV Display
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 px-4 no-scrollbar max-h-[70vh] overflow-y-auto overscroll-contain py-1">
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Penugasan</dt>
              <dd className="flex items-center gap-2">
                <AvatarGroup>
                  {["BS", "AF"].map((i) => (
                    <Avatar key={i} size="sm">
                      <AvatarFallback>{i}</AvatarFallback>
                    </Avatar>
                  ))}
                </AvatarGroup>
                Budi, Ahmad
              </dd>
              <dt className="text-muted-foreground">Kegiatan</dt>
              <dd className="tabular-nums">16–20 Nov</dd>
              <dt className="text-muted-foreground">File</dt>
              <dd>4 foto · 1 video</dd>
            </dl>
            <Separator />
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Riwayat</span>
              <Timeline defaultValue={3}>
                {[
                  ["10 Nov 09.12", "Dibuat dari Planner"],
                  ["11 Nov 13.40", "Ke Draft oleh SDM Strategi"],
                  ["12 Nov 14.20", "Ke Review oleh Manajer"],
                ].map(([date, title], i) => (
                  <TimelineItem key={title} step={i + 1}>
                    <TimelineHeader>
                      <TimelineSeparator />
                      <TimelineDate>{date}</TimelineDate>
                      <TimelineTitle>{title}</TimelineTitle>
                      <TimelineIndicator />
                    </TimelineHeader>
                    <TimelineContent />
                  </TimelineItem>
                ))}
              </Timeline>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Kembalikan ke Draft
          </DialogClose>
          <Button>Setujui</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OverlaysDemo() {
  return (
    <>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Frame stacked className="min-w-0">
          <FrameHeader>
            <FrameTitle>Overlay</FrameTitle>
            <FrameDescription>
              Menahan alur sampai pengguna memutuskan.
            </FrameDescription>
          </FrameHeader>
          <Scenario
            icon={XCircleIcon}
            title="Dialog berisi isian"
            when="Keputusan yang butuh alasan, mis. menolak pengajuan."
          >
            <RejectDialog />
          </Scenario>
          <Scenario
            icon={AlertTriangleIcon}
            title="Konfirmasi dua langkah"
            when="Tindakan permanen, mis. hapus entri tahap Review ke atas."
          >
            <TwoStepDelete />
          </Scenario>
          <Scenario
            icon={PanelRightIcon}
            title="Panel samping"
            when="Detail panjang tanpa meninggalkan halaman."
          >
            <CardDialog />
          </Scenario>
        </Frame>

        <div className="flex min-w-0 flex-col gap-4">
          <Frame stacked className="min-w-0">
            <FrameHeader>
              <FrameTitle>Lapisan ringan</FrameTitle>
              <FrameDescription>
                Info dan aksi kecil di dekat pemicunya.
              </FrameDescription>
            </FrameHeader>
            <Scenario
              icon={BoxIcon}
              title="Popover"
              when="Ringkasan data singkat, mis. stok alat."
            >
              <Popover>
                <PopoverTrigger render={<Button variant="outline" size="sm" />}>
                  Stok kamera
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <PopoverHeader>
                    <PopoverTitle>Kamera Sony A7 III</PopoverTitle>
                    <PopoverDescription>1 dari 3 tersedia</PopoverDescription>
                  </PopoverHeader>
                  <Progress value={33} aria-label="Stok tersedia 1 dari 3" />
                  <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                    {[
                      ["Dipinjam", "1"],
                      ["Rusak", "1"],
                      ["Tersedia", "1"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <dd className="text-sm font-medium tabular-nums">
                          {v}
                        </dd>
                        <dt className="text-muted-foreground">{k}</dt>
                      </div>
                    ))}
                  </dl>
                </PopoverContent>
              </Popover>
              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="sm" />}>
                  <InfoIcon data-icon="inline-start" />
                  Kenapa terkunci?
                </TooltipTrigger>
                <TooltipContent>
                  Isi kartu terkunci sejak tahap Review.
                </TooltipContent>
              </Tooltip>
            </Scenario>
            <Scenario
              icon={MoreHorizontalIcon}
              title="Menu aksi"
              when="Aksi per baris/kartu, aksi berbahaya dipisah."
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="sm" />}
                >
                  Aksi entri
                  <MoreHorizontalIcon data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <PencilIcon />
                      Ubah entri
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CopyIcon />
                      Duplikat
                      <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CalendarIcon />
                      Ubah tanggal tayang
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <Trash2Icon />
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Scenario>
          </Frame>

          <Frame stacked className="min-w-0">
            <FrameHeader>
              <FrameTitle>Notifikasi (toast)</FrameTitle>
              <FrameDescription>
                Umpan balik singkat; tidak menahan alur.
              </FrameDescription>
            </FrameHeader>
            <Scenario
              icon={BellRingIcon}
              title="Variasi status"
              when="Ikon berwarna sesuai status: biasa, berhasil, gagal, peringatan, info, memuat."
            >
              <div className="w-full">
                <ToastVariants />
              </div>
            </Scenario>
            <Scenario
              icon={Undo2Icon}
              title="Aksi dan proses"
              when="Toast dengan tombol Urungkan, dan satu toast yang berubah dari memuat ke hasil."
            >
              <ToastAction />
              <ToastPromise />
            </Scenario>
          </Frame>
        </div>
      </div>
    </>
  )
}
