// Satu pintu pengiriman Web Push (server-only). Dipanggil SETELAH transaksi commit;
// kegagalan apa pun hanya dicatat dan tidak pernah menggagalkan aksi pengguna.
import webpush from "web-push"

import { pickRecipients, type Audience } from "./recipients"

export type PushMessage = { title: string; body: string; url: string }
export type Sub = { endpoint: string; p256dh: string; auth: string }

/** Kirim paralel; endpoint 404/410 (langganan kedaluwarsa) dihapus, galat lain dicatat. */
export async function deliver(
  subs: Sub[],
  payload: string,
  send: (sub: Sub, payload: string) => Promise<unknown>,
  remove: (endpoints: string[]) => Promise<unknown>
): Promise<void> {
  const results = await Promise.allSettled(subs.map((s) => send(s, payload)))
  const gone: string[] = []
  results.forEach((r, i) => {
    if (r.status === "fulfilled") return
    const code = (r.reason as { statusCode?: number }).statusCode
    if (code === 404 || code === 410) gone.push(subs[i]!.endpoint)
    else console.error("Push gagal", subs[i]!.endpoint, r.reason)
  })
  if (gone.length) await remove(gone)
}

let vapidReady: boolean | undefined
function vapid(): boolean {
  if (vapidReady === undefined) {
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const priv = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT
    vapidReady = Boolean(pub && priv && subject)
    if (vapidReady) webpush.setVapidDetails(subject!, pub!, priv!)
    else console.warn("Push nonaktif: kunci VAPID belum diset (lihat env.example)")
  }
  return vapidReady
}

export async function notify(to: Audience, msg: PushMessage): Promise<void> {
  try {
    if (!vapid()) return
    // Impor malas: `deliver` bisa dites tanpa DATABASE_URL.
    const { db } = await import("@workspace/db/client")
    const { eq, inArray, or } = await import("@workspace/db/orm")
    const { pushSubscription, user, userRole } = await import("@workspace/db/schema")

    const ids = (to.userIds ?? []).filter((x): x is string => !!x)
    const conds = [
      ids.length ? inArray(user.id, ids) : undefined,
      to.roles?.length ? inArray(userRole.role, to.roles) : undefined,
    ].filter((c) => c !== undefined)
    if (!conds.length) return
    const people = await db
      .select({ id: user.id, disabledAt: user.disabledAt })
      .from(user)
      .leftJoin(userRole, eq(userRole.userId, user.id))
      .where(or(...conds))
    const recipients = pickRecipients(people, to.except)
    if (!recipients.length) return

    const subs = await db
      .select({
        endpoint: pushSubscription.endpoint,
        p256dh: pushSubscription.p256dh,
        auth: pushSubscription.auth,
      })
      .from(pushSubscription)
      .where(inArray(pushSubscription.userId, recipients))
    await deliver(
      subs,
      JSON.stringify(msg),
      (s, payload) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          // Aksi pengguna menunggu notify; jangan tergantung layanan push yang lambat.
          { timeout: 10_000 }
        ),
      (endpoints) =>
        db.delete(pushSubscription).where(inArray(pushSubscription.endpoint, endpoints))
    )
  } catch (e) {
    console.error("notify gagal", e)
  }
}
