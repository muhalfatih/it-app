"use client"

import { Button } from "@workspace/ui/components/button"

import { signOutWithPush } from "@/lib/push/sign-out"

/** Keluar dari halaman ini juga melepas langganan push perangkat ini (sama seperti sidebar). */
export function SignOutLink() {
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto p-0"
      onClick={() => void signOutWithPush()}
    >
      keluar
    </Button>
  )
}
