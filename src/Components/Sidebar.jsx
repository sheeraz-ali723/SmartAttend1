import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiCheckSquare,
  FiCalendar,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiCamera,
  FiLogOut,
  FiGrid,
  FiX,
} from "react-icons/fi";

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(() => {
    try {
      const savedAdmin = localStorage.getItem("smartAttendAdmin");
      return savedAdmin ? JSON.parse(savedAdmin) : null;
    } catch (error) {
      console.error("Failed to load administrator:", error);
      return null;
    }
  });

  // Reload administrator information
  useEffect(() => {
    const loadAdmin = () => {
      try {
        const savedAdmin = localStorage.getItem("smartAttendAdmin");
        setAdmin(savedAdmin ? JSON.parse(savedAdmin) : null);
      } catch (error) {
        console.error("Failed to load administrator:", error);
        setAdmin(null);
      }
    };

    window.addEventListener("smartAttendAccountChanged", loadAdmin);

    return () => {
      window.removeEventListener("smartAttendAccountChanged", loadAdmin);
    };
  }, []);

  const mainMenu = [
    { name: "Dashboard", path: "/", icon: FiHome },
    { name: "Students", path: "/students", icon: FiUsers },
    { name: "Classes", path: "/classes", icon: FiGrid },
    { name: "Attendance", path: "/attendance", icon: FiCheckSquare },
    {
      name: "Attendance History",
      path: "/attendance-history",
      icon: FiCalendar,
    },
    { name: "Reports", path: "/reports", icon: FiFileText },
  ];

  const systemMenu = [
    {
      name: "Analytics",
      path: "/analytics",
      icon: FiBarChart2,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: FiSettings,
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("smartAttendToken");
    localStorage.removeItem("smartAttendAdmin");

    navigate("/login", {
      replace: true,
    });
  };

  const handleNavigation = () => {
    setMobileOpen(false);
  };

  const adminInitial = admin?.name
    ? admin.name.charAt(0).toUpperCase()
    : "A";

  return (
    <>
      {/* =========================
          MOBILE OVERLAY
      ========================== */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`
          fixed inset-0 z-40 bg-black/40
          transition-opacity duration-300
          md:hidden
          ${
            mobileOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }
        `}
      />

      {/* =========================
          SIDEBAR
      ========================== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 max-w-[85vw] flex-col
          overflow-hidden
          border-r border-gray-200 bg-white

          transform
          transition-transform duration-300 ease-in-out

          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }

          md:translate-x-0
        `}
      >
        {/* =========================
            LOGO
        ========================== */}
        <div className="flex h-20 flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FiCamera size={21} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-gray-900">
                SmartAttend
              </h1>

              <p className="truncate text-xs text-gray-500">
                AI Attendance
              </p>
            </div>
          </div>

          {/* MOBILE CLOSE */}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 md:hidden"
            aria-label="Close menu"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* =========================
            NAVIGATION
        ========================== */}
        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 sm:px-4 sm:py-6">
          {/* MAIN MENU */}
          <div>
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Main Menu
            </p>

            <div className="space-y-1">
              {mainMenu.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    onClick={handleNavigation}
                    className={({ isActive }) =>
                      `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`
                    }
                  >
                    <Icon
                      size={19}
                      className="flex-shrink-0"
                    />

                    <span className="truncate">
                      {item.name}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* SYSTEM MENU */}
          <div className="mt-8">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              System
            </p>

            <div className="space-y-1">
              {systemMenu.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleNavigation}
                    className={({ isActive }) =>
                      `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`
                    }
                  >
                    <Icon
                      size={19}
                      className="flex-shrink-0"
                    />

                    <span className="truncate">
                      {item.name}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </nav>

        {/* =========================
            ADMINISTRATOR
        ========================== */}
        <div className="flex-shrink-0 border-t border-gray-200 p-3 sm:p-4">
          <div className="mb-4 flex min-w-0 items-center gap-3">
            {/* PROFILE IMAGE */}
            {admin?.profilePicture ? (
              <img
                src={admin.profilePicture}
                alt="Administrator"
                className="h-10 w-10 flex-shrink-0 rounded-full border border-gray-200 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";

                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display =
                      "flex";
                  }
                }}
              />
            ) : null}

            {/* FALLBACK INITIAL */}
            <div
              className={`h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 ${
                admin?.profilePicture ? "hidden" : "flex"
              }`}
            >
              {adminInitial}
            </div>

            {/* ADMIN INFO */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {admin?.name || "Administrator"}
              </p>

              <p className="truncate text-xs text-gray-500">
                {admin?.role || "Administrator"}
              </p>
            </div>
          </div>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <FiLogOut
              size={19}
              className="flex-shrink-0"
            />

            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;