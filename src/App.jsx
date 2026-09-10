import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import AttendanceHistory from "./pages/AttendanceHistory";
import AttendanceTest from "./pages/AttendanceTest";
import AttendanceKiosk from "./pages/AttendanceKiosk";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Classes from "./pages/Classes";

import ProtectedRoute from "./Components/ProtectedRoute";
import Layout from "./Components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ==================================================
            LOGIN
        ================================================== */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* ==================================================
            ATTENDANCE KIOSK
            No Admin Sidebar
            No Admin Dashboard
        ================================================== */}
        <Route
          path="/attendance-kiosk"
          element={<AttendanceKiosk />}
        />

        {/* ==================================================
            PROTECTED ADMIN AREA
        ================================================== */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/students"
              element={<Students />}
            />
            <Route path="/classes" element={<Classes />} />

            <Route
              path="/attendance"
              element={<Attendance />}
            />

            <Route
              path="/attendance-test"
              element={<AttendanceTest />}
            />

            <Route
              path="/attendance-history"
              element={<AttendanceHistory />}
            />

            <Route
              path="/reports"
              element={<Reports />}
            />

            <Route
              path="/analytics"
              element={<Analytics />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;