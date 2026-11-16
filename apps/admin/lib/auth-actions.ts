"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@workspace/auth/server"

/** Keluar: hapus sesi di server lalu kembali ke halaman masuk. */
export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() })
  redirect("/masuk")
}
