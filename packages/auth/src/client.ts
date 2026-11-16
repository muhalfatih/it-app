import { usernameClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/** Klien Better Auth untuk komponen client (form masuk, keluar). */
export const authClient = createAuthClient({ plugins: [usernameClient()] })
