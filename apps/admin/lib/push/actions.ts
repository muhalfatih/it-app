"use server"

import { z } from "zod"

import { requireUser } from "@workspace/auth/session"
import { db } from "@workspace/db/client"
import { and, eq } from "@workspace/db/orm"
import { pushSubscription } from "@workspace/db/schema"

// Bentuk PushSubscription.toJSON(); nilai dari klien, jadi divalidasi.
const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
})

export async function subscribe(raw: unknown): Promise<void> {
  const user = await requireUser()
  const sub = subscriptionSchema.parse(raw)
  // Endpoint per perangkat: perangkat yang berganti akun pindah ke akun yang sedang login.
  await db
    .insert(pushSubscription)
    .values({ endpoint: sub.endpoint, userId: user.id, ...sub.keys })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { userId: user.id, ...sub.keys },
    })
}

export async function unsubscribe(endpoint: string): Promise<void> {
  const user = await requireUser()
  await db
    .delete(pushSubscription)
    .where(and(eq(pushSubscription.endpoint, endpoint), eq(pushSubscription.userId, user.id)))
}
