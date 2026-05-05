import { CATEGORIES } from "./rules/categories";
import {
  Wrench, Home, Car, BookOpen, Smartphone, Layers, Shirt, Utensils,
  type LucideIcon,
} from "lucide-react";

export type CategoryMeta = {
  slug:  string;
  label: string;
  Icon:  LucideIcon;
  color: string;
  bg:    string;
};

const META: Record<string, CategoryMeta> = {
  [CATEGORIES.SOFTWARE]: {
    slug:  "software",
    label: "Software & Subscriptions",
    Icon:  Layers,
    color: "#FB923C",
    bg:    "rgba(251,146,60,0.10)",
  },
  [CATEGORIES.EQUIPMENT]: {
    slug:  "equipment",
    label: "Equipment",
    Icon:  Wrench,
    color: "#60A5FA",
    bg:    "rgba(96,165,250,0.10)",
  },
  [CATEGORIES.OFFICE_SUPPLIES]: {
    slug:  "office-supplies",
    label: "Office Supplies",
    Icon:  Home,
    color: "#A78BFA",
    bg:    "rgba(167,139,250,0.10)",
  },
  [CATEGORIES.PHONE_INTERNET]: {
    slug:  "phone-internet",
    label: "Phone & Internet",
    Icon:  Smartphone,
    color: "#22C55E",
    bg:    "rgba(34,197,94,0.10)",
  },
  [CATEGORIES.WORK_TRAVEL]: {
    slug:  "work-travel",
    label: "Work Travel",
    Icon:  Car,
    color: "#F59E0B",
    bg:    "rgba(245,158,11,0.10)",
  },
  [CATEGORIES.PROFESSIONAL_DEVELOPMENT]: {
    slug:  "professional-development",
    label: "Professional Development",
    Icon:  BookOpen,
    color: "#34D399",
    bg:    "rgba(52,211,153,0.10)",
  },
  [CATEGORIES.WORK_CLOTHING]: {
    slug:  "work-clothing",
    label: "Work Clothing",
    Icon:  Shirt,
    color: "#94A3B8",
    bg:    "rgba(148,163,184,0.10)",
  },
  [CATEGORIES.MEALS]: {
    slug:  "meals",
    label: "Meals",
    Icon:  Utensils,
    color: "#F472B6",
    bg:    "rgba(244,114,182,0.10)",
  },
};

const BY_SLUG: Record<string, CategoryMeta & { category: string }> = Object.fromEntries(
  Object.entries(META).map(([category, meta]) => [meta.slug, { ...meta, category }])
);

export function getCategoryMeta(category: string): CategoryMeta | null {
  return META[category] ?? null;
}

export function getMetaBySlug(slug: string): (CategoryMeta & { category: string }) | null {
  return BY_SLUG[slug] ?? null;
}

export function categoryToSlug(category: string): string {
  return META[category]?.slug ?? category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
