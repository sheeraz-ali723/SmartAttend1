import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCamera,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiUsers,
  FiSearch,
  FiRefreshCw,
} from "react-icons/fi";

import {
  getFaceDescriptor,
  loadFaceModels,
} from "../utils/faceRecognition";

const API_URL = "http://localhost:5000";

const initialForm = {
  name: "",
  rollNumber: "",
  email: "",
  department: "",
  className: "",
};

const Students = () => {
  // ======================================================
  // STUDENTS
  // ======================================================

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  // ======================================================
  // ATTENDANCE
  // ======================================================

  const [todayAttendance, setTodayAttendance] =
    useState([]);

  const [markingAttendance, setMarkingAttendance] =
    useState(null);

  // ======================================================
  // LOADING
  // ======================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registeringFace, setRegisteringFace] =
    useState(null);

  // ======================================================
  // SEARCH / FILTER
  // ======================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] =
    useState("All");
  const [selectedDepartment, setSelectedDepartment] =
    useState("All");

  // ======================================================
  // MODAL
  // ======================================================

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] =
    useState(null);

  const [formData, setFormData] =
    useState(initialForm);

  // ======================================================
  // MESSAGES
  // ======================================================

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ======================================================
  // FACE CAMERA
  // ======================================================

  const faceVideoRef = useRef(null);
  const faceStreamRef = useRef(null);

  // ======================================================
  // SHOW SUCCESS
  // ======================================================

  const showSuccess = (message) => {
    setSuccess(message);
    setError("");

    setTimeout(() => {
      setSuccess("");
    }, 3500);
  };

  // ======================================================
  // FETCH STUDENTS
  // ======================================================

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/students`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch students."
        );
      }

      const studentList = Array.isArray(data)
        ? data
        : data.students || [];

      setStudents(studentList);
    } catch (error) {
      console.error(
        "Fetch students error:",
        error
      );

      setError(
        error.message ||
          "Unable to load students."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // FETCH CLASSES
  // ======================================================

  const fetchClasses = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/classes`
      );

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      const classList = Array.isArray(data)
        ? data
        : data.classes || [];

      setClasses(classList);
    } catch (error) {
      console.error(
        "Fetch classes error:",
        error
      );
    }
  };

  // ======================================================
  // FETCH TODAY ATTENDANCE
  // ======================================================

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/attendance/today`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch today's attendance."
        );
      }

      setTodayAttendance(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "Today's attendance error:",
        error
      );
    }
  };

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetchTodayAttendance();
  }, []);

  // ======================================================
  // CLEANUP CAMERA
  // ======================================================

  useEffect(() => {
    return () => {
      stopFaceCamera();
    };
  }, []);

  // ======================================================
  // FORM CHANGE
  // ======================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ======================================================
  // OPEN ADD MODAL
  // ======================================================

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData(initialForm);

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  // ======================================================
  // OPEN EDIT MODAL
  // ======================================================

  const openEditModal = (student) => {
    setEditingStudent(student);

    setFormData({
      name: student.name || "",
      rollNumber:
        student.rollNumber || "",
      email:
        student.email || "",
      department:
        student.department || "",
      className:
        student.className || "",
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  // ======================================================
  // CLOSE MODAL
  // ======================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingStudent(null);
    setFormData(initialForm);
    setError("");
  };

  // ======================================================
  // SAVE STUDENT
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError(
        "Student name is required."
      );
      return;
    }

    if (!formData.rollNumber.trim()) {
      setError(
        "Roll number is required."
      );
      return;
    }

    if (!formData.email.trim()) {
      setError(
        "Email is required."
      );
      return;
    }

    if (!formData.department.trim()) {
      setError(
        "Department is required."
      );
      return;
    }

    if (!formData.className.trim()) {
      setError(
        "Class is required."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const url = editingStudent
        ? `${API_URL}/api/students/${editingStudent._id}`
        : `${API_URL}/api/students`;

      const method = editingStudent
        ? "PUT"
        : "POST";

      const response = await fetch(
        url,
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            formData
          ),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save student."
        );
      }

      showSuccess(
        editingStudent
          ? "Student updated successfully."
          : "Student added successfully."
      );

      setShowModal(false);
      setEditingStudent(null);
      setFormData(initialForm);

      await fetchStudents();
    } catch (error) {
      console.error(
        "Save student error:",
        error
      );

      setError(
        error.message ||
          "Failed to save student."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // DELETE STUDENT
  // ======================================================

  const deleteStudent = async (
    student
  ) => {
    if (!student?._id) {
      alert(
        "Student ID is missing."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${student.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/students/${student._id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete student."
        );
      }

      showSuccess(
        `${student.name} deleted successfully.`
      );

      await fetchStudents();
      await fetchTodayAttendance();
    } catch (error) {
      console.error(
        "Delete student error:",
        error
      );

      alert(
        error.message ||
          "Failed to delete student."
      );
    }
  };

  // ======================================================
  // GET CURRENT ATTENDANCE
  // ======================================================

  const getStudentAttendance =
    (studentId) => {
      return todayAttendance.find(
        (record) =>
          record.student?._id ===
            studentId ||
          record.student ===
            studentId
      );
    };

  // ======================================================
  // TOGGLE ATTENDANCE
  // ======================================================

  const toggleAttendance = async (
    student
  ) => {
    if (!student?._id) {
      alert(
        "Student ID is missing."
      );
      return;
    }

    const existing =
      getStudentAttendance(
        student._id
      );

    const currentStatus =
      existing?.status || null;

    const newStatus =
      currentStatus === "Present"
        ? "Absent"
        : "Present";

    const confirmed =
      window.confirm(
        `Change "${student.name}" attendance to ${newStatus}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setMarkingAttendance(
        student._id
      );

      const response =
        await fetch(
          `${API_URL}/api/attendance/mark-${newStatus.toLowerCase()}`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              studentId:
                student._id,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "Toggle attendance response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to mark student ${newStatus}.`
        );
      }

      showSuccess(
        data.message ||
          `${student.name} marked ${newStatus}.`
      );

      await fetchTodayAttendance();
    } catch (error) {
      console.error(
        "Toggle attendance error:",
        error
      );

      alert(
        error.message ||
          "Failed to update attendance."
      );
    } finally {
      setMarkingAttendance(null);
    }
  };

  // ======================================================
  // START FACE CAMERA
  // ======================================================

  const startFaceCamera = async () => {
    try {
      await loadFaceModels();

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode:
                "user",

              width: {
                ideal: 640,
              },

              height: {
                ideal: 480,
              },
            },

            audio: false,
          }
        );

      faceStreamRef.current =
        stream;

      if (
        faceVideoRef.current
      ) {
        faceVideoRef.current.srcObject =
          stream;

        await faceVideoRef.current.play();
      }
    } catch (error) {
      console.error(
        "Face camera error:",
        error
      );

      throw new Error(
        "Unable to access the camera."
      );
    }
  };

  // ======================================================
  // STOP FACE CAMERA
  // ======================================================

  const stopFaceCamera = () => {
    if (faceStreamRef.current) {
      faceStreamRef.current
        .getTracks()
        .forEach((track) =>
          track.stop()
        );

      faceStreamRef.current =
        null;
    }

    if (
      faceVideoRef.current
    ) {
      faceVideoRef.current.srcObject =
        null;
    }
  };

  // ======================================================
  // REGISTER FACE
  // ======================================================

  const registerFace = async (
    student
  ) => {
    if (!student?._id) {
      alert(
        "Student ID is missing."
      );
      return;
    }

    try {
      setRegisteringFace(
        student._id
      );

      await startFaceCamera();

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            1000
          )
      );

      const descriptor =
        await getFaceDescriptor(
          faceVideoRef.current
        );

      if (
        !descriptor ||
        descriptor.length !== 128
      ) {
        throw new Error(
          "Invalid face descriptor."
        );
      }

      const confirmed =
        window.confirm(
          `Use this face for "${student.name}"?`
        );

      if (!confirmed) {
        stopFaceCamera();
        return;
      }

      const response =
        await fetch(
          `${API_URL}/api/students/${student._id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              faceId:
                JSON.stringify(
                  Array.from(
                    descriptor
                  )
                ),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to register face."
        );
      }

      stopFaceCamera();

      showSuccess(
        `${student.name}'s face registered successfully.`
      );

      await fetchStudents();
    } catch (error) {
      console.error(
        "Register face error:",
        error
      );

      stopFaceCamera();

      alert(
        error.message ||
          "Failed to register face."
      );
    } finally {
      setRegisteringFace(null);
    }
  };

  // ======================================================
  // CLASS OPTIONS
  // ======================================================

  const classOptions =
    useMemo(() => {
      const studentClasses =
        students
          .map(
            (student) =>
              student.className
          )
          .filter(Boolean);

      const apiClasses =
        classes
          .map((item) =>
            typeof item ===
            "string"
              ? item
              : item.name
          )
          .filter(Boolean);

      return [
        "All",
        ...Array.from(
          new Set([
            ...apiClasses,
            ...studentClasses,
          ])
        ),
      ];
    }, [
      classes,
      students,
    ]);

  // ======================================================
  // DEPARTMENT OPTIONS
  // ======================================================

  const departmentOptions =
    useMemo(() => {
      return [
        "All",
        ...Array.from(
          new Set(
            students
              .map(
                (student) =>
                  student.department
              )
              .filter(Boolean)
          )
        ),
      ];
    }, [students]);

  // ======================================================
  // FILTER STUDENTS
  // ======================================================

  const filteredStudents =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return students.filter(
        (student) => {
          const matchesSearch =
            !search ||
            student.name
              ?.toLowerCase()
              .includes(search) ||
            student.rollNumber
              ?.toLowerCase()
              .includes(search) ||
            student.email
              ?.toLowerCase()
              .includes(search) ||
            student.department
              ?.toLowerCase()
              .includes(search) ||
            student.className
              ?.toLowerCase()
              .includes(search);

          const matchesClass =
            selectedClass ===
              "All" ||
            student.className ===
              selectedClass;

          const matchesDepartment =
            selectedDepartment ===
              "All" ||
            student.department ===
              selectedDepartment;

          return (
            matchesSearch &&
            matchesClass &&
            matchesDepartment
          );
        }
      );
    }, [
      students,
      searchTerm,
      selectedClass,
      selectedDepartment,
    ]);

  // ======================================================
  // STATISTICS
  // ======================================================

  const totalStudents =
    students.length;

  const registeredFaces =
    students.filter(
      (student) =>
        Boolean(student.faceId)
    ).length;

  const withoutFaces =
    totalStudents -
    registeredFaces;

  const presentToday =
    todayAttendance.filter(
      (record) =>
        record.status ===
        "Present"
    ).length;

  const absentToday =
    todayAttendance.filter(
      (record) =>
        record.status ===
        "Absent"
    ).length;

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-7xl">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Students
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage students and today's attendance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() => {
                fetchStudents();
                fetchClasses();
                fetchTodayAttendance();
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw
                size={17}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={
                openAddModal
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <FiPlus size={18} />

              Add Student
            </button>

          </div>

        </div>

        {/* ==================================================
            MESSAGES
        ================================================== */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        {/* ==================================================
            STATS
        ================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Total Students
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {totalStudents}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FiUsers size={23} />
              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Present Today
                </p>

                <p className="mt-2 text-3xl font-bold text-green-600">
                  {presentToday}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <FiCheckCircle
                  size={23}
                />
              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Absent Today
                </p>

                <p className="mt-2 text-3xl font-bold text-red-600">
                  {absentToday}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <FiXCircle
                  size={23}
                />
              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Registered Faces
                </p>

                <p className="mt-2 text-3xl font-bold text-purple-600">
                  {registeredFaces}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <FiCamera
                  size={23}
                />
              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm text-gray-500">
                  Without Face
                </p>

                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {withoutFaces}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <FiXCircle
                  size={23}
                />
              </div>

            </div>

          </div>

        </div>

        {/* ==================================================
            FILTERS
        ================================================== */}

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px_220px]">

            {/* SEARCH */}

            <div className="relative">

              <FiSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search name, roll number, email..."
                className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* CLASS */}

            <select
              value={selectedClass}
              onChange={(event) =>
                setSelectedClass(
                  event.target.value
                )
              }
              className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {classOptions.map(
                (className) => (
                  <option
                    key={className}
                    value={className}
                  >
                    {className ===
                    "All"
                      ? "All Classes"
                      : className}
                  </option>
                )
              )}
            </select>

            {/* DEPARTMENT */}

            <select
              value={
                selectedDepartment
              }
              onChange={(event) =>
                setSelectedDepartment(
                  event.target.value
                )
              }
              className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {departmentOptions.map(
                (department) => (
                  <option
                    key={department}
                    value={department}
                  >
                    {department ===
                    "All"
                      ? "All Departments"
                      : department}
                  </option>
                )
              )}
            </select>

          </div>

          <div className="mt-4 text-sm text-gray-500">

            Showing{" "}
            <span className="font-semibold text-gray-800">
              {
                filteredStudents.length
              }
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-800">
              {students.length}
            </span>{" "}
            students

          </div>

        </div>

        {/* ==================================================
            STUDENT TABLE
        ================================================== */}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">

              <div className="text-center">

                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                <p className="mt-4 text-sm text-gray-500">
                  Loading students...
                </p>

              </div>

            </div>
          ) : filteredStudents.length ===
            0 ? (
            <div className="flex min-h-[300px] items-center justify-center">

              <div className="text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <FiUsers size={28} />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-gray-800">
                  No students found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Try changing your search or filters.
                </p>

              </div>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1250px]">

                <thead className="border-b border-gray-200 bg-gray-50">

                  <tr>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      #
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Student
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Roll Number
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Email
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Department
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Class
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Face
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Attendance
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredStudents.map(
                    (
                      student,
                      index
                    ) => {

                      const attendanceRecord =
                        getStudentAttendance(
                          student._id
                        );

                      const currentStatus =
                        attendanceRecord?.status ||
                        null;

                      const isUpdating =
                        markingAttendance ===
                        student._id;

                      return (
                        <tr
                          key={
                            student._id
                          }
                          className="transition hover:bg-gray-50"
                        >

                          {/* NUMBER */}

                          <td className="px-5 py-4 text-sm text-gray-500">
                            {index + 1}
                          </td>

                          {/* STUDENT */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                                {student.name
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                  "S"}
                              </div>

                              <div className="min-w-0">

                                <p className="truncate text-sm font-semibold text-gray-900">
                                  {
                                    student.name
                                  }
                                </p>

                                <p className="text-xs text-gray-400">
                                  Student
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* ROLL NUMBER */}

                          <td className="px-5 py-4 text-sm text-gray-600">
                            {
                              student.rollNumber
                            }
                          </td>

                          {/* EMAIL */}

                          <td className="px-5 py-4 text-sm text-gray-600">
                            {
                              student.email
                            }
                          </td>

                          {/* DEPARTMENT */}

                          <td className="px-5 py-4 text-sm text-gray-600">
                            {
                              student.department
                            }
                          </td>

                          {/* CLASS */}

                          <td className="px-5 py-4">

                            <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">
                              {
                                student.className ||
                                "General"
                              }
                            </span>

                          </td>

                          {/* FACE */}

                          <td className="px-5 py-4">

                            {student.faceId ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
                                <FiCheckCircle
                                  size={13}
                                />
                                Registered
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                                <FiXCircle
                                  size={13}
                                />
                                Not Registered
                              </span>
                            )}

                          </td>

                          {/* ATTENDANCE */}

                          <td className="px-5 py-4">

                            <button
                              type="button"
                              onClick={() =>
                                toggleAttendance(
                                  student
                                )
                              }
                              disabled={
                                isUpdating
                              }
                              className={`inline-flex min-w-[125px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                currentStatus ===
                                "Present"
                                  ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                                  : "bg-green-50 text-green-600 hover:bg-green-100"
                              }`}
                            >

                              {isUpdating ? (
                                <>
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  Updating...
                                </>
                              ) : currentStatus ===
                                "Present" ? (
                                <>
                                  <FiXCircle
                                    size={14}
                                  />
                                  Mark Absent
                                </>
                              ) : (
                                <>
                                  <FiCheckCircle
                                    size={14}
                                  />
                                  Mark Present
                                </>
                              )}

                            </button>

                            {currentStatus && (
                              <p
                                className={`mt-1 text-[11px] ${
                                  currentStatus ===
                                  "Present"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                Current:{" "}
                                {
                                  currentStatus
                                }
                              </p>
                            )}

                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-4">

                            <div className="flex min-w-[360px] flex-wrap gap-2">

                              {/* EDIT */}

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    student
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                              >
                                <FiEdit2
                                  size={14}
                                />
                                Edit
                              </button>

                              {/* DELETE */}

                              <button
                                type="button"
                                onClick={() =>
                                  deleteStudent(
                                    student
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                              >
                                <FiTrash2
                                  size={14}
                                />
                                Delete
                              </button>

                              {/* REGISTER FACE */}

                              <button
                                type="button"
                                onClick={() =>
                                  registerFace(
                                    student
                                  )
                                }
                                disabled={
                                  registeringFace ===
                                  student._id
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-600 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FiCamera
                                  size={14}
                                />

                                {registeringFace ===
                                student._id
                                  ? "Registering..."
                                  : student.faceId
                                  ? "Re-register Face"
                                  : "Register Face"}
                              </button>

                            </div>

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

      {/* ====================================================
          ADD / EDIT MODAL
      ==================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

              <div>

                <h2 className="text-xl font-bold text-gray-900">
                  {editingStudent
                    ? "Edit Student"
                    : "Add Student"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingStudent
                    ? "Update student information."
                    : "Add a new student to SmartAttend."}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
              className="p-6"
            >

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* NAME */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Student Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      formData.name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter student name"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* ROLL */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Roll Number
                  </label>

                  <input
                    type="text"
                    name="rollNumber"
                    value={
                      formData.rollNumber
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter roll number"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* EMAIL */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="student@example.com"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* DEPARTMENT */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Department
                  </label>

                  <input
                    type="text"
                    name="department"
                    value={
                      formData.department
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Computer Science"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                {/* CLASS */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Class
                  </label>

                  <select
                    name="className"
                    value={
                      formData.className
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >

                    <option value="">
                      Select Class
                    </option>

                    {classOptions
                      .filter(
                        (item) =>
                          item !==
                          "All"
                      )
                      .map(
                        (
                          className
                        ) => (
                          <option
                            key={
                              className
                            }
                            value={
                              className
                            }
                          >
                            {
                              className
                            }
                          </option>
                        )
                      )}

                  </select>

                </div>

              </div>

              {error && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingStudent
                    ? "Update Student"
                    : "Add Student"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ====================================================
          FACE REGISTRATION MODAL
      ==================================================== */}

      {registeringFace && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">

          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">

            <div className="mb-4 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold text-gray-900">
                  Register Face
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Look directly at the camera.
                </p>

              </div>

              <button
                type="button"
                onClick={() => {
                  stopFaceCamera();

                  setRegisteringFace(
                    null
                  );
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>

            </div>

            <div className="overflow-hidden rounded-xl bg-black">

              <video
                ref={faceVideoRef}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />

            </div>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Position the student's face clearly in the camera before registering.
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Students;