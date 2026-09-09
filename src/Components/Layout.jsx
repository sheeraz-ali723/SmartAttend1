import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Page Content */}
      <main className="min-h-screen md:ml-64">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;