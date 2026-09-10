import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50">

      {/* SIDEBAR */}
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* MAIN CONTENT */}
      <main className="min-h-screen min-w-0 max-w-full overflow-x-hidden md:ml-64">

        {/* NAVBAR */}
        <Navbar
          setMobileOpen={setMobileOpen}
        />

        {/* PAGE CONTENT */}
        <div className="min-w-0 max-w-full p-4 sm:p-6">
          <Outlet />
        </div>

      </main>

    </div>
  );
};

export default Layout;