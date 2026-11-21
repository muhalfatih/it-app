"use client"

import { PushToggle } from "@workspace/ui/components/domain/push-toggle"

// Tiruan tanpa service worker sungguhan: langganan hanya disimpan di memori.
let current: PushSubscription | null = null
const fakeSub = {
  endpoint: "https://push.example.test/galeri",
  toJSON: () => ({ endpoint: "https://push.example.test/galeri", keys: {} }),
  unsubscribe: async () => {
    current = null
    return true
  },
} as unknown as PushSubscription
const fakeRegistration = {
  pushManager: {
    getSubscription: async () => current,
    subscribe: async () => (current = fakeSub),
  },
} as unknown as ServiceWorkerRegistration

const register = async () => fakeRegistration
const noop = async () => {}

export function PushDemo() {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <PushToggle
        publicKey="AAAA"
        register={register}
        onSubscribe={noop}
        onUnsubscribe={noop}
      />
      {/* Server belum punya kunci VAPID. */}
      <PushToggle
        publicKey=""
        register={register}
        onSubscribe={noop}
        onUnsubscribe={noop}
      />
    </div>
  )
}
