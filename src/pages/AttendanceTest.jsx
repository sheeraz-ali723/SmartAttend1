import { useState } from "react";

const AttendanceTest = () => {
  const [message, setMessage] = useState("");

  const markAttendance = async () => {
    try {
      const response = await fetch(
        "https://railway-up-production-d063.up.railway.app/api/attendance/mark",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: "6a9faf2eab7ca5374c6a5e41",
          }),
        }
      );

      const data = await response.json();

      console.log("Attendance response:", data);

      if (!response.ok) {
        setMessage(data.message || "Failed to mark attendance");
        return;
      }

      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to backend");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-6">
          Attendance API Test
        </h1>

        <button
          onClick={markAttendance}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Mark Attendance
        </button>

        {message && (
          <p className="mt-5 font-semibold">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AttendanceTest;