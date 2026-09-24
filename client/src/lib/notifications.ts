import { buildWarranties, initialSales, type Sale } from "@/lib/salesData";
import { initialProjectExpenses, initialProjects, projectSpend, type Project } from "@/lib/projectData";
import { loadLocalValue, saveLocalValue } from "@/lib/localStore";
import { stockItems, type StockItem } from "@/lib/operationsData";

export type NotificationKind = "reminder" | "warranty" | "inventory" | "budget";
export type NotificationPriority = "normal" | "high" | "critical";
export type Reminder = { id: string; note: string; dueDate: string; assignee: string; createdAt: string; completed?: boolean };
export type AppNotification = { id: string; kind: NotificationKind; priority: NotificationPriority; title: string; message: string; timestamp: string; href: string; read: boolean; sourceKey: string };

export const NOTIFICATIONS_KEY = "ss-global-notifications";
export const REMINDERS_KEY = "ss-global-reminders";

const isoDate = (date = new Date()) => date.toISOString().slice(0, 10);
const startOfDay = (value: string) => new Date(`${value}T00:00:00`).getTime();
const daysBetween = (from: string, to: string) => Math.ceil((startOfDay(to) - startOfDay(from)) / 86400000);
const loadArray = <T,>(key: string, fallback: T[]) => { const value = loadLocalValue<unknown>(key, fallback); return Array.isArray(value) ? value as T[] : fallback; };

export function loadNotifications() { return loadArray<AppNotification>(NOTIFICATIONS_KEY, []); }
export function saveNotifications(value: AppNotification[]) { saveLocalValue(NOTIFICATIONS_KEY, value.slice(0, 100)); }
export function loadReminders() { return loadArray<Reminder>(REMINDERS_KEY, []); }
export function saveReminders(value: Reminder[]) { saveLocalValue(REMINDERS_KEY, value); }

export function createNotification(input: Omit<AppNotification, "id" | "timestamp" | "read"> & { id?: string; timestamp?: string }) {
 const current = loadNotifications();
 const id = input.id ?? `notice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
 if (current.some((item) => item.id === id)) return current;
 const next = [{ ...input, id, timestamp: input.timestamp ?? new Date().toISOString(), read: false }, ...current];
 saveNotifications(next);
 return next;
}

export function evaluateNotifications(now = new Date()) {
 const today = isoDate(now);
 const notices = loadNotifications();
 const existing = new Set(notices.map((item) => item.sourceKey));
 const generated: AppNotification[] = [];
 const push = (item: Omit<AppNotification, "id" | "timestamp" | "read">) => {
  if (existing.has(item.sourceKey)) return;
  generated.push({ ...item, id: `notice-${item.sourceKey}`, timestamp: now.toISOString(), read: false });
  existing.add(item.sourceKey);
 };

 loadReminders().filter((reminder) => !reminder.completed && daysBetween(today, reminder.dueDate) === 1).forEach((reminder) => push({ kind: "reminder", priority: "normal", title: "Reminder due tomorrow", message: `${reminder.note} · ${reminder.assignee}`, href: "/", sourceKey: `reminder:${reminder.id}:due` }));

 const warranties = buildWarranties(loadArray<Sale>("ss-global-sales", initialSales));
 warranties.forEach((warranty) => {
  const days = daysBetween(today, warranty.expiryDate);
  if (days >= 0 && days <= 7) push({ kind: "warranty", priority: days <= 2 ? "high" : "normal", title: "Warranty expires soon", message: `${warranty.product} for ${warranty.customer} expires in ${days} day${days === 1 ? "" : "s"}.`, href: "/warranties", sourceKey: `warranty:${warranty.id}:week` });
 });

 const items = loadArray<StockItem>("ss-global-inventory-items", stockItems);
 items.filter((item) => item.quantity < item.safety).forEach((item) => push({ kind: "inventory", priority: "high", title: "Low stock alert", message: `${item.name} has ${item.quantity} ${item.unit} available; threshold is ${item.safety}.`, href: "/inventory", sourceKey: `inventory:${item.id}:low` }));

 const projects = loadArray<Project>("ss-global-projects", initialProjects);
 const expenses = loadArray("ss-global-project-expenses", initialProjectExpenses) as typeof initialProjectExpenses;
 projects.forEach((project) => {
  const spent = projectSpend(project.id, expenses);
  const percentage = project.budget ? (spent / project.budget) * 100 : 0;
  if (percentage >= 80) push({ kind: "budget", priority: percentage >= 100 ? "critical" : "high", title: percentage >= 100 ? "Project budget exceeded" : "Project budget at 80%", message: `${project.name} has used ${Math.round(percentage)}% of its allocated budget.`, href: `/projects/${project.id}`, sourceKey: `budget:${project.id}:${percentage >= 100 ? "100" : "80"}` });
 });

 if (generated.length) saveNotifications([...generated, ...notices].slice(0, 100));
 return generated.length ? [...generated, ...notices].slice(0, 100) : notices;
}

export function markNotificationRead(id: string) { saveNotifications(loadNotifications().map((item) => item.id === id ? { ...item, read: true } : item)); }
export function markAllNotificationsRead() { saveNotifications(loadNotifications().map((item) => ({ ...item, read: true }))); }
