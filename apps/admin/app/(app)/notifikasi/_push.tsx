"use client"

import { PushToggle } from "@workspace/ui/components/domain/push-toggle"

import { subscribe, unsubscribe } from "@/lib/push/actions"

// Di level modul agar referensinya stabil (dipakai sebagai dependensi efek).
// Path relatif harus literal agar bundler ikut menyalin service worker (panduan PWA Next 16).
const register = () =>
  navigator.serviceWorker.register(
    new URL("../../../lib/service-worker.js", import.meta.url),
    { scope: "/", updateViaCache: "none" }
  )

export function PushPanel({ publicKey }: { publicKey: string }) {
  return (
    <PushToggle
      publicKey={publicKey}
      register={register}
      onSubscribe={subscribe}
      onUnsubscribe={unsubscribe}
    />
  )
}
