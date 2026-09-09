import { useEffect, useRef, useState } from "react";
import {
  FiCamera,
  FiCheckCircle,
  FiXCircle,
  FiUser,
} from "react-icons/fi";

import {
  getFaceDescriptor,
  loadFaceModels,
} from "../utils/faceRecognition";

import { getSettings } from "../utils/settings";

const AttendanceKiosk = () => {
  const videoRef = useRef(null);

  const streamRef = useRef(null);

  const scanIntervalRef = useRef(null);

  const scanningRef = useRef(false);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [modelsReady, setModelsReady] =
    useState(false);

  const [message, setMessage] =
    useState("Starting camera...");

  const [messageType, setMessageType] =
    useState("info");

  const [
    recognizedStudent,
    setRecognizedStudent,
  ] = useState(null);

  const [settings, setSettings] =
    useState({});

  const [error, setError] =
    useState("");

  // ======================================================
  // LOAD MODELS
  // ======================================================

  useEffect(() => {
    const initializeKiosk = async () => {
      try {
        setMessage(
          "Loading face recognition models..."
        );

        setMessageType("info");

        const savedSettings =
          getSettings();

        setSettings(
          savedSettings || {}
        );

        await loadFaceModels();

        setModelsReady(true);

        setMessage(
          "Starting camera..."
        );
      } catch (err) {
        console.error(
          "Kiosk initialization error:",
          err
        );

        setError(
          "Unable to load face recognition. Please refresh the page."
        );

        setMessageType("error");
      }
    };

    initializeKiosk();
  }, []);

  // ======================================================
  // START CAMERA
  // ======================================================

  useEffect(() => {
    if (!modelsReady) return;

    let mounted = true;

    const startCamera = async () => {
      try {
        setMessage(
          "Requesting camera access..."
        );

        setMessageType("info");

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
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
            }
          );

        if (!mounted) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject =
            stream;

          await videoRef.current.play();

          setCameraReady(true);

          setMessage(
            "Look at the camera"
          );

          setMessageType("info");
        }
      } catch (err) {
        console.error(
          "Camera error:",
          err
        );

        setError(
          "Camera access was denied or the camera is unavailable."
        );

        setMessageType("error");
      }
    };

    startCamera();

    return () => {
      mounted = false;

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        streamRef.current = null;
      }
    };
  }, [modelsReady]);

  // ======================================================
  // RECOGNIZE FACE
  // ======================================================

  const recognizeFace = async () => {
    if (scanningRef.current)
      return;

    if (!cameraReady)
      return;

    if (!videoRef.current)
      return;

    scanningRef.current = true;

    try {
      setMessage("Scanning...");

      setMessageType("info");

      const descriptor =
        await getFaceDescriptor(
          videoRef.current
        );

      if (
        !descriptor ||
        descriptor.length !== 128
      ) {
        throw new Error(
          "Invalid face descriptor"
        );
      }

      const response =
        await fetch(
          "http://localhost:5000/api/attendance/kiosk-recognize",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              descriptor:
                Array.from(
                  descriptor
                ),
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "Kiosk response:",
        data
      );

      // ==================================================
      // UNKNOWN FACE
      // ==================================================

      if (!response.ok) {
        if (
          response.status === 401
        ) {
          setRecognizedStudent(null);

          setMessage(
            data.message ||
              "Student not recognized. Attendance was NOT saved."
          );

          setMessageType("error");

          return;
        }

        throw new Error(
          data.message ||
            "Face recognition failed."
        );
      }

      // ==================================================
      // RECOGNIZED STUDENT
      // ==================================================

      setRecognizedStudent(
        data.student || null
      );

      // ==================================================
      // ADMIN ABSENT
      // ==================================================

      if (
        data.alreadyAbsent &&
        data.markedByAdmin
      ) {
        setMessage(
          "Student was marked Absent by Admin. Attendance remains Absent."
        );

        setMessageType(
          "warning"
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              3000
            )
        );

        setRecognizedStudent(
          null
        );

        setMessage(
          "Look at the camera"
        );

        setMessageType("info");

        return;
      }

      // ==================================================
      // ALREADY PRESENT
      // ==================================================

      if (
        data.alreadyPresent
      ) {
        setMessage(
          `${
            data.student?.name ||
            "Student"
          } is already marked Present today.`
        );

        setMessageType(
          "success"
        );
      } else {
        // ================================================
        // PRESENT SUCCESS
        // ================================================

        setMessage(
          `${
            data.student?.name ||
            "Student"
          } marked Present successfully!`
        );

        setMessageType(
          "success"
        );
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            2500
          )
      );

      setRecognizedStudent(
        null
      );

      setMessage(
        "Look at the camera"
      );

      setMessageType("info");
    } catch (err) {
      console.error(
        "Face recognition error:",
        err
      );

      setRecognizedStudent(
        null
      );

      if (
        err.message ===
        "No face detected"
      ) {
        setMessage(
          "No face detected. Please look at the camera."
        );

        setMessageType(
          "warning"
        );
      } else {
        setMessage(
          err.message ||
            "Unable to recognize face. Please try again."
        );

        setMessageType(
          "error"
        );
      }
    } finally {
      scanningRef.current =
        false;
    }
  };

  // ======================================================
  // AUTOMATIC SCANNING
  // ======================================================

  useEffect(() => {
    if (
      !cameraReady ||
      !modelsReady
    ) {
      return;
    }

    scanIntervalRef.current =
      setInterval(() => {
        if (
          !scanningRef.current
        ) {
          recognizeFace();
        }
      }, 2500);

    return () => {
      if (
        scanIntervalRef.current
      ) {
        clearInterval(
          scanIntervalRef.current
        );

        scanIntervalRef.current =
          null;
      }
    };
  }, [
    cameraReady,
    modelsReady,
  ]);

  // ======================================================
  // CLEANUP
  // ======================================================

  useEffect(() => {
    return () => {
      if (
        scanIntervalRef.current
      ) {
        clearInterval(
          scanIntervalRef.current
        );
      }

      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  // ======================================================
  // MESSAGE STYLE
  // ======================================================

  const getMessageStyle = () => {
    switch (messageType) {
      case "success":
        return "border-green-500/40 bg-green-500/10 text-green-400";

      case "error":
        return "border-red-500/40 bg-red-500/10 text-red-400";

      case "warning":
        return "border-yellow-500/40 bg-yellow-500/10 text-yellow-400";

      default:
        return "border-blue-500/40 bg-blue-500/10 text-blue-400";
    }
  };

  // ======================================================
  // MESSAGE ICON
  // ======================================================

  const getIcon = () => {
    switch (messageType) {
      case "success":
        return (
          <FiCheckCircle
            size={24}
          />
        );

      case "error":
        return (
          <FiXCircle
            size={24}
          />
        );

      case "warning":
        return (
          <FiXCircle
            size={24}
          />
        );

      default:
        return (
          <FiCamera
            size={24}
          />
        );
    }
  };

  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen flex-col">

        {/* HEADER */}

        <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-5 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                <FiCamera size={22} />
              </div>

              <div>
                <h1 className="text-xl font-bold">
                  {settings?.schoolName ||
                    "SmartAttend"}
                </h1>

                <p className="text-sm text-slate-400">
                  AI Attendance Kiosk
                </p>
              </div>

            </div>

            <div className="hidden items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-400 sm:flex">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Kiosk Mode
            </div>

          </div>
        </header>

        {/* MAIN */}

        <main className="flex flex-1 items-center justify-center px-4 py-8">

          <div className="w-full max-w-5xl">

            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">

              {/* CAMERA */}

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

                <div className="border-b border-slate-800 px-6 py-4">

                  <div className="flex items-center justify-between">

                    <div>
                      <h2 className="text-lg font-semibold">
                        Attendance Camera
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Position your face clearly inside the camera.
                      </p>
                    </div>

                    <div
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                        cameraReady
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          cameraReady
                            ? "bg-green-400"
                            : "bg-yellow-400"
                        }`}
                      />

                      {cameraReady
                        ? "Camera Ready"
                        : "Starting"}
                    </div>

                  </div>

                </div>

                <div className="relative aspect-video bg-black">

                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />

                  {/* FRAME */}

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

                    <div className="relative h-[70%] w-[45%] min-w-[180px] max-w-[300px] rounded-[45%] border-2 border-blue-400/70">

                      <div className="absolute left-1/2 top-0 h-5 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-t-2 border-blue-400" />

                      <div className="absolute bottom-0 left-1/2 h-5 w-20 -translate-x-1/2 translate-y-1/2 rounded-full border-b-2 border-blue-400" />

                      <div className="absolute left-0 top-1/2 h-20 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-l-2 border-blue-400" />

                      <div className="absolute right-0 top-1/2 h-20 w-5 translate-x-1/2 -translate-y-1/2 rounded-full border-r-2 border-blue-400" />

                    </div>

                  </div>

                  {/* LOADING */}

                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">

                      <div className="text-center">

                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

                        <p className="text-sm text-slate-300">
                          {modelsReady
                            ? "Starting camera..."
                            : "Loading face recognition..."}
                        </p>

                      </div>

                    </div>
                  )}

                </div>

                {/* MESSAGE */}

                <div className="px-6 py-5">

                  <div
                    className={`flex items-center justify-center gap-3 rounded-xl border px-4 py-4 text-center ${getMessageStyle()}`}
                  >
                    {getIcon()}

                    <p className="text-sm font-medium">
                      {message}
                    </p>
                  </div>

                </div>

              </div>

              {/* RESULT */}

              <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

                <div>

                  <h2 className="text-lg font-semibold">
                    Recognition Result
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Student information will appear here after successful recognition.
                  </p>

                </div>

                <div className="my-8 flex flex-1 items-center justify-center">

                  {recognizedStudent ? (

                    <div className="w-full text-center">

                      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-green-500/30 bg-green-500/10">

                        {recognizedStudent.profilePicture ? (
                          <img
                            src={
                              recognizedStudent.profilePicture
                            }
                            alt={
                              recognizedStudent.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <FiUser
                            size={42}
                            className="text-green-400"
                          />
                        )}

                      </div>

                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400">

                        <FiCheckCircle
                          size={14}
                        />

                        Recognized

                      </div>

                      <h3 className="text-2xl font-bold text-white">
                        {
                          recognizedStudent.name
                        }
                      </h3>

                      {recognizedStudent.rollNumber && (
                        <p className="mt-2 text-sm text-slate-400">
                          Roll No:{" "}
                          {
                            recognizedStudent.rollNumber
                          }
                        </p>
                      )}

                      {recognizedStudent.department && (
                        <p className="mt-1 text-sm text-slate-400">
                          {
                            recognizedStudent.department
                          }
                        </p>
                      )}

                    </div>

                  ) : (

                    <div className="text-center">

                      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-slate-700 bg-slate-800">

                        <FiUser
                          size={40}
                          className="text-slate-500"
                        />

                      </div>

                      <p className="text-sm font-medium text-slate-300">
                        Waiting for recognition
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Please look directly at the camera.
                        <br />
                        Attendance is marked automatically.
                      </p>

                    </div>
                  )}

                </div>

                {/* STATUS */}

                <div className="border-t border-slate-800 pt-5">

                  <div className="flex items-center justify-between text-sm">

                    <span className="text-slate-500">
                      Face Recognition
                    </span>

                    <span
                      className={
                        modelsReady
                          ? "font-medium text-green-400"
                          : "font-medium text-yellow-400"
                      }
                    >
                      {modelsReady
                        ? "Ready"
                        : "Loading"}
                    </span>

                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">

                    <span className="text-slate-500">
                      Camera
                    </span>

                    <span
                      className={
                        cameraReady
                          ? "font-medium text-green-400"
                          : "font-medium text-yellow-400"
                      }
                    >
                      {cameraReady
                        ? "Connected"
                        : "Connecting"}
                    </span>

                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">

                    <span className="text-slate-500">
                      Automatic Scanning
                    </span>

                    <span className="font-medium text-blue-400">
                      Active
                    </span>

                  </div>

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="mt-6 text-center">

              <p className="text-xs text-slate-500">
                SmartAttend • AI Face Recognition Attendance
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Unknown or unrecognized faces are not saved as attendance records.
              </p>

            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
                {error}
              </div>
            )}

          </div>

        </main>

      </div>
    </div>
  );
};

export default AttendanceKiosk;