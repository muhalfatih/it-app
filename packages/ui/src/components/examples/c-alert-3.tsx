import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/reui/alert"

import { Button } from "@workspace/ui/components/button"
import { ShieldCheckIcon } from "lucide-react"

export function Pattern() {
  return (
    <Alert>
      <ShieldCheckIcon
      />
      <AlertTitle>Security Update</AlertTitle>
      <AlertDescription>Update your password and enable 2FA.</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="xs">
          Dismiss
        </Button>
        <Button size="xs">Update</Button>
      </AlertAction>
    </Alert>
  )
}