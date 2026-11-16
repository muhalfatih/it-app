import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@workspace/auth/server"

export const { GET, POST } = toNextJsHandler(auth)
