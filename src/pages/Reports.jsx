import { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiDownload,
  FiFilter,
  FiBarChart2,
} from "react-icons/fi";

const Reports = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const [loading, setLoading] = useState(true);

  // ======================================================
  // FETCH DATA
  // ======================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem("smartAttendToken");

        const headers = token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {};

        const [studentsRes, attendanceRes] = await Promise.all([
          fetch(
            "https://projects-cs-production.up.railway.app/api/students",
            { headers }
          ),
          fetch(
            "https://projects-cs-production.up.railway.app/api/attendance",
            { headers }
          ),
        ]);

        if (studentsRes.status === 401 || attendanceRes.status === 401) {
          localStorage.removeItem("smartAttendToken");
          localStorage.removeItem("smartAttendAdmin");
          window.location.href = "/login";
          return;
        }

        if (!studentsRes.ok || !attendanceRes.ok) {
          throw new Error("Failed to fetch report data");
        }

        const studentsData = await studentsRes.json();
        const attendanceData = await attendanceRes.json();

        setStudents(Array.isArray(studentsData) ? studentsData : []);

        setAttendance(
          Array.isArray(attendanceData) ? attendanceData : []
        );
      } catch (error) {
        console.error("Reports fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ======================================================
  // GET STUDENT ID
  // ======================================================
  const getStudentId = (student) => {
    if (!student) return null;

    if (typeof student === "object") {
      return student._id ? student._id.toString() : null;
    }

    return student.toString();
  };

  // ======================================================
  // FORMAT DATE
  // ======================================================
  const formatDate = (date) => {
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  // ======================================================
  // FORMAT TIME
  // ======================================================
  const formatTime = (date) => {
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  // ======================================================
  // DATE KEY - PAKISTAN TIME
  // ======================================================
  const getPakistanDateKey = (date) => {
    if (!date) return "";

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  };

  // ======================================================
  // DEPARTMENTS
  // ======================================================
  const departments = useMemo(() => {
    const values = students
      .map((student) => student.department)
      .filter(Boolean);

    return [...new Set(values)];
  }, [students]);

  // ======================================================
  // FILTER ATTENDANCE
  // ======================================================
  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      if (!record.student) return false;

      const student = record.student;

      const studentId = getStudentId(student);

      const studentDepartment =
        typeof student === "object"
          ? student.department || ""
          : "";

      // Student filter
      if (
        selectedStudent !== "All" &&
        studentId !== selectedStudent
      ) {
        return false;
      }

      // Department filter
      if (
        selectedDepartment !== "All" &&
        studentDepartment !== selectedDepartment
      ) {
        return false;
      }

      // Status filter
      if (
        selectedStatus !== "All" &&
        record.status !== selectedStatus
      ) {
        return false;
      }

      // Date filter
      if (
        selectedDate &&
        getPakistanDateKey(record.date) !== selectedDate
      ) {
        return false;
      }

      return true;
    });
  }, [
    attendance,
    selectedDate,
    selectedStudent,
    selectedDepartment,
    selectedStatus,
  ]);

  // ======================================================
  // REPORT STATISTICS
  // ======================================================
  const reportStats = useMemo(() => {
    const present = filteredAttendance.filter(
      (record) => record.status === "Present"
    ).length;

    const absent = filteredAttendance.filter(
      (record) => record.status === "Absent"
    ).length;

    const total = present + absent;

    const percentage =
      total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      present,
      absent,
      total,
      percentage,
    };
  }, [filteredAttendance]);

  // ======================================================
  // RESET FILTERS
  // ======================================================
  const resetFilters = () => {
    setSelectedDate("");
    setSelectedStudent("All");
    setSelectedDepartment("All");
    setSelectedStatus("All");
  };

  // ======================================================
  // EXPORT CSV
  // ======================================================
  const exportCSV = () => {
    if (filteredAttendance.length === 0) {
      alert("No attendance records available to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Roll Number",
      "Department",
      "Date",
      "Time",
      "Status",
      "Marked By",
    ];

    const rows = filteredAttendance.map((record) => {
      const student = record.student || {};

      return [
        student.name || "Unknown",
        student.rollNumber || "-",
        student.department || "-",
        formatDate(record.date),
        formatTime(record.date),
        record.status || "-",
        record.markedBy || "-",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `smartattend-report-${
      selectedDate || "all-dates"
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-w-0">

      {/* ======================================================
          HEADER
      ====================================================== */}
      <div className="mb-5 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            Reports
          </h1>

          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            Generate and analyze attendance reports
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 sm:w-auto sm:px-5"
        >
          <FiDownload size={18} />
          Export CSV
        </button>
      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}
      <div className="mb-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:mb-6 sm:p-5">
        <div className="mb-4 flex items-center gap-2 sm:mb-5">
          <FiFilter
            className="text-blue-600"
            size={19}
          />

          <h2 className="text-base font-semibold text-gray-800 sm:text-lg">
            Report Filters
          </h2>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">

          {/* DATE */}
          <div className="min-w-0">
            <label className="mb-2 block text-xs font-medium text-gray-600 sm:text-sm">
              Date
            </label>

            <div className="relative">
              <FiCalendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={17}
              />

              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
                className="w-full min-w-0 rounded-lg border border-gray-200 py-2.5 pl-10 pr-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* STUDENT */}
          <div className="min-w-0">
            <label className="mb-2 block text-xs font-medium text-gray-600 sm:text-sm">
              Student
            </label>

            <select
              value={selectedStudent}
              onChange={(e) =>
                setSelectedStudent(e.target.value)
              }
              className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Students</option>

              {students.map((student) => (
                <option
                  key={student._id}
                  value={student._id}
                >
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          {/* DEPARTMENT */}
          <div className="min-w-0">
            <label className="mb-2 block text-xs font-medium text-gray-600 sm:text-sm">
              Department
            </label>

            <select
              value={selectedDepartment}
              onChange={(e) =>
                setSelectedDepartment(e.target.value)
              }
              className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">
                All Departments
              </option>

              {departments.map((department) => (
                <option
                  key={department}
                  value={department}
                >
                  {department}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS */}
          <div className="min-w-0">
            <label className="mb-2 block text-xs font-medium text-gray-600 sm:text-sm">
              Status
            </label>

            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value)
              }
              className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex justify-end sm:mt-4">
          <button
            onClick={resetFilters}
            className="px-2 py-2 text-sm font-medium text-gray-600 transition hover:text-blue-600"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* ======================================================
          STATISTICS
      ====================================================== */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">

        {/* TOTAL */}
        <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-500 sm:text-sm">
                Total Records
              </p>

              <h3 className="mt-1 text-2xl font-bold text-gray-800 sm:mt-2 sm:text-3xl">
                {reportStats.total}
              </h3>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 sm:h-12 sm:w-12">
              <FiBarChart2
                className="text-blue-600"
                size={20}
              />
            </div>
          </div>
        </div>

        {/* PRESENT */}
        <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-500 sm:text-sm">
                Present
              </p>

              <h3 className="mt-1 text-2xl font-bold text-green-600 sm:mt-2 sm:text-3xl">
                {reportStats.present}
              </h3>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 sm:h-12 sm:w-12">
              <FiCheckCircle
                className="text-green-600"
                size={20}
              />
            </div>
          </div>
        </div>

        {/* ABSENT */}
        <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-500 sm:text-sm">
                Absent
              </p>

              <h3 className="mt-1 text-2xl font-bold text-red-600 sm:mt-2 sm:text-3xl">
                {reportStats.absent}
              </h3>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 sm:h-12 sm:w-12">
              <FiXCircle
                className="text-red-600"
                size={20}
              />
            </div>
          </div>
        </div>

        {/* PERCENTAGE */}
        <div className="min-w-0 rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs text-gray-500 sm:text-sm">
                Attendance Rate
              </p>

              <h3 className="mt-1 text-2xl font-bold text-purple-600 sm:mt-2 sm:text-3xl">
                {reportStats.percentage}%
              </h3>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 sm:h-12 sm:w-12">
              <FiUsers
                className="text-purple-600"
                size={20}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          REPORT TABLE
      ====================================================== */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">

        <div className="flex flex-col gap-1 border-b border-gray-100 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-gray-800 sm:text-lg">
            Attendance Report
          </h2>

          <p className="text-xs text-gray-500 sm:text-sm">
            {filteredAttendance.length} record
            {filteredAttendance.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500 sm:py-16">
            Loading report...
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="px-4 py-12 text-center sm:py-16">
            <FiBarChart2
              className="mx-auto text-gray-300"
              size={42}
            />

            <p className="mt-3 text-sm text-gray-500">
              No attendance records found
            </p>

            <button
              onClick={resetFilters}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[850px]">

              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-5 sm:py-4 sm:text-sm">
                    Student
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-5 sm:py-4 sm:text-sm">
                    Roll Number
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-5 sm:py-4 sm:text-sm">
                    Department
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-5 sm:py-4 sm:text-sm">
                    Date
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-5 sm:py-4 sm:text-sm">
                    Time
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-5 sm:py-4 sm:text-sm">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-5 sm:py-4 sm:text-sm">
                    Method
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAttendance.map((record, index) => {
                  const student = record.student || {};

                  return (
                    <tr
                      key={
                        record._id ||
                        `${getStudentId(
                          record.student
                        )}-${record.date}-${index}`
                      }
                      className="border-b border-gray-100 transition hover:bg-gray-50"
                    >
                      {/* STUDENT */}
                      <td className="px-4 py-3 sm:px-5 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 sm:h-9 sm:w-9">
                            {student.name
                              ? student.name
                                  .charAt(0)
                                  .toUpperCase()
                              : "?"}
                          </div>

                          <span className="whitespace-nowrap text-sm font-medium text-gray-800">
                            {student.name || "Unknown"}
                          </span>
                        </div>
                      </td>

                      {/* ROLL NUMBER */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:px-5 sm:py-4">
                        {student.rollNumber || "-"}
                      </td>

                      {/* DEPARTMENT */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:px-5 sm:py-4">
                        {student.department || "-"}
                      </td>

                      {/* DATE */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:px-5 sm:py-4">
                        {formatDate(record.date)}
                      </td>

                      {/* TIME */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:px-5 sm:py-4">
                        {formatTime(record.date)}
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3 sm:px-5 sm:py-4">
                        {record.status === "Present" ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 sm:px-3">
                            <FiCheckCircle size={13} />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 sm:px-3">
                            <FiXCircle size={13} />
                            Absent
                          </span>
                        )}
                      </td>

                      {/* METHOD */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:px-5 sm:py-4">
                        {record.markedBy || "Face Recognition"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;