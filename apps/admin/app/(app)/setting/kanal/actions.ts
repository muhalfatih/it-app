"use server"

import { withPermission } from "@workspace/auth/session"
import { channel } from "@workspace/db/schema"

import { addRow, updateRow } from "@/lib/setting-crud"

const PATH = "/setting/kanal"

export const addChannel = withPermission(
  "setting.kelola",
  async (name: string, requiresLink?: boolean) =>
    addRow(channel, PATH, name, requiresLink)
)

export const updateChannel = withPermission(
  "setting.kelola",
  async (
    id: number,
    patch: { name?: string; active?: boolean; extra?: boolean }
  ) => updateRow(channel, PATH, id, patch)
)
