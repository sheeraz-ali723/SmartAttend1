import { useEffect, useState } from "react";
import Sidebar from "../Components/Sidebar";

const AttendanceHistory = () => {
  const [attendance, setAttendance] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);

  // ======================================================
  // FETCH ALL ATTENDANCE
  // ======================================================
  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://railway-up-production-d063.up.railway.app/api/attendance"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch attendance"
        );
      }

      setAttendance(data);
    } catch (error) {
      console.error("Attendance history error:", error);
      alert("Unable to load attendance history");
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // LOAD ATTENDANCE
  // ======================================================
 useEffect(() => {
  fetchAttendance();

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      fetchAttendance();
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
  // FORMAT TIME
  // ======================================================
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-PK", {
      timeZone: "Asia/Karachi",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // ======================================================
  // FILTER ATTENDANCE
  // ======================================================
  const filteredAttendance = attendance.filter((record) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !search ||
      record.student?.name?.toLowerCase().includes(search) ||
      record.student?.rollNumber?.toLowerCase().includes(search) ||
      record.student?.department?.toLowerCase().includes(search);

    const recordDate = new Date(record.date).toLocaleDateString(
      "en-CA",
      {
        timeZone: "Asia/Karachi",
      }
    );

    const matchesDate =
      selectedDate === "" || recordDate === selectedDate;

    const matchesStatus =
      selectedStatus === "All" ||
      record.status === selectedStatus;

    return matchesSearch && matchesDate && matchesStatus;
  });

  // ======================================================
  // STUDENT ATTENDANCE SUMMARY
  // ======================================================
  const studentSummary = {};

  filteredAttendance.forEach((record) => {
    const student = record.student;

    // Ignore records whose student no longer exists
    if (!student) return;

    const studentId = student._id;

    if (!studentSummary[studentId]) {
      studentSummary[studentId] = {
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department,
        present: 0,
        absent: 0,
        total: 0,
      };
    }

    studentSummary[studentId].total += 1;

    if (record.status === "Present") {
      studentSummary[studentId].present += 1;
    }

    if (record.status === "Absent") {
      studentSummary[studentId].absent += 1;
    }
  });

  const studentAttendanceSummary = Object.values(
    studentSummary
  ).map((student) => ({
    ...student,
    percentage:
      student.total > 0
        ? Math.round(
            (student.present / student.total) * 100
          )
        : 0,
  }));

  // ======================================================
  // RETURN
  // ======================================================
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">

          {/* ==================================================
              HEADER
          ================================================== */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Attendance History
            </h1>

            <p className="text-gray-500 mt-1">
              View all student attendance records
            </p>
          </div>

          {/* ==================================================
              FILTERS
          ================================================== */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Search */}
              <input
                type="text"
                placeholder="Search by name, roll number or department..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Date */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>

            </div>
          </div>

          {/* ==================================================
              STUDENT ATTENDANCE SUMMARY
          ================================================== */}
          <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">

            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">
                Student Attendance Summary
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Attendance percentage based on filtered
                attendance records
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">

                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Student
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Roll Number
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Department
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Present
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Absent
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Total Records
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Attendance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {studentAttendanceSummary.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-8 text-gray-500"
                      >
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    studentAttendanceSummary.map((student) => (
                      <tr
                        key={student.rollNumber}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {student.name}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {student.rollNumber}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {student.department}
                        </td>

                        <td className="px-6 py-4 text-green-600 font-medium">
                          {student.present}
                        </td>

                        <td className="px-6 py-4 text-red-600 font-medium">
                          {student.absent}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {student.total}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              student.percentage >= 75
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {student.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

              </table>
            </div>
          </div>

          {/* ==================================================
              ATTENDANCE RECORDS
          ================================================== */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">
                Attendance Records
              </h2>

              <span className="text-sm text-gray-500">
                {filteredAttendance.length} records
              </span>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="text-center py-10 text-gray-500">
                Loading attendance...
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No attendance records found
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full">

                  {/* Table Header */}
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                        Student
                      </th>

                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                        Roll Number
                      </th>

                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                        Department
                      </th>

                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                        Date
                      </th>

                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                        Time
                      </th>

                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                        Status
                      </th>

                      <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                        Method
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {filteredAttendance.map((record) => (
                      <tr
                        key={record._id}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >

                        {/* Student */}
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">
                            {record.student?.name || "Unknown"}
                          </p>

                          <p className="text-sm text-gray-400">
                            {record.student?.email || "-"}
                          </p>
                        </td>

                        {/* Roll Number */}
                        <td className="px-6 py-4 text-gray-600">
                          {record.student?.rollNumber || "-"}
                        </td>

                        {/* Department */}
                        <td className="px-6 py-4 text-gray-600">
                          {record.student?.department || "-"}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(record.date)}
                        </td>

                        {/* Time */}
                        <td className="px-6 py-4 text-gray-600">
  {formatTime(record.date)}
</td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              record.status === "Present"
                                ? "bg-green-100 text-green-700"
                                : record.status === "Absent"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>

                        {/* Method */}
                        <td className="px-6 py-4 text-gray-600">
                          {record.markedBy || "-"}
                        </td>

                      </tr>
                    ))}
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

export default AttendanceHistory;