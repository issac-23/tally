import {
  Utensils,
  ShoppingCart,
  Home,
  Car,
  Tv,
  ShoppingBag,
  Heart,
  Zap,
  Smartphone,
  Tag,
  type LucideIcon,
} from "lucide-react";

/**
 * Map of icon name (stored in the categories table) to a Lucide component.
 * Preset categories use these names; custom categories that don't match
 * fall back to the Tag icon.
 */
const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  home: Home,
  car: Car,
  tv: Tv,
  "shopping-bag": ShoppingBag,
  heart: Heart,
  zap: Zap,
  smartphone: Smartphone,
  tag: Tag,
};

interface CategoryIconProps {
  name: string | null | undefined;
  size?: number;
  className?: string;
}

export function CategoryIcon({
  name,
  size = 18,
  className,
}: CategoryIconProps) {
  const Icon = (name && iconMap[name]) || Tag;
  return <Icon size={size} className={className} aria-hidden />;
}

/** Used when listing categories in pickers (since <option> can't render JSX). */
export const CATEGORY_ICON_NAMES = Object.keys(iconMap);
