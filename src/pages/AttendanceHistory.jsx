import { useEffect, useState } from "react";

const AttendanceHistory = () => {
  const [attendance, setAttendance] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);

  // ======================================================
  // FETCH ATTENDANCE
  // ======================================================
  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("smartAttendToken");

      const response = await fetch(
        "https://projects-cs-production.up.railway.app/api/attendance",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("smartAttendToken");
        localStorage.removeItem("smartAttendAdmin");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch attendance"
        );
      }

      setAttendance(Array.isArray(data) ? data : []);
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
      record.student?.name
        ?.toLowerCase()
        .includes(search) ||
      record.student?.rollNumber
        ?.toLowerCase()
        .includes(search) ||
      record.student?.department
        ?.toLowerCase()
        .includes(search);

    const recordDate = new Date(
      record.date
    ).toLocaleDateString("en-CA", {
      timeZone: "Asia/Karachi",
    });

    const matchesDate =
      !selectedDate || recordDate === selectedDate;

    const matchesStatus =
      selectedStatus === "All" ||
      record.status === selectedStatus;

    return (
      matchesSearch &&
      matchesDate &&
      matchesStatus
    );
  });

  // ======================================================
  // STUDENT ATTENDANCE SUMMARY
  // ======================================================
  const studentSummary = {};

  filteredAttendance.forEach((record) => {
    const student = record.student;

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
    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="mx-auto w-full min-w-0 max-w-7xl">

        {/* HEADER */}
        <div className="mb-5 sm:mb-6">
          <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">
            Attendance History
          </h1>

          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            View all student attendance records
          </p>
        </div>

        {/* FILTERS */}
        <div className="mb-5 w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-white p-3 shadow-sm sm:mb-6 sm:p-4">
          <div className="flex w-full min-w-0 max-w-full flex-col gap-3 md:grid md:grid-cols-3 md:gap-4">

            {/* SEARCH */}
            <div className="w-full min-w-0 max-w-full">
              <input
                type="text"
                placeholder="Search by name, roll number or department..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                className="block box-border h-12 w-full min-w-0 max-w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:px-4"
              />
            </div>

            {/* DATE */}
            <div className="w-full min-w-0 max-w-full">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
                className="block box-border h-12 w-full min-w-0 max-w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:px-4"
              />
            </div>

            {/* STATUS */}
            <div className="w-full min-w-0 max-w-full">
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value)
                }
                className="block box-border h-12 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:px-4"
              >
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

          </div>
        </div>

        {/* STUDENT ATTENDANCE SUMMARY */}
        <div className="mb-5 w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-white shadow-sm sm:mb-6">

          <div className="border-b px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-gray-800 sm:text-base">
              Student Attendance Summary
            </h2>

            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Attendance percentage based on filtered attendance records
            </p>
          </div>

          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[750px]">

              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                    Student
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                    Roll Number
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                    Department
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                    Present
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                    Absent
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                    Total Records
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                    Attendance
                  </th>
                </tr>
              </thead>

              <tbody>
                {studentAttendanceSummary.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="py-8 text-center text-sm text-gray-500"
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
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 sm:px-6 sm:py-4">
                        {student.name}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">
                        {student.rollNumber}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">
                        {student.department}
                      </td>

                      <td className="px-4 py-3 text-sm font-medium text-green-600 sm:px-6 sm:py-4">
                        {student.present}
                      </td>

                      <td className="px-4 py-3 text-sm font-medium text-red-600 sm:px-6 sm:py-4">
                        {student.absent}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">
                        {student.total}
                      </td>

                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm ${
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

        {/* ATTENDANCE RECORDS */}
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-white shadow-sm">

          <div className="flex flex-col gap-1 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-sm font-semibold text-gray-800 sm:text-base">
              Attendance Records
            </h2>

            <span className="text-xs text-gray-500 sm:text-sm">
              {filteredAttendance.length} records
            </span>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading attendance...
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              No attendance records found
            </div>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-[850px]">

                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                      Student
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                      Roll Number
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                      Department
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                      Date
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                      Time
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                      Status
                    </th>

                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-600 sm:px-6 sm:py-4 sm:text-sm">
                      Method
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAttendance.map((record) => (
                    <tr
                      key={record._id}
                      className="border-b last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <p className="whitespace-nowrap text-sm font-medium text-gray-800">
                          {record.student?.name || "Unknown"}
                        </p>

                        <p className="max-w-[180px] truncate text-xs text-gray-400 sm:text-sm">
                          {record.student?.email || "-"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">
                        {record.student?.rollNumber || "-"}
                      </td>

                      <td className="max-w-[180px] px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">
                        <span className="block whitespace-normal">
                          {record.student?.department || "-"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">
                        {formatDate(record.date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">
                        {formatTime(record.date)}
                      </td>

                      <td className="px-4 py-3 sm:px-6 sm:py-4">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm ${
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

                      <td className="max-w-[160px] px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">
                        <span className="block whitespace-normal">
                          {record.markedBy || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default AttendanceHistory;