import { nanoid } from "nanoid";

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = nanoid(6).toLowerCase();
  return base ? `${base.slice(0, 40)}-${suffix}` : suffix;
}
