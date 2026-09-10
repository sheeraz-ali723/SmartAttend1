import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCamera,
  FiVideo,
  FiVideoOff,
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

const API_URL = "http://railway-up-production-d063.up.railway.app";

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

  const [todayAttendance, setTodayAttendance] = useState([]);
  const [markingAttendance, setMarkingAttendance] =
    useState(null);

  // ======================================================
  // LOADING
  // ======================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ======================================================
  // SEARCH / FILTER
  // ======================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedDepartment, setSelectedDepartment] =
    useState("All");

  // ======================================================
  // MODAL
  // ======================================================

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const [formData, setFormData] = useState(initialForm);

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

  const [faceCameraActive, setFaceCameraActive] =
    useState(false);

  const [faceCaptured, setFaceCaptured] = useState(false);

  const [faceDescriptor, setFaceDescriptor] = useState(null);

  const [faceLoading, setFaceLoading] = useState(false);

  // ======================================================
  // SUCCESS MESSAGE
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
          data.message || "Failed to fetch students."
        );
      }

      const studentList = Array.isArray(data)
        ? data
        : data.students || [];

      setStudents(studentList);
    } catch (error) {
      console.error("Fetch students error:", error);

      setError(
        error.message || "Unable to load students."
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
      console.error("Fetch classes error:", error);
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
        Array.isArray(data) ? data : []
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
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // ======================================================
  // OPEN ADD MODAL
  // ======================================================

  const openAddModal = () => {
    stopFaceCamera();

    setEditingStudent(null);
    setFormData(initialForm);

    setFaceCaptured(false);
    setFaceDescriptor(null);
    setFaceCameraActive(false);
    setFaceLoading(false);

    setError("");
    setSuccess("");

    setShowModal(true);
  };

  // ======================================================
  // OPEN EDIT MODAL
  // ======================================================

  const openEditModal = (student) => {
    stopFaceCamera();

    setEditingStudent(student);

    setFormData({
      name: student.name || "",
      rollNumber: student.rollNumber || "",
      email: student.email || "",
      department: student.department || "",
      className: student.className || "",
    });

    setFaceCaptured(false);
    setFaceDescriptor(null);
    setFaceCameraActive(false);
    setFaceLoading(false);

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

    stopFaceCamera();

    setShowModal(false);
    setEditingStudent(null);
    setFormData(initialForm);

    setFaceCaptured(false);
    setFaceDescriptor(null);
    setFaceCameraActive(false);
    setFaceLoading(false);

    setError("");
  };

  // ======================================================
  // OPEN CAMERA
  // ======================================================

  const openCamera = async () => {
    try {
      setError("");
      setSuccess("");
      setFaceLoading(true);

      // Load face recognition models first
      await loadFaceModels();

      // Stop any previous camera
      if (faceStreamRef.current) {
        faceStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        faceStreamRef.current = null;
      }

      if (!faceVideoRef.current) {
        throw new Error(
          "Camera video is not ready."
        );
      }

      // Request camera permission
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 640,
            },
            height: {
              ideal: 480,
            },
          },
          audio: false,
        });

      faceStreamRef.current = stream;

      const video = faceVideoRef.current;

      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;

      await video.play();

      setFaceCameraActive(true);
    } catch (error) {
      console.error(
        "Open camera error:",
        error
      );

      setFaceCameraActive(false);

      setError(
        error.message ||
          "Unable to open camera. Please allow camera permission."
      );
    } finally {
      setFaceLoading(false);
    }
  };

  // ======================================================
  // STOP CAMERA
  // ======================================================

  const stopFaceCamera = () => {
    if (faceStreamRef.current) {
      faceStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      faceStreamRef.current = null;
    }

    if (faceVideoRef.current) {
      faceVideoRef.current.pause();
      faceVideoRef.current.srcObject = null;
    }

    setFaceCameraActive(false);
  };

  // ======================================================
  // CAPTURE FACE
  // ======================================================

// ======================================================
// CAPTURE FACE
// ======================================================

