import { useEffect, useRef, useState } from "react";
import {
  FiCamera,
  FiCheckCircle,
  FiXCircle,
  FiUser,
  FiShield,
  FiActivity,
  FiAlertCircle,
  FiVolume2,
} from "react-icons/fi";
import { getFaceDescriptor, loadFaceModels } from "../utils/faceRecognition";
import { getSettings } from "../utils/settings";

// ======================================================
// CONFIGURATION
// ======================================================
const API_URL = "https://projects-cs-production.up.railway.app";
const REQUIRED_CONFIRMATIONS = 2;
const SCAN_INTERVAL = 1000;
const NEXT_STUDENT_DELAY = 3000;

// Track students marked in current kiosk session
const markedStudentsCache = new Set();

// ======================================================
// VOICE SYNTHESIS DIRECT FUNCTION
// ======================================================
const speakDirect = (text) => {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = "en-US";

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Speech error:", err);
  }
};

const AttendanceKiosk = () => {
  // ====================================================
  // REFS
  // ====================================================
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const scanningRef = useRef(false);
  const processingCompleteRef = useRef(false);
  const mountedRef = useRef(true);

  // Track repeated recognition
  const candidateRef = useRef(null);
  const confirmationCountRef = useRef(0);

  // ====================================================
  // STATE
  // ====================================================
  const [cameraReady, setCameraReady] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [message, setMessage] = useState("Starting camera...");
  const [messageType, setMessageType] = useState("info");
  const [recognizedStudent, setRecognizedStudent] = useState(null);
  const [settings, setSettings] = useState({});
  const [error, setError] = useState("");
  const [confirmationCount, setConfirmationCount] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState("idle");
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // ====================================================
  // AUDIO UNLOCK FOR BROWSER POLICY
  // ====================================================
  const unlockAudio = () => {
    if (!audioUnlocked && typeof window !== "undefined" && window.speechSynthesis) {
      const dummy = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(dummy);
      setAudioUnlocked(true);
    }
  };

  // ====================================================
  // RESET RECOGNITION
  // ====================================================
  const resetRecognition = () => {
    candidateRef.current = null;
    confirmationCountRef.current = 0;
    if (mountedRef.current) {
      setConfirmationCount(0);
    }
  };

  // ====================================================
  // READY FOR NEXT STUDENT
  // ====================================================
  const readyForNextStudent = () => {
    resetRecognition();
    if (!mountedRef.current) return;

    setRecognizedStudent(null);
    setAttendanceStatus("idle");
    setMessage("Ready for next student");
    setMessageType("info");
    processingCompleteRef.current = false;
  };

  // ====================================================
  // START CAMERA
  // ====================================================
  const startCamera = async () => {
    try {
      setError("");
      setMessage("Requesting camera access...");
      setMessageType("info");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera is not supported by this browser.");
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element is not available.");

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      try {
        await video.play();
      } catch (playErr) {
        if (playErr.name !== "AbortError") throw playErr;
      }

      await new Promise((resolve) => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolve();
          return;
        }
        const handleLoaded = () => {
          video.removeEventListener("loadedmetadata", handleLoaded);
          resolve();
        };
        video.addEventListener("loadedmetadata", handleLoaded);
      });

      if (!mountedRef.current) return;
      setCameraReady(true);
      setMessage("Camera ready. Look at the camera.");
      setMessageType("info");
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Camera error:", err);
      if (!mountedRef.current) return;
      setCameraReady(false);
      setError(err?.message || "Unable to access camera.");
      setMessage("Camera could not be started.");
      setMessageType("error");
    }
  };

  // ====================================================
  // RECOGNIZE FACE
  // ====================================================
  const recognizeFace = async () => {
    if (
      scanningRef.current ||
      processingCompleteRef.current ||
      !cameraReady ||
      !modelsReady ||
      !videoRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    scanningRef.current = true;

    try {
      const descriptor = await getFaceDescriptor(video);
      if (!descriptor || descriptor.length !== 128) {
        throw new Error("Invalid face descriptor");
      }

      // Step 1: Confirmation Call
      const response = await fetch(`${API_URL}/api/attendance/kiosk-recognize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptor: Array.from(descriptor),
          confirmOnly: true,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.student) {
        resetRecognition();
        return;
      }

      const student = data.student;
      const studentId = String(student.id || student._id);

      if (candidateRef.current === studentId) {
        confirmationCountRef.current += 1;
      } else {
        candidateRef.current = studentId;
        confirmationCountRef.current = 1;
      }

      const currentCount = confirmationCountRef.current;

      if (mountedRef.current) {
        setRecognizedStudent(student);
        setConfirmationCount(currentCount);
        setAttendanceStatus("recognizing");
        setMessage(`Recognizing ${student.name}...`);
        setMessageType("info");
      }

      if (currentCount < REQUIRED_CONFIRMATIONS) {
        return;
      }

      // Step 2: Final Confirmation
      processingCompleteRef.current = true;

      // Final save / verify request
      const saveResponse = await fetch(`${API_URL}/api/attendance/kiosk-recognize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptor: Array.from(descriptor),
          confirmOnly: false,
        }),
      });

      const saveData = await saveResponse.json().catch(() => null);
      const studentName = saveData?.student?.name || student.name;

      // 🛑 CASE A: Student was marked Absent by Admin
      if (saveData?.alreadyAbsent && saveData?.markedByAdmin) {
        if (mountedRef.current) {
          setAttendanceStatus("absent");
          setMessage(`${studentName} was marked Absent by Admin.`);
          setMessageType("warning");
        }
        speakDirect(`${studentName} was marked absent by admin.`);
      }
      // ⚠️ CASE B: Student already marked Present
      else if (markedStudentsCache.has(studentId) || saveData?.alreadyPresent) {
        if (mountedRef.current) {
          setAttendanceStatus("already");
          setMessage(`${studentName} is already marked Present today.`);
          setMessageType("info");
        }
        speakDirect(`${studentName} is already marked present today.`);
      }
      // ✅ CASE C: Student newly marked Present
      else {
        markedStudentsCache.add(studentId);

        if (mountedRef.current) {
          setAttendanceStatus("success");
          setMessage(`${studentName} is marked Present today.`);
          setMessageType("success");
        }
        speakDirect(`${studentName} is marked present today.`);
      }

      await new Promise((resolve) => setTimeout(resolve, NEXT_STUDENT_DELAY));
      readyForNextStudent();
    } catch (err) {
      if (err?.message === "No face detected") {
        if (mountedRef.current) {
          setMessage("Please look directly at the camera.");
          setMessageType("warning");
          setAttendanceStatus("idle");
        }
        return;
      }

      console.error("Recognition error:", err);
      resetRecognition();
      processingCompleteRef.current = false;
    } finally {
      scanningRef.current = false;
    }
  };

  // ====================================================
  // INITIALIZATION
  // ====================================================
  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      try {
        try {
          const loadedSettings = await getSettings();
          if (mountedRef.current && loadedSettings) {
            setSettings(loadedSettings);
          }
        } catch (settingsError) {
          console.warn("Could not load settings:", settingsError);
        }

        setMessage("Loading AI face recognition...");
        setMessageType("info");
        await loadFaceModels();

        if (!mountedRef.current) return;
        setModelsReady(true);
        await startCamera();
      } catch (err) {
        console.error("Kiosk initialization error:", err);
        if (mountedRef.current) {
          setError(err?.message || "Failed to initialize kiosk.");
          setMessage("Kiosk initialization failed.");
          setMessageType("error");
        }
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // ====================================================
  // SCANNING TIMER
  // ====================================================
  useEffect(() => {
    if (!cameraReady || !modelsReady) return;

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    const initialTimeout = setTimeout(() => {
      recognizeFace();
    }, 700);

    scanIntervalRef.current = setInterval(() => {
      recognizeFace();
    }, SCAN_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [cameraReady, modelsReady]);

  // ====================================================
  // STYLES & ICONS
  // ====================================================
  const getMessageStyle = () => {
    switch (messageType) {
      case "success":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-300";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20 text-amber-300";
      case "error":
        return "bg-red-500/10 border-red-500/20 text-red-300";
      default:
        return "bg-blue-500/10 border-blue-500/20 text-blue-300";
    }
  };

  const getStatusIcon = () => {
    if (attendanceStatus === "success") return <FiCheckCircle className="w-5 h-5" />;
    if (attendanceStatus === "error") return <FiXCircle className="w-5 h-5" />;
    if (attendanceStatus === "absent") return <FiAlertCircle className="w-5 h-5" />;
    return <FiActivity className="w-5 h-5" />;
  };

  return (
    <div
      onClick={unlockAudio}
      className="min-h-screen bg-slate-950 text-white px-3 py-4 sm:px-6 sm:py-6 lg:px-8 cursor-pointer select-none"
    >
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="mb-5 sm:mb-7">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
                  <FiCamera className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">SmartAttend AI</h1>
                  <p className="text-xs sm:text-sm text-slate-400">Face Recognition Attendance</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!audioUnlocked && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                    <FiVolume2 className="w-3.5 h-3.5 animate-pulse" />
                    <span>Click screen once to activate voice</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </span>
                  <span className="text-xs font-medium text-emerald-300">Kiosk Online</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-5">
          {/* CAMERA SECTION */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-4 py-4 sm:px-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base sm:text-lg">Attendance Scanner</h2>
                <p className="text-xs text-slate-500 mt-1">Position your face inside the guide</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    cameraReady ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span className="text-slate-400">{cameraReady ? "Ready" : "Starting"}</span>
              </div>
            </div>

            <div className="p-3 sm:p-5">
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

                {/* Face Guide Target */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`relative w-44 h-56 sm:w-56 sm:h-72 rounded-[48%] border-2 transition-all duration-300 ${
                      attendanceStatus === "recognizing"
                        ? "border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.25)]"
                        : attendanceStatus === "success"
                        ? "border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                        : attendanceStatus === "absent"
                        ? "border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.3)]"
                        : "border-white/50"
                    }`}
                  >
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-400 rounded-full" />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-400 rounded-full" />
                  </div>
                </div>

                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cameraReady ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span className="text-[11px] font-medium text-white">
                    {cameraReady ? "LIVE" : "CONNECTING"}
                  </span>
                </div>

                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2">
                  <FiShield className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] text-slate-200">AI Recognition</span>
                </div>

                {!cameraReady && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-blue-400 animate-spin mb-4" />
                    <p className="text-sm text-slate-300">
                      {modelsReady ? "Starting camera..." : "Loading AI models..."}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Message */}
              <div className={`mt-4 border rounded-xl px-4 py-3 ${getMessageStyle()}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">{getStatusIcon()}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{message}</p>
                    {attendanceStatus === "recognizing" && (
                      <p className="text-xs opacity-70 mt-0.5">Confirming identity...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Confirmation Indicator */}
              {confirmationCount > 0 && confirmationCount < REQUIRED_CONFIRMATIONS && (
                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-slate-400">Confirming identity</span>
                    <span className="text-blue-400 font-medium">
                      {confirmationCount}/{REQUIRED_CONFIRMATIONS}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${(confirmationCount / REQUIRED_CONFIRMATIONS) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* STUDENT DETAILS SECTION */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-4 py-4 sm:px-6 border-b border-slate-800">
              <h2 className="font-semibold text-base sm:text-lg">Recognition Result</h2>
              <p className="text-xs text-slate-500 mt-1">Student information appears here</p>
            </div>

            <div className="p-4 sm:p-6">
              {recognizedStudent ? (
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <div
                      className={`relative w-24 h-24 rounded-full flex items-center justify-center border-2 ${
                        attendanceStatus === "success"
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : attendanceStatus === "absent"
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-blue-500/10 border-blue-500/30"
                      }`}
                    >
                      {attendanceStatus === "success" && (
                        <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping" />
                      )}
                      <FiUser
                        className={`w-11 h-11 ${
                          attendanceStatus === "success"
                            ? "text-emerald-400"
                            : attendanceStatus === "absent"
                            ? "text-amber-400"
                            : "text-blue-400"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                      Recognized Student
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white break-words">
                      {recognizedStudent.name}
                    </h3>
                    {recognizedStudent.rollNumber && (
                      <p className="text-sm text-slate-400 mt-2">
                        Roll No: {recognizedStudent.rollNumber}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {recognizedStudent.department && (
                      <div className="bg-slate-800/70 border border-slate-700/50 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">
                          Department
                        </p>
                        <p className="text-sm text-slate-200 mt-1 truncate">
                          {recognizedStudent.department}
                        </p>
                      </div>
                    )}
                    {recognizedStudent.className && (
                      <div className="bg-slate-800/70 border border-slate-700/50 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Class</p>
                        <p className="text-sm text-slate-200 mt-1 truncate">
                          {recognizedStudent.className}
                        </p>
                      </div>
                    )}
                  </div>

                  <div
                    className={`rounded-xl border p-4 ${
                      attendanceStatus === "success"
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : attendanceStatus === "absent"
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-blue-500/10 border-blue-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          attendanceStatus === "success"
                            ? "bg-emerald-500/15"
                            : attendanceStatus === "absent"
                            ? "bg-amber-500/15"
                            : "bg-blue-500/15"
                        }`}
                      >
                        {attendanceStatus === "success" ? (
                          <FiCheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : attendanceStatus === "absent" ? (
                          <FiAlertCircle className="w-5 h-5 text-amber-400" />
                        ) : (
                          <FiActivity className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          {attendanceStatus === "success"
                            ? "Attendance recorded"
                            : attendanceStatus === "absent"
                            ? "Marked Absent"
                            : "Already present"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {attendanceStatus === "success"
                            ? "Student has been marked Present"
                            : attendanceStatus === "absent"
                            ? "Student was marked Absent by Admin"
                            : "Attendance was already marked today"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-[390px] flex flex-col items-center justify-center text-center">
                  <div className="relative w-28 h-28 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-6">
                    <div className="absolute inset-2 rounded-full border border-dashed border-slate-600" />
                    <FiUser className="w-12 h-12 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-300">Ready for student</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed">
                    Look at the camera and position your face inside the guide.
                  </p>
                  <div className="flex items-center gap-2 mt-6 text-xs text-slate-600">
                    <FiShield className="w-4 h-4" />
                    <span>Secure AI face recognition</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ERROR BOX */}
        {error && (
          <div className="mt-5 bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <FiXCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">Kiosk Error</p>
                <p className="text-xs text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>SmartAttend AI</span>
          <div className="flex items-center gap-2">
            <span>Face Recognition</span>
            <span>•</span>
            <span>Automated Attendance</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AttendanceKiosk;