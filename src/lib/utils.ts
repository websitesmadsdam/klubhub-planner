import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format ISO date string (yyyy-MM-dd) to dd/MM-yyyy */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}-${y}`;
}

/** Format ISO datetime to "dd/MM-yyyy HH:mm" */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${d}/${m}-${y} ${hh}:${mm}`;
}

/** Format date range: "dd/MM-yyyy → dd/MM-yyyy" */
export function formatDateRange(from: string | null | undefined, to: string | null | undefined): string {
  return `${formatDate(from)}${to ? ` → ${formatDate(to)}` : ' →'}`;
}
