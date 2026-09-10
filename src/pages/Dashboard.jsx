import { useEffect, useState } from "react";
import {
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
} from "react-icons/fi";

const Dashboard = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] =
    useState([]);

  // ======================================================
  // FETCH DASHBOARD DATA
  // ======================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token =
          localStorage.getItem("smartAttendToken");

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          studentsResponse,
          attendanceResponse,
          todayAttendanceResponse,
        ] = await Promise.all([
          fetch(
            "http://railway-up-production-d063.up.railway.app/api/students",
            {
              headers,
            }
          ),
          fetch(
            "http://railway-up-production-d063.up.railway.app/api/attendance",
            {
              headers,
            }
          ),
          fetch(
            "http://railway-up-production-d063.up.railway.app/api/attendance/today",
            {
              headers,
            }
          ),
        ]);

        // --------------------------------------------------
        // AUTHENTICATION CHECK
        // --------------------------------------------------

        if (
          studentsResponse.status === 401 ||
          attendanceResponse.status === 401 ||
          todayAttendanceResponse.status === 401
        ) {
          localStorage.removeItem(
            "smartAttendToken"
          );

          localStorage.removeItem(
            "smartAttendAdmin"
          );

          window.location.href = "/login";

          return;
        }

        if (
          !studentsResponse.ok ||
          !attendanceResponse.ok ||
          !todayAttendanceResponse.ok
        ) {
          throw new Error(
            "Failed to fetch dashboard data"
          );
        }

        const studentsData =
          await studentsResponse.json();

        const attendanceData =
          await attendanceResponse.json();

        const todayAttendanceData =
          await todayAttendanceResponse.json();

        setStudents(
          Array.isArray(studentsData)
            ? studentsData
            : []
        );

        setAttendance(
          Array.isArray(attendanceData)
            ? attendanceData
            : []
        );

        setTodayAttendance(
          Array.isArray(todayAttendanceData)
            ? todayAttendanceData
            : []
        );
      } catch (error) {
        console.error(
          "Failed to fetch dashboard data:",
          error
        );
      }
    };

    fetchData();

    // Refresh when returning to Dashboard
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible"
      ) {
        fetchData();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  // ======================================================
  // GET STUDENT ID
  // ======================================================

  const getStudentId = (student) => {
    if (!student) return null;

    if (typeof student === "object") {
      return student._id
        ? student._id.toString()
        : null;
    }

    return student.toString();
  };

  // ======================================================
  // GET PAKISTAN DATE KEY
  // ======================================================

  const getPakistanDateKey = (date) => {
    if (!date) return null;

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  };

  // ======================================================
  // GET DAY NAME
  // ======================================================

  const getDayName = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      weekday: "short",
    }).format(date);
  };

  // ======================================================
  // TODAY'S VALID ATTENDANCE
  // ======================================================

  const validTodayAttendance =
    todayAttendance.filter(
      (record) =>
        record &&
        record.student
    );

  // ======================================================
  // UNIQUE TODAY'S STUDENT STATUS
  // ======================================================

  const todayStudentStatus = new Map();

  validTodayAttendance.forEach(
    (record) => {
      const studentId = getStudentId(
        record.student
      );

      if (!studentId) return;

      const existingStatus =
        todayStudentStatus.get(studentId);

      // Present gets priority
      if (
        !existingStatus ||
        record.status === "Present"
      ) {
        todayStudentStatus.set(
          studentId,
          record.status
        );
      }
    }
  );

  // ======================================================
  // PRESENT TODAY
  // ======================================================

  const presentCount = Array.from(
    todayStudentStatus.values()
  ).filter(
    (status) => status === "Present"
  ).length;

  // ======================================================
  // ABSENT TODAY
  // ======================================================

  const absentCount = Math.max(
    students.length - presentCount,
    0
  );

  // ======================================================
  // ATTENDANCE RATE
  // ======================================================

  const attendanceRate =
    students.length > 0
      ? Math.min(
          Math.round(
            (presentCount /
              students.length) *
              100
          ),
          100
        )
      : 0;

  // ======================================================
  // DASHBOARD CARDS
  // ======================================================

  const stats = [
    {
      title: "Total Students",
      value: students.length,
      icon: <FiUsers />,
      description: "Registered students",
    },
    {
      title: "Present Today",
      value: presentCount,
      icon: <FiCheckCircle />,
      description: "Students present",
    },
    {
      title: "Absent Today",
      value: absentCount,
      icon: <FiXCircle />,
      description: "Students absent",
    },
    {
      title: "Attendance Rate",
      value: `${attendanceRate}%`,
      icon: <FiCalendar />,
      description: "Today's attendance",
    },
  ];

  // ======================================================
  // WEEKLY ATTENDANCE
  // ======================================================

  const attendanceData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();

    date.setDate(
      date.getDate() - i
    );

    const targetDateKey =
      getPakistanDateKey(date);

    // ----------------------------------------------------
    // GET RECORDS FOR THIS DAY
    // ----------------------------------------------------

    const dayRecords =
      attendance.filter((record) => {
        if (
          !record.date ||
          !record.student
        ) {
          return false;
        }

        return (
          getPakistanDateKey(
            record.date
          ) === targetDateKey
        );
      });

    // ----------------------------------------------------
    // UNIQUE STUDENT STATUS
    // ----------------------------------------------------

    const studentStatusForDay =
      new Map();

    dayRecords.forEach(
      (record) => {
        const studentId =
          getStudentId(
            record.student
          );

        if (!studentId) return;

        const existingStatus =
          studentStatusForDay.get(
            studentId
          );

        // Present gets priority
        if (
          !existingStatus ||
          record.status === "Present"
        ) {
          studentStatusForDay.set(
            studentId,
            record.status
          );
        }
      }
    );

    // ----------------------------------------------------
    // PRESENT
    // ----------------------------------------------------

    const present =
      Array.from(
        studentStatusForDay.values()
      ).filter(
        (status) =>
          status === "Present"
      ).length;

    // ----------------------------------------------------
    // ABSENT
    // ----------------------------------------------------

    let absent = 0;

    if (dayRecords.length > 0) {
      absent = Math.max(
        students.length - present,
        0
      );
    }

    // ----------------------------------------------------
    // PERCENTAGES
    // ----------------------------------------------------

    const presentPercentage =
      students.length > 0
        ? Math.min(
            Math.round(
              (present /
                students.length) *
                100
            ),
            100
          )
        : 0;

    const absentPercentage =
      students.length > 0
        ? Math.min(
            Math.round(
              (absent /
                students.length) *
                100
            ),
            100
          )
        : 0;

    attendanceData.push({
      day: getDayName(date),
      present: presentPercentage,
      absent: absentPercentage,
    });
  }

  // ======================================================
  // RECENT ATTENDANCE
  // ======================================================

  const recentAttendance =
    todayAttendance
      .filter(
        (record) =>
          record &&
          record.student &&
          record.date
      )
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(0, 5);

  // ======================================================
  // FORMAT TIME
  // ======================================================

  const formatTime = (date) => {
    if (!date) return "--:--";

    return new Date(
      date
    ).toLocaleTimeString(
      "en-PK",
      {
        timeZone:
          "Asia/Karachi",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );
  };

  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          Dashboard
        </h1>

        <p className="mt-1 text-sm sm:text-base text-slate-500">
          Welcome back, Admin 👋
        </p>
      </div>

      {/* ==================================================
          STAT CARDS
      ================================================== */}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

        {stats.map(
          (stat, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-slate-800">
                    {stat.value}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {stat.description}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
                  {stat.icon}
                </div>

              </div>
            </div>
          )
        )}

      </div>

      {/* ==================================================
          LOWER SECTION
      ================================================== */}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* =================================================
            ATTENDANCE OVERVIEW
        ================================================= */}

        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              Attendance Overview
            </h2>

            <p className="text-sm text-slate-400">
              Weekly attendance statistics
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 sm:p-5">

            {/* BAR SECTION */}

            <div className="flex h-56 items-end justify-between gap-2 sm:gap-3">

              {attendanceData.map(
                (item, index) => (
                  <div
                    key={index}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  >

                    {/* BARS */}

                    <div className="flex h-48 w-full max-w-12 items-end justify-center gap-1 overflow-hidden">

                      {/* PRESENT */}

                      <div
                        className="w-1/2 rounded-t-md bg-blue-500 transition-all duration-300"
                        style={{
                          height: `${Math.min(
                            item.present *
                              1.92,
                            192
                          )}px`,
                        }}
                        title={`Present: ${item.present}%`}
                      />

                      {/* ABSENT */}

                      <div
                        className="w-1/2 rounded-t-md bg-red-300 transition-all duration-300"
                        style={{
                          height: `${Math.min(
                            item.absent *
                              1.92,
                            192
                          )}px`,
                        }}
                        title={`Absent: ${item.absent}%`}
                      />

                    </div>

                    {/* DAY */}

                    <p className="mt-3 text-xs font-medium text-slate-500">
                      {item.day}
                    </p>

                  </div>
                )
              )}

            </div>

            {/* LEGEND */}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-5 sm:gap-6 border-t border-slate-200 pt-4">

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500"></span>

                <span className="text-xs text-slate-500">
                  Present
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-300"></span>

                <span className="text-xs text-slate-500">
                  Absent
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            RECENT ATTENDANCE
        ================================================= */}

        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm">

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              Recent Attendance
            </h2>

            <p className="text-sm text-slate-400">
              Today's latest records
            </p>
          </div>

          <div className="space-y-4">

            {recentAttendance.length ===
            0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No attendance records
                for today.
              </p>
            ) : (
              recentAttendance.map(
                (record, index) => (
                  <div
                    key={
                      record._id ||
                      index
                    }
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3"
                  >

                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-700">
                        {record.student
                          ?.name ||
                          "Unknown Student"}
                      </p>

                      <p className="text-xs text-slate-400">
                        {formatTime(
                          record.date
                        )}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        record.status ===
                        "Present"
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {record.status}
                    </span>

                  </div>
                )
              )
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;