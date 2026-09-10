import { useEffect, useState, useRef } from "react";
import { FiBell, FiMenu, FiCheckCircle } from "react-icons/fi";

const Navbar = ({ setMobileOpen }) => {
  const [admin, setAdmin] = useState(() => {
    try {
      const savedAdmin = localStorage.getItem("smartAttendAdmin");
      return savedAdmin ? JSON.parse(savedAdmin) : null;
    } catch (error) {
      console.error("Failed to load administrator:", error);
      return null;
    }
  });

  // Notification dropdown
  const [showNotifications, setShowNotifications] = useState(false);

  const notificationRef = useRef(null);

  // Example notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Attendance completed",
      message: "Today's attendance has been recorded.",
      time: "Just now",
      unread: true,
    },
    {
      id: 2,
      title: "New student added",
      message: "A new student has been added successfully.",
      time: "10 minutes ago",
      unread: true,
    },
    {
      id: 3,
      title: "System ready",
      message: "SmartAttend is ready to use.",
      time: "1 hour ago",
      unread: false,
    },
  ]);

  // Reload administrator information
  useEffect(() => {
    const loadAdmin = () => {
      try {
        const savedAdmin =
          localStorage.getItem("smartAttendAdmin");

        setAdmin(
          savedAdmin ? JSON.parse(savedAdmin) : null
        );
      } catch (error) {
        console.error(
          "Failed to load administrator:",
          error
        );

        setAdmin(null);
      }
    };

    window.addEventListener(
      "smartAttendAccountChanged",
      loadAdmin
    );

    return () => {
      window.removeEventListener(
        "smartAttendAccountChanged",
        loadAdmin
      );
    };
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // Number of unread notifications
  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );
  };

  return (
    <header className="relative z-30 flex h-20 w-full items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6">

      {/* MOBILE MENU */}
      <button
        onClick={() => setMobileOpen(true)}
        className="rounded-lg p-2 text-xl text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <FiMenu />
      </button>

      {/* RIGHT SIDE */}
      <div className="ml-auto flex items-center gap-4 sm:gap-6">

        {/* =========================
            NOTIFICATION
        ========================== */}
        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            onClick={() =>
              setShowNotifications(!showNotifications)
            }
            className="relative rounded-lg p-2 text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Notifications"
          >
            <FiBell />

            {/* RED NOTIFICATION DOT */}
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {/* NOTIFICATION DROPDOWN */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Notifications
                  </h3>

                  <p className="text-xs text-slate-400">
                    {unreadCount} unread
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Mark all read
                  </button>
                )}

              </div>

              {/* NOTIFICATIONS */}
              <div className="max-h-80 overflow-y-auto">

                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => {
                        setNotifications((current) =>
                          current.map((item) =>
                            item.id === notification.id
                              ? {
                                  ...item,
                                  unread: false,
                                }
                              : item
                          )
                        );
                      }}
                      className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        notification.unread
                          ? "bg-blue-50/40"
                          : "bg-white"
                      }`}
                    >

                      {/* ICON */}
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <FiCheckCircle size={16} />
                      </div>

                      {/* CONTENT */}
                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2">

                          <p className="truncate text-sm font-semibold text-slate-700">
                            {notification.title}
                          </p>

                          {notification.unread && (
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                          )}

                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {notification.message}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {notification.time}
                        </p>

                      </div>

                    </button>
                  ))
                )}

              </div>

            </div>
          )}
        </div>

        {/* =========================
            ADMINISTRATOR
        ========================== */}
        <div className="flex items-center gap-3">

          {/* PROFILE PICTURE */}
          {admin?.profilePicture && (
            <img
              src={admin.profilePicture}
              alt="Administrator"
              className="h-10 w-10 rounded-full border border-gray-200 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}

          {/* ADMIN INFORMATION */}
          <div className="hidden text-right sm:block">

            <p className="text-sm font-semibold text-slate-700">
              {admin?.name || "Administrator"}
            </p>

            <p className="text-xs text-slate-400">
              {admin?.role || "Administrator"}
            </p>

          </div>

        </div>

      </div>

    </header>
  );
};

export default Navbar;
