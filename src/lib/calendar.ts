export const EVENT_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4",
];

export const EVENT_TYPE_META = {
  event: { label: "Event",   color: "#6366f1", bg: "bg-indigo-50",  text: "text-indigo-600",  dot: "bg-indigo-400"  },
  task:  { label: "Task",    color: "#f59e0b", bg: "bg-amber-50",   text: "text-amber-600",   dot: "bg-amber-400"   },
  study: { label: "Study",   color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
} as const;

export type EventType = keyof typeof EVENT_TYPE_META;

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;        // YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  type: EventType;
  color: string;
  completed: boolean;
  noteTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthStr(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("default", { month: "long", year: "numeric" });
}

export function formatDayLabel(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" });
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function buildMonthGrid(ym: string): { date: string; current: boolean }[] {
  const [y, m] = ym.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const daysInPrev = new Date(y, m - 1, 0).getDate();

  const cells: { date: string; current: boolean }[] = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const pm = m - 1 === 0 ? 12 : m - 1;
    const py = m - 1 === 0 ? y - 1 : y;
    cells.push({ date: `${py}-${String(pm).padStart(2, "0")}-${String(d).padStart(2, "0")}`, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, current: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = m + 1 === 13 ? 1 : m + 1;
    const ny = m + 1 === 13 ? y + 1 : y;
    cells.push({ date: `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`, current: false });
  }

  return cells;
}

export function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
