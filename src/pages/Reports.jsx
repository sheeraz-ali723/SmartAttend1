import { useEffect, useMemo, useState } from "react";
import Sidebar from "../Components/Sidebar";
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

        const [studentsRes, attendanceRes] = await Promise.all([
          fetch("http://localhost:5000/api/students"),
          fetch("http://localhost:5000/api/attendance"),
        ]);

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

      const studentName =
        typeof student === "object"
          ? student.name || ""
          : "";

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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">

          {/* ======================================================
              HEADER
          ====================================================== */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Reports
              </h1>

              <p className="text-gray-500 mt-1">
                Generate and analyze attendance reports
              </p>
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
            >
              <FiDownload size={18} />
              Export CSV
            </button>
          </div>

          {/* ======================================================
              FILTERS
          ====================================================== */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <FiFilter className="text-blue-600" size={20} />

              <h2 className="text-lg font-semibold text-gray-800">
                Report Filters
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* DATE */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Date
                </label>

                <div className="relative">
                  <FiCalendar
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) =>
                      setSelectedDate(e.target.value)
                    }
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* STUDENT */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Student
                </label>

                <select
                  value={selectedStudent}
                  onChange={(e) =>
                    setSelectedStudent(e.target.value)
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Department
                </label>

                <select
                  value={selectedDepartment}
                  onChange={(e) =>
                    setSelectedDepartment(e.target.value)
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Status
                </label>

                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value)
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* ======================================================
              STATISTICS
          ====================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">

            {/* TOTAL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Total Records
                  </p>

                  <h3 className="text-3xl font-bold text-gray-800 mt-2">
                    {reportStats.total}
                  </h3>
                </div>

                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FiBarChart2
                    className="text-blue-600"
                    size={23}
                  />
                </div>
              </div>
            </div>

            {/* PRESENT */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Present
                  </p>

                  <h3 className="text-3xl font-bold text-green-600 mt-2">
                    {reportStats.present}
                  </h3>
                </div>

                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                  <FiCheckCircle
                    className="text-green-600"
                    size={23}
                  />
                </div>
              </div>
            </div>

            {/* ABSENT */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Absent
                  </p>

                  <h3 className="text-3xl font-bold text-red-600 mt-2">
                    {reportStats.absent}
                  </h3>
                </div>

                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                  <FiXCircle
                    className="text-red-600"
                    size={23}
                  />
                </div>
              </div>
            </div>

            {/* PERCENTAGE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Attendance Rate
                  </p>

                  <h3 className="text-3xl font-bold text-purple-600 mt-2">
                    {reportStats.percentage}%
                  </h3>
                </div>

                <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                  <FiUsers
                    className="text-purple-600"
                    size={23}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================
              REPORT TABLE
          ====================================================== */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Attendance Report
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {filteredAttendance.length} record
                  {filteredAttendance.length !== 1
                    ? "s"
                    : ""}{" "}
                  found
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-gray-500">
                Loading report...
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="py-16 text-center">
                <FiBarChart2
                  className="mx-auto text-gray-300"
                  size={45}
                />

                <p className="text-gray-500 mt-3">
                  No attendance records found
                </p>

                <button
                  onClick={resetFilters}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">
                        Student
                      </th>

                      <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">
                        Roll Number
                      </th>

                      <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">
                        Department
                      </th>

                      <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">
                        Date
                      </th>

                      <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">
                        Time
                      </th>

                      <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">
                        Status
                      </th>

                      <th className="text-left px-5 py-4 text-sm font-semibold text-gray-600">
                        Method
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAttendance.map(
                      (record, index) => {
                        const student =
                          record.student || {};

                        return (
                          <tr
                            key={
                              record._id ||
                              `${getStudentId(
                                record.student
                              )}-${record.date}-${index}`
                            }
                            className="border-b border-gray-100 hover:bg-gray-50 transition"
                          >
                            {/* STUDENT */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                  {student.name
                                    ? student.name
                                        .charAt(0)
                                        .toUpperCase()
                                    : "?"}
                                </div>

                                <span className="font-medium text-gray-800">
                                  {student.name ||
                                    "Unknown"}
                                </span>
                              </div>
                            </td>

                            {/* ROLL NUMBER */}
                            <td className="px-5 py-4 text-gray-600">
                              {student.rollNumber ||
                                "-"}
                            </td>

                            {/* DEPARTMENT */}
                            <td className="px-5 py-4 text-gray-600">
                              {student.department ||
                                "-"}
                            </td>

                            {/* DATE */}
                            <td className="px-5 py-4 text-gray-600">
                              {formatDate(record.date)}
                            </td>

                            {/* TIME */}
                            <td className="px-5 py-4 text-gray-600">
                              {formatTime(record.date)}
                            </td>

                            {/* STATUS */}
                            <td className="px-5 py-4">
                              {record.status ===
                              "Present" ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                  <FiCheckCircle
                                    size={14}
                                  />
                                  Present
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                  <FiXCircle
                                    size={14}
                                  />
                                  Absent
                                </span>
                              )}
                            </td>

                            {/* METHOD */}
                            <td className="px-5 py-4 text-gray-600">
                              {record.markedBy ||
                                "Face Recognition"}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;