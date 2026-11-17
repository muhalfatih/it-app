"use server"

import { revalidatePath } from "next/cache"

import {
  getCurrentUser,
  withPermission,
  type CurrentUser,
} from "@workspace/auth/session"
import type { ContentStage } from "@workspace/db/schema/stages"

import {
  addComment,
  checkChannel,
  moveCard,
  saveCaption,
  uncheckChannel,
} from "@/lib/kanban/mutations"
import { guarded, type CrudResult } from "@/lib/setting-crud"

/** Gerbang kanban.lihat; wewenang rinci diperiksa mutasi terhadap tahap di database. */
const action = <A extends unknown[]>(
  fn: (user: CurrentUser, cardId: number, ...args: A) => Promise<unknown>
) =>
  withPermission(
    "kanban.lihat",
    async (cardId: number, ...args: A): Promise<CrudResult> => {
      const user = (await getCurrentUser())!
      const result = await guarded("/konten", () => fn(user, cardId, ...args))
      if ("ok" in result) {
        revalidatePath(`/konten/${cardId}`)
        revalidatePath("/planner")
      }
      return result
    }
  )

export const moveCardAction = action(
  (user, cardId, from: ContentStage, to: ContentStage, note?: string) =>
    moveCard(cardId, from, to, user, note)
)

export const saveCaptionAction = action((user, cardId, caption: string) =>
  saveCaption(cardId, caption, user)
)

export const checkChannelAction = action(
  (user, cardId, channelId: number, url: string | null) =>
    checkChannel(cardId, channelId, url, user)
)

export const uncheckChannelAction = action(
  (user, cardId, channelId: number, reason: string) =>
    uncheckChannel(cardId, channelId, reason, user)
)

export const addCommentAction = action((user, cardId, body: string) =>
  addComment(cardId, body, user)
)
