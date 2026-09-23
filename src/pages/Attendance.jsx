import { useEffect, useRef, useState } from "react";
import {
  getFaceDescriptor,
  findMatchingStudent,
} from "../utils/faceRecognition";
import { getSettings } from "../utils/settings";

const Attendance = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [searchTerm, setSearchTerm] = useState("");

  const [cameraActive, setCameraActive] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [generatingAttendance, setGeneratingAttendance] =
    useState(false);

  const [markingAbsent, setMarkingAbsent] = useState(null);

  // Settings
  const [systemSettings, setSystemSettings] =
    useState(getSettings());

  // ======================================================
  // LOAD SETTINGS
  // ======================================================
  useEffect(() => {
    const updateSettings = () => {
      setSystemSettings(getSettings());
    };

    window.addEventListener(
      "smartAttendSettingsChanged",
      updateSettings
    );

    document.addEventListener(
      "visibilitychange",
      updateSettings
    );

    return () => {
      window.removeEventListener(
        "smartAttendSettingsChanged",
        updateSettings
      );

      document.removeEventListener(
        "visibilitychange",
        updateSettings
      );
    };
  }, []);

  // ======================================================
  // FETCH STUDENTS
  // ======================================================
  const fetchStudents = async () => {
    try {
      const response = await fetch(
        "https://projects-cs-production.up.railway.app/api/students"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }

      const data = await response.json();

      console.log("Students loaded:", data);

      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching students:", error);

      setMessage("Failed to load students.");
    }
  };

  // ======================================================
  // FETCH CLASSES
  // ======================================================
  const fetchClasses = async () => {
    try {
      const response = await fetch(
        "https://projects-cs-production.up.railway.app/api/classes"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }

      const data = await response.json();

      console.log("Classes loaded:", data);

      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching classes:", error);

      setMessage("Failed to load classes.");
    }
  };

  // ======================================================
  // FETCH TODAY ATTENDANCE
  // ======================================================
  const fetchTodayAttendance = async (className = selectedClass) => {
    try {
      let url =
        "https://projects-cs-production.up.railway.app/api/attendance/today";

      if (className && className !== "All Classes") {
        url += `?className=${encodeURIComponent(className)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch attendance");
      }

      const data = await response.json();

      const sortedData = [
        ...(Array.isArray(data) ? data : []),
      ].sort(
        (a, b) =>
          new Date(b.date) - new Date(a.date)
      );

      setAttendanceRecords(sortedData);
    } catch (error) {
      console.error(
        "Error fetching today's attendance:",
        error
      );

      setMessage(
        "Failed to load today's attendance."
      );
    }
  };

  // ======================================================
  // INITIAL LOAD
  // ======================================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      await Promise.all([
        fetchStudents(),
        fetchClasses(),
        fetchTodayAttendance("All Classes"),
      ]);

      setLoading(false);
    };

    loadData();
  }, []);

  // ======================================================
  // CLASS CHANGE
  // ======================================================
  useEffect(() => {
    fetchTodayAttendance(selectedClass);
  }, [selectedClass]);

  // ======================================================
  // FILTER STUDENTS
  // ======================================================
  const filteredStudents = students.filter((student) => {
    const matchesClass =
      selectedClass === "All Classes" ||
      student.className === selectedClass;

    const search = searchTerm
      .trim()
      .toLowerCase();

    const matchesSearch =
      !search ||
      student.name?.toLowerCase().includes(search) ||
      student.rollNumber?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search) ||
      student.department?.toLowerCase().includes(search) ||
      student.className?.toLowerCase().includes(search);

    return matchesClass && matchesSearch;
  });

  // ======================================================
  // START CAMERA
  // ======================================================
  const startCamera = async () => {
    const currentSettings = getSettings();

    if (!currentSettings.faceRecognition) {
      setMessage(
        "Face Recognition is disabled in Settings."
      );
      return;
    }

    try {
      setMessage("");

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }

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

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch (error) {
          console.warn(
            "Video autoplay warning:",
            error
          );
        }
      }

      setCameraActive(true);

      setMessage(
        "Camera started. Position your face clearly."
      );
    } catch (error) {
      console.error("Camera error:", error);

      setMessage(
        "Unable to access camera. Please allow camera permission."
      );
    }
  };

  // ======================================================
  // STOP CAMERA
  // ======================================================
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setRecognizing(false);
  };

  // ======================================================
  // RECOGNIZE FACE
  // ======================================================
  const recognizeFace = async () => {
    if (
      !cameraActive ||
      !videoRef.current
    ) {
      setMessage(
        "Please start the camera first."
      );
      return;
    }

    const currentSettings = getSettings();

    if (!currentSettings.faceRecognition) {
      setMessage(
        "Face Recognition is disabled in Settings."
      );
      return;
    }

    if (!currentSettings.autoAttendance) {
      setMessage(
        "Automatic Attendance is disabled in Settings."
      );
      return;
    }

    if (recognizing) {
      return;
    }

    try {
      setRecognizing(true);
      setMessage("Scanning face...");

      if (
        !Array.isArray(students) ||
        students.length === 0
      ) {
        setMessage(
          "No students are registered in the system."
        );

        setRecognizing(false);
        return;
      }

      const descriptor =
        await getFaceDescriptor(
          videoRef.current
        );

      if (!descriptor) {
        setMessage(
          "No clear face detected. Please position your face clearly in front of the camera."
        );

        setRecognizing(false);
        return;
      }

      console.log(
        "Captured descriptor length:",
        descriptor.length
      );

      const result =
        await findMatchingStudent(
          descriptor,
          students
        );

      console.log(
        "Face matching result:",
        result
      );

      // ==================================================
      // UNKNOWN FACE
      // NEVER SAVE UNKNOWN FACES
      // ==================================================
      if (
        !result ||
        !result.student
      ) {
        console.log(
          "❌ Unknown face - attendance NOT saved"
        );

        setMessage(
          "Unknown student. Attendance was not saved."
        );

        setRecognizing(false);
        return;
      }

      const matchedStudent =
        result.student;

      console.log(
        "✅ Matched student:",
        matchedStudent
      );

      if (!matchedStudent._id) {
        console.error(
          "Matched student has no MongoDB ID:",
          matchedStudent
        );

        setMessage(
          "Student was recognized, but the student ID is missing."
        );

        setRecognizing(false);
        return;
      }

      // ==================================================
      // CLASS FILTER PROTECTION
      // ==================================================
      if (
        selectedClass !== "All Classes" &&
        matchedStudent.className !== selectedClass
      ) {
        setMessage(
          `${matchedStudent.name} belongs to ${matchedStudent.className}, not ${selectedClass}.`
        );

        setRecognizing(false);
        return;
      }

      // ==================================================
      // MARK ATTENDANCE
      // ==================================================
      const response = await fetch(
        "https://projects-cs-production.up.railway.app/api/attendance/mark",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId:
              matchedStudent._id,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "Attendance response:",
        data
      );

      if (!response.ok) {
        setMessage(
          data.message ||
            "Failed to mark attendance."
        );

        setRecognizing(false);
        return;
      }

      // ==================================================
      // ADMIN MANUAL ABSENT
      // ==================================================
      if (data.alreadyAbsent) {
        setMessage(
          data.message ||
            `${matchedStudent.name} was marked Absent by Admin. Attendance remains Absent.`
        );

        await fetchTodayAttendance(
          selectedClass
        );

        setRecognizing(false);
        return;
      }

      // ==================================================
      // ALREADY PRESENT
      // ==================================================
      if (
        data.alreadyPresent ||
        data.alreadyMarked
      ) {
        setMessage(
          `${matchedStudent.name} is already marked Present today.`
        );

        await fetchTodayAttendance(
          selectedClass
        );

        setRecognizing(false);
        return;
      }

      // ==================================================
      // NEW PRESENT ATTENDANCE
      // ==================================================
      setMessage(
        `${matchedStudent.name} marked Present successfully.`
      );

      await fetchTodayAttendance(
        selectedClass
      );

      setRecognizing(false);
    } catch (error) {
      console.error(
        "Face recognition error:",
        error
      );

      setMessage(
        error.message ||
          "Face recognition failed. Please try again."
      );

      setRecognizing(false);
    }
  };

  // ======================================================
  // MARK STUDENT ABSENT
  // ======================================================
  const markStudentAbsent = async (
    studentId
  ) => {
    if (!studentId) {
      setMessage(
        "Student ID is missing."
      );
      return;
    }

    try {
      setMarkingAbsent(studentId);
      setMessage("");

      const response = await fetch(
        "https://projects-cs-production.up.railway.app/api/attendance/mark-absent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "Mark absent response:",
        data
      );

      if (!response.ok) {
        setMessage(
          data.message ||
            "Failed to mark student absent."
        );

        return;
      }

      setMessage(
        data.message ||
          "Student marked Absent by Admin."
      );

      await fetchTodayAttendance(
        selectedClass
      );
    } catch (error) {
      console.error(
        "Mark absent error:",
        error
      );

      setMessage(
        "Failed to mark student absent."
      );
    } finally {
      setMarkingAbsent(null);
    }
  };

  // ======================================================
  // GENERATE TODAY ATTENDANCE
  // ======================================================
  const generateTodayAttendance = async () => {
    const currentSettings = getSettings();

    if (!currentSettings.dailyAttendance) {
      setMessage(
        "Daily Attendance is disabled in Settings."
      );
      return;
    }

    try {
      setGeneratingAttendance(true);
      setMessage("");

      const response = await fetch(
        "https://projects-cs-production.up.railway.app/api/attendance/generate-today",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Failed to generate today's attendance."
        );

        return;
      }

      setMessage(
        data.message ||
          "Today's attendance generated successfully."
      );

      await fetchTodayAttendance(
        selectedClass
      );
    } catch (error) {
      console.error(
        "Generate attendance error:",
        error
      );

      setMessage(
        "Failed to generate today's attendance."
      );
    } finally {
      setGeneratingAttendance(false);
    }
  };

  // ======================================================
  // CLEANUP CAMERA
  // ======================================================
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  // ======================================================
  // FORMAT DATE
  // ======================================================
  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-PK",
      {
        timeZone: "Asia/Karachi",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ======================================================
  // FORMAT TIME
  // ======================================================
  const formatTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleTimeString(
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
  // GET ATTENDANCE RECORD FOR STUDENT
  // ======================================================
  const getStudentAttendance = (studentId) => {
    return attendanceRecords.find(
      (record) =>
        record.student?._id === studentId
    );
  };

  // ======================================================
  // COUNTS
  // ======================================================
  const presentCount =
    filteredStudents.filter((student) => {
      const record =
        getStudentAttendance(student._id);

      return record?.status === "Present";
    }).length;

  const absentCount =
    filteredStudents.filter((student) => {
      const record =
        getStudentAttendance(student._id);

      return record?.status === "Absent";
    }).length;

  const totalStudents =
    filteredStudents.length;

  const attendanceRate =
    totalStudents > 0
      ? Math.min(
          100,
          Math.round(
            (presentCount /
              totalStudents) *
              100
          )
        )
      : 0;

  // ======================================================
  // DISPLAY RECORDS
  // ======================================================
  const displayRecords = filteredStudents
    .map((student) => {
      const record =
        getStudentAttendance(student._id);

      return {
        student,
        record,
      };
    })
    .sort((a, b) =>
      a.student.name.localeCompare(
        b.student.name
      )
    );

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      <main className="w-full p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">

          {/* HEADER */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Attendance
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Mark attendance using AI face recognition
              </p>
            </div>

            <button
              onClick={
                generateTodayAttendance
              }
              disabled={
                generatingAttendance ||
                !systemSettings.dailyAttendance
              }
              className={`rounded-lg px-5 py-3 text-sm font-semibold text-white transition ${
                systemSettings.dailyAttendance
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "cursor-not-allowed bg-gray-400"
              }`}
            >
              {generatingAttendance
                ? "Generating..."
                : "Generate Today's Attendance"}
            </button>
          </div>

          {/* CLASS FILTER */}
          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* CLASS */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Select Class
                </label>

                <select
                  value={selectedClass}
                  onChange={(e) =>
                    setSelectedClass(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="All Classes">
                    All Classes
                  </option>

                  {classes.map((classItem) => (
                    <option
                      key={classItem._id}
                      value={classItem.name}
                    >
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SEARCH */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Search Student
                </label>

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  placeholder="Search by name, roll number, email..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

            </div>

            {/* SELECTED CLASS INFO */}
            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Current Class
                </p>

                <p className="mt-1 text-sm font-bold text-blue-800">
                  {selectedClass}
                </p>
              </div>

              <p className="text-sm text-blue-700">
                {totalStudents} student
                {totalStudents !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          {/* SETTINGS STATUS */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* FACE RECOGNITION */}
            <div
              className={`rounded-xl border p-4 ${
                systemSettings.faceRecognition
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Face Recognition
              </p>

              <p
                className={`mt-1 text-sm font-bold ${
                  systemSettings.faceRecognition
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {systemSettings.faceRecognition
                  ? "Enabled"
                  : "Disabled"}
              </p>
            </div>

            {/* AUTO ATTENDANCE */}
            <div
              className={`rounded-xl border p-4 ${
                systemSettings.autoAttendance
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Automatic Attendance
              </p>

              <p
                className={`mt-1 text-sm font-bold ${
                  systemSettings.autoAttendance
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {systemSettings.autoAttendance
                  ? "Enabled"
                  : "Disabled"}
              </p>
            </div>

            {/* DAILY ATTENDANCE */}
            <div
              className={`rounded-xl border p-4 ${
                systemSettings.dailyAttendance
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Daily Attendance
              </p>

              <p
                className={`mt-1 text-sm font-bold ${
                  systemSettings.dailyAttendance
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {systemSettings.dailyAttendance
                  ? "Enabled"
                  : "Disabled"}
              </p>
            </div>

          </div>

          {/* MESSAGE */}
          {message && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${
                message
                  .toLowerCase()
                  .includes("absent")
                  ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                  : message
                      .toLowerCase()
                      .includes("unknown")
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* CAMERA + SUMMARY */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* CAMERA CARD */}
            <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  Face Recognition
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Position your face clearly in front of the camera
                </p>
              </div>

              {/* CAMERA */}
              <div className="relative overflow-hidden rounded-xl bg-gray-900">

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full object-cover"
                />

                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">

                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
                        <span className="text-2xl">
                          📷
                        </span>
                      </div>

                      <p className="text-sm text-gray-300">
                        Camera is not active
                      </p>

                    </div>
                  </div>
                )}

                {cameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-52 w-40 rounded-[50%] border-2 border-blue-400 sm:h-64 sm:w-48" />
                  </div>
                )}

              </div>

              {/* CAMERA BUTTONS */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    disabled={
                      !systemSettings.faceRecognition
                    }
                    className={`flex-1 rounded-lg px-5 py-3 text-sm font-semibold text-white transition ${
                      systemSettings.faceRecognition
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "cursor-not-allowed bg-gray-400"
                    }`}
                  >
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="flex-1 rounded-lg bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    Stop Camera
                  </button>
                )}

                <button
                  onClick={recognizeFace}
                  disabled={
                    !cameraActive ||
                    recognizing ||
                    !systemSettings.faceRecognition ||
                    !systemSettings.autoAttendance
                  }
                  className={`flex-1 rounded-lg px-5 py-3 text-sm font-semibold text-white transition ${
                    cameraActive &&
                    systemSettings.faceRecognition &&
                    systemSettings.autoAttendance
                      ? "bg-green-600 hover:bg-green-700"
                      : "cursor-not-allowed bg-gray-400"
                  }`}
                >
                  {recognizing
                    ? "Recognizing..."
                    : "Recognize & Mark"}
                </button>

              </div>

              {!systemSettings.faceRecognition && (
                <p className="mt-3 text-center text-xs font-medium text-red-500">
                  Face Recognition is disabled in Settings.
                </p>
              )}

              {systemSettings.faceRecognition &&
                !systemSettings.autoAttendance && (
                  <p className="mt-3 text-center text-xs font-medium text-orange-500">
                    Automatic Attendance is disabled in Settings.
                  </p>
                )}

            </div>

            {/* SUMMARY CARD */}
            <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">

              <h2 className="text-lg font-bold text-gray-900">
                Today's Summary
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {selectedClass === "All Classes"
                  ? "Current attendance status"
                  : `Attendance for ${selectedClass}`}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">

                {/* TOTAL */}
                <div className="rounded-xl bg-gray-50 p-5">
                  <p className="text-sm font-medium text-gray-500">
                    Total Students
                  </p>

                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {totalStudents}
                  </p>
                </div>

                {/* PRESENT */}
                <div className="rounded-xl bg-green-50 p-5">
                  <p className="text-sm font-medium text-green-600">
                    Present
                  </p>

                  <p className="mt-2 text-3xl font-bold text-green-700">
                    {presentCount}
                  </p>
                </div>

                {/* ABSENT */}
                <div className="rounded-xl bg-red-50 p-5">
                  <p className="text-sm font-medium text-red-600">
                    Absent
                  </p>

                  <p className="mt-2 text-3xl font-bold text-red-700">
                    {absentCount}
                  </p>
                </div>

                {/* RATE */}
                <div className="rounded-xl bg-blue-50 p-5">
                  <p className="text-sm font-medium text-blue-600">
                    Attendance
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-700">
                    {attendanceRate}%
                  </p>
                </div>

              </div>

            </div>
          </div>

          {/* TODAY'S RECORDS */}
          <div className="mt-6 rounded-xl bg-white shadow-sm">

            <div className="border-b border-gray-100 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Today's Attendance
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {selectedClass === "All Classes"
                      ? "Attendance records for all students"
                      : `Attendance records for ${selectedClass}`}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600">
                  Showing {displayRecords.length} student
                  {displayRecords.length !== 1
                    ? "s"
                    : ""}
                </div>

              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Loading attendance...
              </div>
            ) : displayRecords.length === 0 ? (
              <div className="p-8 text-center">

                <p className="text-sm font-medium text-gray-600">
                  No students found.
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Try another class or search term.
                </p>

              </div>
            ) : (
              <div className="w-full overflow-x-auto">

                <table className="min-w-[1100px] w-full text-left">

                  <thead className="bg-gray-50">
                    <tr>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Student
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Roll No
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Class
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Department
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Date
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Time
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Method
                      </th>

                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Action
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">

                    {displayRecords.map(
                      ({ student, record }) => {

                        const status =
                          record?.status ||
                          "Not Marked";

                        return (
                          <tr
                            key={student._id}
                            className="hover:bg-gray-50"
                          >

                            {/* STUDENT */}
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">
                                {student.name}
                              </div>

                              <div className="mt-1 text-xs text-gray-400">
                                {student.email}
                              </div>
                            </td>

                            {/* ROLL NUMBER */}
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {student.rollNumber || "-"}
                            </td>

                            {/* CLASS */}
                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                {student.className || "General"}
                              </span>
                            </td>

                            {/* DEPARTMENT */}
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {student.department || "-"}
                            </td>

                            {/* DATE */}
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {record
                                ? formatDate(
                                    record.date
                                  )
                                : "-"}
                            </td>

                            {/* TIME */}
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {record
                                ? formatTime(
                                    record.date
                                  )
                                : "-"}
                            </td>

                            {/* STATUS */}
                            <td className="px-6 py-4">

                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  status === "Present"
                                    ? "bg-green-100 text-green-700"
                                    : status === "Absent"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {status}
                              </span>

                            </td>

                            {/* METHOD */}
                            <td className="px-6 py-4">

                              {record ? (
                                <div className="flex flex-col gap-1">

                                  <span className="text-sm text-gray-600">
                                    {record.markedBy ||
                                      "Face Recognition"}
                                  </span>

                                  {record.markedBy ===
                                    "Admin Manual" &&
                                    record.status ===
                                      "Absent" && (
                                      <span className="text-xs font-semibold text-orange-600">
                                        Admin marked absent
                                      </span>
                                    )}

                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">
                                  Not marked
                                </span>
                              )}

                            </td>

                            {/* ACTION */}
                            <td className="px-6 py-4">

                              {record?.status ===
                              "Absent" ? (
                                <button
                                  onClick={() =>
                                    markStudentAbsent(
                                      student._id
                                    )
                                  }
                                  disabled={
                                    markingAbsent ===
                                    student._id ||
                                    record.markedBy ===
                                      "Admin Manual"
                                  }
                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
                                  {markingAbsent ===
                                  student._id
                                    ? "Marking..."
                                    : record.markedBy ===
                                      "Admin Manual"
                                    ? "Admin Absent"
                                    : "Mark Absent"}
                                </button>
                              ) : record?.status ===
                                "Present" ? (
                                <span className="text-xs font-medium text-green-600">
                                  Present
                                </span>
                              ) : (
                                <button
                                  onClick={() =>
                                    markStudentAbsent(
                                      student._id
                                    )
                                  }
                                  disabled={
                                    markingAbsent ===
                                    student._id
                                  }
                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
                                  {markingAbsent ===
                                  student._id
                                    ? "Marking..."
                                    : "Mark Absent"}
                                </button>
                              )}

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

          {/* INFORMATION */}
          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">

            <h3 className="text-sm font-bold text-blue-800">
              Attendance Rules
            </h3>

            <ul className="mt-2 space-y-1 text-xs text-blue-700">

              <li>
                • Unknown faces are never saved as attendance.
              </li>

              <li>
                • A student with no attendance record can be marked Present by face recognition.
              </li>

              <li>
                • System-generated Absent records can become Present when the student is recognized.
              </li>

              <li>
                • Admin Manual Absent records remain Absent even if the student's face is recognized.
              </li>

              <li>
                • An Admin Manual Absent record cannot be changed to Present by face recognition.
              </li>

              <li>
                • Selecting a class limits the attendance table and summary to that class.
              </li>

            </ul>

          </div>

        </div>
      </main>
    </div>
  );
};

export default Attendance;
