import {
  BadgeDollarSign,
  Factory,
  Globe,
  Landmark,
  Package,
  ShoppingCart,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ModuleIconKey } from "../data/odoo-modules";

const moduleIcons: Record<ModuleIconKey, LucideIcon> = {
  sales: BadgeDollarSign,
  crm: Target,
  accounting: Landmark,
  inventory: Package,
  manufacturing: Factory,
  purchase: ShoppingCart,
  hr: Users,
  website: Globe,
};

export function ModuleIcon({ icon, size = 22 }: { icon: ModuleIconKey; size?: number }) {
  const Icon = moduleIcons[icon];
  return <Icon size={size} aria-hidden="true" />;
}
