import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "../../hooks/useBookings.js";
import { useMarkNotificationRead } from "../../hooks/usePlatform.js";

export function NotificationBell({ className = "", fallbackHref = "/notifications", title = "Notifications" }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const recentNotifications = notifications.slice(0, 6);

  function openNotification(notification) {
    if (!notification.isRead) markRead.mutate(notification.id);
    setOpen(false);
    if (notification.targetUrl) navigate(notification.targetUrl);
  }

  return (
    <div className="relative">
      <button
        className={`relative rounded-full p-2 text-ink-muted hover:bg-surface-low ${className}`}
        onClick={() => setOpen((current) => !current)}
        title={title}
        type="button"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="absolute right-0 top-0 grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-black text-white">{unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-surface-border bg-white shadow-lift">
          <div className="border-b border-surface-border px-4 py-3">
            <p className="font-black text-ink">{title}</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.map((notification) => (
              <button
                className="block w-full border-b border-surface-border px-4 py-3 text-left hover:bg-surface-low"
                key={notification.id}
                onClick={() => openNotification(notification)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-black text-ink">{notification.title}</p>
                  {!notification.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{notification.body}</p>
                <p className="mt-1 text-xs text-ink-soft">{notification.time}</p>
              </button>
            ))}
            {!recentNotifications.length && (
              <div className="px-4 py-6 text-center text-sm text-ink-muted">You are all caught up.</div>
            )}
          </div>
          <button
            className="block w-full px-4 py-3 text-center text-sm font-black text-primary hover:bg-surface-low"
            onClick={() => {
              setOpen(false);
              navigate(fallbackHref);
            }}
            type="button"
          >
            View all
          </button>
        </div>
      )}
    </div>
  );
}
