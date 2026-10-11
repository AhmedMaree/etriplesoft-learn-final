import { Laptop, Rocket, Settings, User, Zap, type LucideIcon } from "lucide-react";
import type { RoleSlug } from "../model/course";

const roleIcons: Record<RoleSlug, LucideIcon> = {
  "end-user": User,
  "system-admin": Settings,
  implementer: Rocket,
  developer: Laptop,
  automation: Zap,
};

export function PathRoleIcon({ role, size = 20 }: { role: RoleSlug; size?: number }) {
  const Icon = roleIcons[role];
  return <Icon size={size} aria-hidden="true" />;
}
