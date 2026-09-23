import { useEffect, useMemo, useState } from "react";
import Sidebar from "../Components/Sidebar";
import {
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiTrendingUp,
  FiBarChart2,
  FiCalendar,
} from "react-icons/fi";

const Analytics = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // FETCH DATA
  // ======================================================
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const [studentsRes, attendanceRes, todayRes] = await Promise.all([
        fetch("https://projects-cs-production.up.railway.app/api/students"),
        fetch("https://projects-cs-production.up.railway.app/api/attendance"),
        fetch("https://projects-cs-production.up.railway.app/api/attendance/today"),
      ]);

      const studentsData = await studentsRes.json();
      const attendanceData = await attendanceRes.json();
      const todayData = await todayRes.json();

      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      setTodayAttendance(Array.isArray(todayData) ? todayData : []);
    } catch (error) {
      console.error("Analytics data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAnalyticsData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  // ======================================================
  // TODAY'S DATA
  // ======================================================
  const todayStats = useMemo(() => {
    const total = students.length;

    const uniqueStudents = new Map();

    todayAttendance.forEach((record) => {
      const studentId = record.student?._id;

      if (!studentId) return;

      const existing = uniqueStudents.get(studentId);

      // Present has priority if duplicate records exist
      if (!existing || record.status === "Present") {
        uniqueStudents.set(studentId, record);
      }
    });

    let present = 0;
    let absent = 0;

    uniqueStudents.forEach((record) => {
      if (record.status === "Present") {
        present++;
      } else if (record.status === "Absent") {
        absent++;
      }
    });

    // Students without an attendance record are not counted as
    // absent automatically here.
    const attendanceRate =
      total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total,
      present,
      absent,
      attendanceRate: Math.min(attendanceRate, 100),
    };
  }, [students, todayAttendance]);

  // ======================================================
  // WEEKLY DATA
  // ======================================================
  const weeklyData = useMemo(() => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    return days.map((day) => {
      const dateKey = day.toLocaleDateString("en-CA", {
        timeZone: "Asia/Karachi",
      });

      const dayRecords = attendance.filter((record) => {
        if (!record.date || !record.student?._id) return false;

        const recordDate = new Date(record.date).toLocaleDateString(
          "en-CA",
          {
            timeZone: "Asia/Karachi",
          }
        );

        return recordDate === dateKey;
      });

      // Deduplicate students for the day
      const uniqueStudents = new Map();

      dayRecords.forEach((record) => {
        const studentId = record.student?._id;

        if (!studentId) return;

        const existing = uniqueStudents.get(studentId);

        if (!existing || record.status === "Present") {
          uniqueStudents.set(studentId, record);
        }
      });

      let present = 0;
      let absent = 0;

      uniqueStudents.forEach((record) => {
        if (record.status === "Present") {
          present++;
        } else if (record.status === "Absent") {
          absent++;
        }
      });

      const totalMarked = present + absent;

      const percentage =
        students.length > 0
          ? Math.round((present / students.length) * 100)
          : 0;

      return {
        date: day,
        day: day.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        fullDay: day.toLocaleDateString("en-US", {
          weekday: "long",
        }),
        dateNumber: day.getDate(),
        present,
        absent,
        totalMarked,
        percentage: Math.min(percentage, 100),
      };
    });
  }, [attendance, students]);

  // ======================================================
  // OVERALL DATA
  // ======================================================
  const overallStats = useMemo(() => {
    let present = 0;
    let absent = 0;

    attendance.forEach((record) => {
      if (!record.student?._id) return;

      if (record.status === "Present") {
        present++;
      } else if (record.status === "Absent") {
        absent++;
      }
    });

    const total = present + absent;

    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      present,
      absent,
      total,
      rate: Math.min(rate, 100),
    };
  }, [attendance]);

  // ======================================================
  // FORMAT DATE
  // ======================================================
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>

              <p className="text-sm font-medium text-gray-500">
                Loading analytics...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ==================================================
          SIDEBAR
      ================================================== */}
      <Sidebar />

      {/* ==================================================
          MAIN CONTENT
      ================================================== */}
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* ==================================================
              HEADER
          ================================================== */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Analytics
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Analyze student attendance performance
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
              <FiCalendar className="text-blue-600" size={18} />

              <span className="text-sm font-medium text-gray-600">
                {formatDate(new Date())}
              </span>
            </div>
          </div>

          {/* ==================================================
              STAT CARDS
          ================================================== */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Total Students */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Students
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-gray-900">
                    {todayStats.total}
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    Registered students
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <FiUsers className="text-blue-600" size={22} />
                </div>
              </div>
            </div>

            {/* Present Today */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Present Today
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-gray-900">
                    {todayStats.present}
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    Students present
                  </p>
                </div>

                <div className="rounded-lg bg-green-50 p-3">
                  <FiCheckCircle
                    className="text-green-600"
                    size={22}
                  />
                </div>
              </div>
            </div>

            {/* Absent Today */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Absent Today
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-gray-900">
                    {todayStats.absent}
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    Students absent
                  </p>
                </div>

                <div className="rounded-lg bg-red-50 p-3">
                  <FiXCircle className="text-red-600" size={22} />
                </div>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Attendance Rate
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-gray-900">
                    {todayStats.attendanceRate}%
                  </h2>

                  <p className="mt-1 text-xs text-gray-400">
                    Today's attendance
                  </p>
                </div>

                <div className="rounded-lg bg-purple-50 p-3">
                  <FiTrendingUp
                    className="text-purple-600"
                    size={22}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================
              WEEKLY ATTENDANCE
          ================================================== */}
          <section className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <FiBarChart2 className="text-blue-600" size={20} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Weekly Attendance
                </h2>

                <p className="text-sm text-gray-500">
                  Attendance percentage for the last 7 days
                </p>
              </div>
            </div>

            {/* Weekly Chart */}
            <div className="grid grid-cols-7 gap-2 sm:gap-4">
              {weeklyData.map((item) => (
                <div
                  key={item.date.toISOString()}
                  className="flex min-w-0 flex-col items-center"
                >
                  {/* Percentage */}
                  <span className="mb-2 text-xs font-bold text-gray-700 sm:text-sm">
                    {item.percentage}%
                  </span>

                  {/* Chart Area */}
                  <div className="relative flex h-48 w-full max-w-[70px] items-end justify-center rounded-lg bg-gray-50 p-2 sm:h-56">
                    <div className="absolute inset-x-0 bottom-0 h-full rounded-lg bg-gray-50"></div>

                    <div
                      className="relative z-10 w-full max-w-[38px] rounded-t-md bg-blue-500 transition-all duration-500"
                      style={{
                        height: `${Math.max(
                          item.percentage,
                          item.percentage > 0 ? 4 : 1
                        )}%`,
                      }}
                      title={`${item.percentage}% attendance`}
                    ></div>
                  </div>

                  {/* Day */}
                  <span className="mt-3 text-xs font-semibold text-gray-700 sm:text-sm">
                    {item.day}
                  </span>

                  {/* Date */}
                  <span className="text-[10px] text-gray-400 sm:text-xs">
                    {item.dateNumber}
                  </span>

                  {/* Counts */}
                  <div className="mt-2 text-center text-[10px] leading-4 sm:text-xs">
                    <p className="font-medium text-green-600">
                      P: {item.present}
                    </p>

                    <p className="font-medium text-red-500">
                      A: {item.absent}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-5 border-t border-gray-100 pt-5 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                Attendance %
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                Present
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                Absent
              </div>
            </div>
          </section>

          {/* ==================================================
              SUMMARY + TODAY BREAKDOWN
          ================================================== */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Attendance Summary */}
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Attendance Summary
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Overall attendance statistics
                </p>
              </div>

              {/* Overall Rate */}
              <div className="mb-6 rounded-xl bg-gray-50 p-5 text-center">
                <p className="text-sm font-medium text-gray-500">
                  Overall Attendance
                </p>

                <h3 className="mt-2 text-4xl font-bold text-blue-600">
                  {overallStats.rate}%
                </h3>

                <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${overallStats.rate}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Present */}
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500"></span>

                    <span className="text-sm font-medium text-gray-700">
                      Present
                    </span>
                  </div>

                  <span className="text-sm font-bold text-gray-900">
                    {overallStats.present}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{
                      width:
                        overallStats.total > 0
                          ? `${Math.round(
                              (overallStats.present /
                                overallStats.total) *
                                100
                            )}%`
                          : "0%",
                    }}
                  ></div>
                </div>
              </div>

              {/* Absent */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500"></span>

                    <span className="text-sm font-medium text-gray-700">
                      Absent
                    </span>
                  </div>

                  <span className="text-sm font-bold text-gray-900">
                    {overallStats.absent}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{
                      width:
                        overallStats.total > 0
                          ? `${Math.round(
                              (overallStats.absent /
                                overallStats.total) *
                                100
                            )}%`
                          : "0%",
                    }}
                  ></div>
                </div>
              </div>
            </section>

            {/* Today's Breakdown */}
            <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Today's Breakdown
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Current student attendance status
                </p>
              </div>

              <div className="space-y-4">
                {/* Total */}
                <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2">
                      <FiUsers className="text-blue-600" size={20} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Total Students
                      </p>

                      <p className="text-xs text-gray-400">
                        Registered
                      </p>
                    </div>
                  </div>

                  <span className="text-2xl font-bold text-gray-900">
                    {todayStats.total}
                  </span>
                </div>

                {/* Present */}
                <div className="flex items-center justify-between rounded-xl border border-green-100 bg-green-50/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100 p-2">
                      <FiCheckCircle
                        className="text-green-600"
                        size={20}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Present
                      </p>

                      <p className="text-xs text-green-600">
                        {todayStats.total > 0
                          ? Math.round(
                              (todayStats.present /
                                todayStats.total) *
                                100
                            )
                          : 0}
                        % of students
                      </p>
                    </div>
                  </div>

                  <span className="text-2xl font-bold text-green-600">
                    {todayStats.present}
                  </span>
                </div>

                {/* Absent */}
                <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/40 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-red-100 p-2">
                      <FiXCircle className="text-red-600" size={20} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Absent
                      </p>

                      <p className="text-xs text-red-500">
                        {todayStats.total > 0
                          ? Math.round(
                              (todayStats.absent /
                                todayStats.total) *
                                100
                            )
                          : 0}
                        % of students
                      </p>
                    </div>
                  </div>

                  <span className="text-2xl font-bold text-red-600">
                    {todayStats.absent}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* ==================================================
              FOOTER INFORMATION
          ================================================== */}
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <FiTrendingUp
                className="mt-0.5 shrink-0 text-blue-600"
                size={20}
              />

              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  Attendance Insight
                </h3>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  Today's attendance rate is{" "}
                  <strong>{todayStats.attendanceRate}%</strong>.
                  The weekly chart shows attendance performance
                  across the last seven days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;