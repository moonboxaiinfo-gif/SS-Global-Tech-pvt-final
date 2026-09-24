import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppNotification, evaluateNotifications, loadNotifications, loadReminders, markAllNotificationsRead, markNotificationRead, saveReminders, type Reminder } from "@/lib/notifications";

const NotificationContext = createContext<{ notifications: AppNotification[]; unreadCount: number; reminders: Reminder[]; addReminder: (input: Omit<Reminder, "id" | "createdAt">) => Reminder; read: (id: string) => void; readAll: () => void; refresh: () => void }>({ notifications: [], unreadCount: 0, reminders: [], addReminder: () => ({ id: "", createdAt: "", note: "", dueDate: "", assignee: "" }), read: () => undefined, readAll: () => undefined, refresh: () => undefined });

export function NotificationProvider({ children }: { children: React.ReactNode }) {
 const [notifications, setNotifications] = useState<AppNotification[]>(() => evaluateNotifications());
 const [reminders, setReminders] = useState<Reminder[]>(() => loadReminders());
 const refresh = () => { setNotifications(evaluateNotifications()); setReminders(loadReminders()); };
 useEffect(() => {
  const onStore = () => refresh();
  window.addEventListener("ss-global-local-store", onStore);
  const timer = window.setInterval(refresh, 60000);
  return () => { window.removeEventListener("ss-global-local-store", onStore); window.clearInterval(timer); };
 }, []);
 const value = useMemo(() => ({ notifications, unreadCount: notifications.filter((item) => !item.read).length, reminders, addReminder: (input: Omit<Reminder, "id" | "createdAt">) => { const reminder = { ...input, id: `rem-${Date.now()}`, createdAt: new Date().toISOString() }; const next = [reminder, ...loadReminders()]; saveReminders(next); setReminders(next); refresh(); return reminder; }, read: (id: string) => { markNotificationRead(id); setNotifications(loadNotifications()); }, readAll: () => { markAllNotificationsRead(); setNotifications(loadNotifications()); }, refresh }), [notifications, reminders]);
 return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
export const useNotifications = () => useContext(NotificationContext);
