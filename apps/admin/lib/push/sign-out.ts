"use client"

import { signOutAction } from "@/lib/auth-actions"
import { unsubscribe } from "@/lib/push/actions"

/** Keluar sambil melepas langganan push perangkat ini (baris di server + browser). */
export async function signOutWithPush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration("/")
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await unsubscribe(sub.endpoint) // harus sebelum sesi dihapus
      await sub.unsubscribe()
    }
  } catch {
    // Gagal melepas langganan tidak boleh menghalangi keluar.
  }
  await signOutAction()
}
