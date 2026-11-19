import type { ISSUES, OTHERS_AFFECTED, SERVICE_STATUSES } from "@workspace/db/schema"

export type Issue = (typeof ISSUES)[number]
export type OthersAffected = (typeof OTHERS_AFFECTED)[number]
export type ServiceStatus = (typeof SERVICE_STATUSES)[number]
