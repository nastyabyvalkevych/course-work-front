import { WatchItem } from "./types";

export const WATCH_KEY = "risk-watchlist";

export function readWatchlist(): WatchItem[] {
  try {
    const raw = window.localStorage.getItem(WATCH_KEY);
    const parsed = raw ? (JSON.parse(raw) as WatchItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeWatchlist(items: WatchItem[]) {
  try {
    window.localStorage.setItem(WATCH_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
}

export function isWatched(type: WatchItem["type"], id: string) {
  return readWatchlist().some((w) => w.type === type && w.id === id);
}

export function toggleWatch(item: Omit<WatchItem, "addedAt">): boolean {
  const list = readWatchlist();
  const idx = list.findIndex((w) => w.type === item.type && w.id === item.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeWatchlist(list);
    return false;
  }
  list.push({ ...item, addedAt: new Date().toISOString() });
  writeWatchlist(list);
  return true;
}
