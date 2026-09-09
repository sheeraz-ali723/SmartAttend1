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
} from "react-icons/fi";

const Sidebar = () => {
  const navigate = useNavigate();

  // Load administrator information from localStorage
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
  const loadAdmin = () => {
    try {
      const savedAdmin = localStorage.getItem("smartAttendAdmin");

      setAdmin(savedAdmin ? JSON.parse(savedAdmin) : null);
    } catch (error) {
      console.error("Failed to load administrator:", error);
      setAdmin(null);
    }
  };

  // Listen for account changes from Settings page
  useEffect(() => {
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

  // Main navigation
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

  // System navigation
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

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("smartAttendToken");
    localStorage.removeItem("smartAttendAdmin");

    navigate("/login", {
      replace: true,
    });
  };

  // Administrator initial
  const adminInitial = admin?.name
    ? admin.name.charAt(0).toUpperCase()
    : "A";

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex">

      {/* =====================================================
          LOGO
      ====================================================== */}
      <div className="flex h-20 items-center gap-3 border-b border-gray-200 px-6">
        
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <FiCamera size={21} />
        </div>

        <div>
          <h1 className="text-lg font-bold text-gray-900">
            SmartAttend
          </h1>

          <p className="text-xs text-gray-500">
            AI Attendance
          </p>
        </div>

      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">

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
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  <Icon size={19} />

                  <span>
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
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  <Icon size={19} />

                  <span>
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
          </div>

        </div>

      </nav>

      {/* =====================================================
          ADMINISTRATOR PROFILE
      ====================================================== */}
      <div className="border-t border-gray-200 p-4">

        <div className="mb-4 flex items-center gap-3">

          {/* PROFILE PICTURE */}
          {admin?.profilePicture ? (
            <img
              src={admin.profilePicture}
              alt="Administrator"
              className="h-10 w-10 flex-shrink-0 rounded-full border border-gray-200 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling.style.display =
                  "flex";
              }}
            />
          ) : null}

          {/* DEFAULT INITIAL */}
          <div
            className={`h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 ${
              admin?.profilePicture ? "hidden" : "flex"
            }`}
          >
            {adminInitial}
          </div>

          {/* ADMIN INFORMATION */}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {admin?.name || "Administrator"}
            </p>

            <p className="truncate text-xs text-gray-500">
              {admin?.role || "Administrator"}
            </p>
          </div>

        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          <FiLogOut size={19} />

          <span>
            Logout
          </span>
        </button>

      </div>

    </aside>
  );
};

export default Sidebar;