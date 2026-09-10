import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* SIDEBAR */}
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* MAIN CONTENT */}
      <main className="min-h-screen md:ml-64">

        {/* NAVBAR */}
        <Navbar
          setMobileOpen={setMobileOpen}
        />

        {/* PAGE */}
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>

      </main>

    </div>
  );
};

export default Layout;