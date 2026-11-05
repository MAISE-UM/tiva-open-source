import { Badge } from "@/components/ui/badge"
import {Environment} from "@/app/utils/interfaces";


const environmentColors: Record<Environment, string> = {
  Local: "bg-gray-500",
  Development: "bg-blue-500",
  Testing: "bg-yellow-500",
  Production: "bg-green-500",
}

interface EnvironmentBadgeProps {
  environment: Environment
}

// Used to show what environment the user is in
export function EnvironmentBadge({ environment }: EnvironmentBadgeProps) {
  return <Badge className={`${environmentColors[environment]} text-white`}>{environment} Environment</Badge>
}

