import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { user } from "./auth"

/** Langganan Web Push per perangkat; endpoint unik dari layanan push browser. */
export const pushSubscription = pgTable(
  "push_subscription",
  {
    endpoint: text("endpoint").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("push_subscription_user_id_idx").on(t.userId)]
)
