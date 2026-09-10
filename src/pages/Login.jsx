import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLock, FiMail, FiLogIn } from "react-icons/fi";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");

    if (!email || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://railway-up-production-d063.up.railway.app/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Invalid email or password."
        );
        return;
      }

      // Save authentication information
      localStorage.setItem(
        "smartAttendToken",
        data.token
      );

      localStorage.setItem(
        "smartAttendAdmin",
        JSON.stringify(data.admin)
      );

      // Go to dashboard
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">

        {/* LOGO */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg">
            📷
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            SmartAttend
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            AI Face Recognition Attendance System
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Admin Login
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Sign in to manage SmartAttend
            </p>
          </div>

          {/* ERROR */}
          {message && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {message}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* EMAIL */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>

              <div className="relative">
                <FiMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="admin@smartattend.com"
                  className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>

              <div className="relative">
                <FiLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              <FiLogIn size={18} />

              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>
          </form>
        </div>

        {/* FOOTER */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Smart Attendance • AI Face Recognition System
        </p>
      </div>
    </div>
  );
};

export default Login;
