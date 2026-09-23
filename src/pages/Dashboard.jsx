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
  const [todayAttendance, setTodayAttendance] = useState([]);

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
            "https://projects-cs-production.up.railway.app/api/students",
            { headers }
          ),
          fetch(
            "https://projects-cs-production.up.railway.app/api/attendance",
            { headers }
          ),
          fetch(
            "https://projects-cs-production.up.railway.app/api/attendance/today",
            { headers }
          ),
        ]);

        if (
          studentsResponse.status === 401 ||
          attendanceResponse.status === 401 ||
          todayAttendanceResponse.status === 401
        ) {
          localStorage.removeItem("smartAttendToken");
          localStorage.removeItem("smartAttendAdmin");

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
  // HELPERS
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

  const getPakistanDateKey = (date) => {
    if (!date) return null;

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  };

  const getDayName = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      weekday: "short",
    }).format(date);
  };

  // ======================================================
  // TODAY'S ATTENDANCE
  // ======================================================

  const validTodayAttendance =
    todayAttendance.filter(
      (record) =>
        record &&
        record.student
    );

  const todayStudentStatus = new Map();

  validTodayAttendance.forEach(
    (record) => {
      const studentId = getStudentId(
        record.student
      );

      if (!studentId) return;

      const existingStatus =
        todayStudentStatus.get(studentId);

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

  const presentCount = Array.from(
    todayStudentStatus.values()
  ).filter(
    (status) => status === "Present"
  ).length;

  const absentCount = Math.max(
    students.length - presentCount,
    0
  );

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
  // STAT CARDS
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

    const present =
      Array.from(
        studentStatusForDay.values()
      ).filter(
        (status) =>
          status === "Present"
      ).length;

    let absent = 0;

    if (dayRecords.length > 0) {
      absent = Math.max(
        students.length - present,
        0
      );
    }

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
        timeZone: "Asia/Karachi",
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
    <div className="w-full min-w-0">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Welcome back, Admin 👋
        </p>
      </div>

      {/* ==================================================
          STAT CARDS
      ================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">

        {stats.map((stat, index) => (
          <div
            key={index}
            className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">

              <div className="min-w-0">

                <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
                  {stat.title}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-800 sm:mt-2 sm:text-3xl">
                  {stat.value}
                </h2>

                <p className="mt-1 truncate text-[11px] text-slate-400 sm:text-xs">
                  {stat.description}
                </p>

              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600 sm:h-12 sm:w-12 sm:text-xl">
                {stat.icon}
              </div>

            </div>
          </div>
        ))}

      </div>

      {/* ==================================================
          LOWER SECTION
      ================================================== */}

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-2">

        {/* =================================================
            ATTENDANCE OVERVIEW
        ================================================= */}

        <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-6">

          <div className="mb-5 sm:mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              Attendance Overview
            </h2>

            <p className="text-xs text-slate-400 sm:text-sm">
              Weekly attendance statistics
            </p>
          </div>

          <div className="w-full rounded-xl bg-slate-50 p-3 sm:p-5">

            {/* CHART */}

            <div className="flex h-52 w-full items-end justify-between gap-1 sm:h-56 sm:gap-3">

              {attendanceData.map(
                (item, index) => (
                  <div
                    key={index}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  >

                    {/* BARS */}

                    <div className="flex h-44 w-full max-w-14 items-end justify-center gap-0.5 sm:h-48 sm:gap-1">

                      {/* PRESENT */}

                      <div
                        className="w-1/2 rounded-t-sm bg-blue-500 transition-all duration-300 sm:rounded-t-md"
                        style={{
                          height: `${Math.min(
                            item.present *
                              1.75,
                            175
                          )}px`,
                        }}
                        title={`Present: ${item.present}%`}
                      />

                      {/* ABSENT */}

                      <div
                        className="w-1/2 rounded-t-sm bg-red-300 transition-all duration-300 sm:rounded-t-md"
                        style={{
                          height: `${Math.min(
                            item.absent *
                              1.75,
                            175
                          )}px`,
                        }}
                        title={`Absent: ${item.absent}%`}
                      />

                    </div>

                    {/* DAY */}

                    <p className="mt-2 text-[10px] font-medium text-slate-500 sm:mt-3 sm:text-xs">
                      {item.day}
                    </p>

                  </div>
                )
              )}

            </div>

            {/* LEGEND */}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 pt-3 sm:mt-5 sm:gap-6 sm:pt-4">

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 sm:h-3 sm:w-3" />

                <span className="text-[11px] text-slate-500 sm:text-xs">
                  Present
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300 sm:h-3 sm:w-3" />

                <span className="text-[11px] text-slate-500 sm:text-xs">
                  Absent
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            RECENT ATTENDANCE
        ================================================= */}

        <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-6">

          <div className="mb-5 sm:mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              Recent Attendance
            </h2>

            <p className="text-xs text-slate-400 sm:text-sm">
              Today's latest records
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">

            {recentAttendance.length === 0 ? (
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
                    className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 pb-3"
                  >

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-medium text-slate-700 sm:text-base">
                        {record.student
                          ?.name ||
                          "Unknown Student"}
                      </p>

                      <p className="text-[11px] text-slate-400 sm:text-xs">
                        {formatTime(
                          record.date
                        )}
                      </p>

                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium sm:px-3 sm:text-xs ${
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
