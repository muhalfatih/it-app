"use client"

import * as React from "react"
import { BellOffIcon, BellRingIcon, SmartphoneIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Card } from "@workspace/ui/components/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/reui/alert"
import { Switch } from "@workspace/ui/components/switch"

type Status =
  | "memuat"
  | "tidak-didukung"
  | "ios-belum-dipasang"
  | "diblokir"
  | "mati"
  | "aktif"

type PushToggleProps = {
  /** Kunci publik VAPID; kosong = server belum dikonfigurasi. */
  publicKey: string
  /** Mendaftarkan service worker (dilakukan aplikasi karena lokasi berkasnya milik aplikasi). */
  register: () => Promise<ServiceWorkerRegistration>
  onSubscribe: (subscription: PushSubscriptionJSON) => Promise<void>
  onUnsubscribe: (endpoint: string) => Promise<void>
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/")
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

function PushToggle({
  publicKey,
  register,
  onSubscribe,
  onUnsubscribe,
}: PushToggleProps) {
  const [status, setStatus] = React.useState<Status>("memuat")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const registration = React.useRef<ServiceWorkerRegistration | null>(null)

  React.useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus(ios && !standalone ? "ios-belum-dipasang" : "tidak-didukung")
      return
    }
    let cancelled = false
    register()
      .then(async (reg) => {
        registration.current = reg
        const sub = await reg.pushManager.getSubscription()
        // Perangkat yang sudah berlangganan dipasangkan ulang ke akun yang sedang login.
        if (sub) await onSubscribe(sub.toJSON())
        if (cancelled) return
        if (Notification.permission === "denied") setStatus("diblokir")
        else setStatus(sub ? "aktif" : "mati")
      })
      .catch(() => !cancelled && setStatus("tidak-didukung"))
    return () => {
      cancelled = true
    }
  }, [register, onSubscribe])

  async function toggle(on: boolean) {
    const reg = registration.current
    if (!reg) return
    setBusy(true)
    setError(null)
    try {
      if (on) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        await onSubscribe(sub.toJSON())
        setStatus("aktif")
      } else {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await onUnsubscribe(sub.endpoint)
          await sub.unsubscribe()
        }
        setStatus("mati")
      }
    } catch {
      if (Notification.permission === "denied") setStatus("diblokir")
      else
        setError(
          on
            ? "Notifikasi belum aktif. Periksa koneksi lalu coba lagi."
            : "Notifikasi belum dimatikan. Periksa koneksi lalu coba lagi."
        )
    } finally {
      setBusy(false)
    }
  }

  if (!publicKey)
    return (
      <Alert variant="warning">
        <BellOffIcon />
        <AlertTitle>Notifikasi belum disiapkan di server</AlertTitle>
        <AlertDescription>
          Minta admin mengisi kunci VAPID, lalu buka halaman ini lagi.
        </AlertDescription>
      </Alert>
    )

  if (status === "ios-belum-dipasang")
    return (
      <Alert variant="info">
        <SmartphoneIcon />
        <AlertTitle>Pasang aplikasi dulu di iPhone/iPad</AlertTitle>
        <AlertDescription>
          Di iOS 16.4 ke atas, notifikasi hanya bisa diaktifkan dari aplikasi
          yang sudah ditambahkan ke Layar Utama. Ikuti langkah iOS di bawah,
          lalu buka aplikasi dari ikonnya.
        </AlertDescription>
      </Alert>
    )

  if (status === "tidak-didukung")
    return (
      <Alert variant="warning">
        <BellOffIcon />
        <AlertTitle>Browser ini tidak mendukung notifikasi</AlertTitle>
        <AlertDescription>
          Pakai Chrome, Edge, Firefox, atau Safari versi terbaru.
        </AlertDescription>
      </Alert>
    )

  const on = status === "aktif"
  return (
    <div className="flex flex-col gap-3">
      <Card className="py-0">
        <Field>
          <FieldLabel className="justify-between px-4 py-4">
            <FieldContent>
              <FieldTitle className="flex items-center gap-2">
                {on ? (
                  <BellRingIcon aria-hidden="true" className="size-4" />
                ) : (
                  <BellOffIcon aria-hidden="true" className="size-4 opacity-60" />
                )}
                Notifikasi di perangkat ini
                <Badge variant={on ? "default" : "secondary"} aria-live="polite">
                  {status === "memuat" ? "Memeriksa…" : on ? "Aktif" : "Mati"}
                </Badge>
              </FieldTitle>
              <FieldDescription>
                Berlaku untuk browser ini saja. Aktifkan juga di perangkat lain
                yang Anda pakai.
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={on}
              disabled={busy || status === "memuat" || status === "diblokir"}
              onCheckedChange={toggle}
            />
          </FieldLabel>
        </Field>
      </Card>
      {status === "diblokir" ? (
        <Alert variant="warning">
          <BellOffIcon />
          <AlertTitle>Izin notifikasi diblokir di browser</AlertTitle>
          <AlertDescription>
            Buka pengaturan situs di browser, izinkan Notifikasi untuk aplikasi
            ini, lalu muat ulang halaman.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive" role="alert">
          <BellOffIcon />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}
    </div>
  )
}

export { PushToggle }