const captureFace = async () => {
  try {
    setError("");
    setSuccess("");

    if (!faceCameraActive) {
      setError("Please open the camera first.");
      return;
    }

    if (!faceVideoRef.current) {
      setError("Camera video is not ready.");
      return;
    }

    setFaceLoading(true);

    // Give camera a moment to provide a clear frame
    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );

    const descriptor = await getFaceDescriptor(
      faceVideoRef.current
    );

    if (!descriptor || descriptor.length !== 128) {
      throw new Error(
        "No clear face detected. Please look directly at the camera."
      );
    }

    // Save face descriptor
    setFaceDescriptor(Array.from(descriptor));

    // Mark face as captured
    setFaceCaptured(true);

    // Automatically stop camera
    stopFaceCamera();

    setSuccess("Face captured successfully. Camera stopped.");
  } catch (error) {
    console.error("Capture face error:", error);

    setFaceCaptured(false);
    setFaceDescriptor(null);

    setError(
      error.message || "Unable to capture face."
    );
  } finally {
    setFaceLoading(false);
  }
};

  // ======================================================
  // CAPTURE AGAIN
  // ======================================================

  const captureFaceAgain = () => {
    setFaceCaptured(false);
    setFaceDescriptor(null);
    setError("");
    setSuccess("");

    if (!faceCameraActive) {
      openCamera();
    }
  };

  // ======================================================
  // SAVE STUDENT
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

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

    // --------------------------------------------------
    // FACE REQUIRED FOR NEW STUDENT
    // --------------------------------------------------

    if (!editingStudent) {
      if (!faceCaptured) {
        setError(
          "Please capture the student's face before adding the student."
        );
        return;
      }

      if (!faceDescriptor) {
        setError(
          "Face registration is incomplete. Please capture the face again."
        );
        return;
      }
    }

    // --------------------------------------------------
    // SAVE STUDENT
    // --------------------------------------------------

    try {
      setSaving(true);
      setError("");

      const url = editingStudent
        ? `${API_URL}/api/students/${editingStudent._id}`
        : `${API_URL}/api/students`;

      const method = editingStudent
        ? "PUT"
        : "POST";

      /*
        New student:
        Send student information + faceId together.

        Edit student:
        Send normal student information.
      */

      const body = editingStudent
        ? formData
        : {
            ...formData,
            faceId: JSON.stringify(
              faceDescriptor
            ),
          };

      const response = await fetch(
        url,
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
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

      // Stop camera
      stopFaceCamera();

      // Reset face
      setFaceCaptured(false);
      setFaceDescriptor(null);

      // Close modal
      setShowModal(false);
      setEditingStudent(null);
      setFormData(initialForm);

      showSuccess(
        editingStudent
          ? "Student updated successfully."
          : "Student and face registered successfully."
      );

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

  const deleteStudent = async (student) => {
    if (!student?._id) {
      alert("Student ID is missing.");
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
  // GET STUDENT ATTENDANCE
  // ======================================================

  const getStudentAttendance = (
    studentId
  ) => {
    return todayAttendance.find(
      (record) =>
        record.student?._id ===
          studentId ||
        record.student === studentId
    );
  };

  // ======================================================
  // TOGGLE ATTENDANCE
  // ======================================================

  const toggleAttendance = async (
    student
  ) => {
    if (!student?._id) {
      alert("Student ID is missing.");
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
  // CLASS OPTIONS
  // ======================================================

  const classOptions = useMemo(() => {
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
          typeof item === "string"
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
  }, [classes, students]);

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
              onClick={openAddModal}
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

        {error && !showModal && (
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

          {/* TOTAL */}

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

          {/* PRESENT */}

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
                <FiCheckCircle size={23} />
              </div>

            </div>

          </div>

          {/* ABSENT */}

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
                <FiXCircle size={23} />
              </div>

            </div>

          </div>

          {/* REGISTERED FACES */}

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
                <FiCamera size={23} />
              </div>

            </div>

          </div>

          {/* WITHOUT FACE */}

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
                <FiXCircle size={23} />
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
                    {className === "All"
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
                    {department === "All"
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
              {filteredStudents.length}
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
          ) : filteredStudents.length === 0 ? (
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

              <table className="w-full min-w-[1050px]">

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
                      Attendance
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {filteredStudents.map(
                    (student, index) => {

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

                            <div className="flex gap-2">

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

          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

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
                    : "Add student information and register the face."}
                </p>

              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                <FiX size={20} />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
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
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter student name"
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  />

                </div>

                {/* ROLL NUMBER */}

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
                    onChange={handleChange}
                    placeholder="Enter roll number"
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
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
                    onChange={handleChange}
                    placeholder="student@example.com"
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
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
                    onChange={handleChange}
                    placeholder="Computer Science"
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
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
                    onChange={handleChange}
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
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
                        (className) => (
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

              {/* ==================================================
                  FACE RECOGNITION
              ================================================== */}

              {!editingStudent && (
                <div className="mt-6 rounded-xl border border-purple-100 bg-purple-50 p-4">

                  {/* FACE HEADER */}

                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <div className="flex items-center gap-2">

                        <FiCamera
                          size={18}
                          className="text-purple-600"
                        />

                        <h3 className="text-sm font-bold text-gray-900">
                          Face Recognition
                        </h3>

                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        Open the camera, position the student's face, then capture it.
                      </p>

                    </div>

                    {faceCaptured && (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">

                        <FiCheckCircle
                          size={14}
                        />

                        Face Captured

                      </span>
                    )}

                  </div>

                  {/* CAMERA VIEW */}

                  <div className="relative overflow-hidden rounded-xl bg-black">

                    <video
                      ref={faceVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`aspect-video w-full object-cover ${
                        faceCameraActive
                          ? "block"
                          : "hidden"
                      }`}
                    />

                    {!faceCameraActive && (
                      <div className="flex aspect-video items-center justify-center px-4 text-center text-white">

                        <div>

                          <FiCamera
                            size={45}
                            className="mx-auto mb-3 opacity-70"
                          />

                          <p className="text-sm font-medium">
                            Camera is closed
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Click "Open Camera" to start.
                          </p>

                        </div>

                      </div>
                    )}

                    {/* CAMERA STATUS */}

                    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">

                      <span
                        className={`h-2 w-2 rounded-full ${
                          faceCameraActive
                            ? "bg-green-400"
                            : "bg-gray-400"
                        }`}
                      />

                      {faceCameraActive
                        ? "Camera active"
                        : "Camera stopped"}

                    </div>

                  </div>

                  {/* CAMERA BUTTONS */}

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                    {/* OPEN CAMERA */}

                    <button
                      type="button"
                      onClick={openCamera}
                      disabled={
                        faceCameraActive ||
                        faceLoading ||
                        saving
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                      <FiVideo
                        size={18}
                      />

                      {faceLoading
                        ? "Opening Camera..."
                        : "Open Camera"}

                    </button>

                    {/* STOP CAMERA */}

                    <button
                      type="button"
                      onClick={
                        stopFaceCamera
                      }
                      disabled={
                        !faceCameraActive ||
                        faceLoading ||
                        saving
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                      <FiVideoOff
                        size={18}
                      />

                      Stop Camera

                    </button>

                  </div>

                  {/* CAPTURE BUTTON */}

                  <div className="mt-3">

                    <button
                      type="button"
                      onClick={
                        captureFace
                      }
                      disabled={
                        !faceCameraActive ||
                        faceLoading ||
                        faceCaptured ||
                        saving
                      }
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                      <FiCamera
                        size={18}
                      />

                      {faceLoading
                        ? "Recognizing Face..."
                        : faceCaptured
                        ? "Face Captured ✓"
                        : "Capture Face"}

                    </button>

                  </div>

                  {/* CAPTURE AGAIN */}

                  {faceCaptured && (
                    <button
                      type="button"
                      onClick={
                        captureFaceAgain
                      }
                      disabled={
                        faceLoading ||
                        saving
                      }
                      className="mt-3 w-full rounded-lg border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-600 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Capture Face Again
                    </button>
                  )}

                  {/* INSTRUCTIONS */}

                  <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">

                    <strong>
                      Instructions:
                    </strong>{" "}
                    Click Open Camera first. Keep the student's face centered and clearly visible. Look directly at the camera and click Capture Face.

                  </div>

                </div>
              )}

              {/* ==================================================
                  EDIT MODE FACE INFORMATION
              ================================================== */}

              {editingStudent && (
                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <FiCamera
                        size={20}
                      />
                    </div>

                    <div>

                      <h3 className="text-sm font-bold text-gray-900">
                        Face Recognition
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Face registration is completed when the student is added.
                      </p>

                    </div>

                  </div>

                </div>
              )}

              {/* ==================================================
                  ERROR
              ================================================== */}

              {error && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* ==================================================
                  SUCCESS
              ================================================== */}

              {success && (
                <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              {/* ==================================================
                  FORM BUTTONS
              ================================================== */}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    (!editingStudent &&
                      !faceCaptured)
                  }
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

    </div>
  );
};

export default Students;
