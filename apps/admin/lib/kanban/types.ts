import type { ContentStage } from "@workspace/db/schema/stages"

import type { IsoDate } from "@/lib/planner/types"

export type BoardCard = {
  id: number
  entryId: number
  stage: ContentStage
  name: string
  publishDate: IsoDate
  channels: { id: number; name: string }[]
  /** Unik per orang, urut kemunculan penugasan. */
  assignees: { id: string; name: string }[]
  publishedCount: number
}
