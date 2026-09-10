import { useEffect, useState } from "react";
import {
  FiCamera,
  FiUpload,
  FiTrash2,
  FiSave,
  FiRefreshCw,
} from "react-icons/fi";
import {
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from "../utils/settings";

const Settings = () => {
  // =========================================================
  // SETTINGS
  // =========================================================

  const [settings, setSettings] = useState(() => getSettings());

  // =========================================================
  // ADMIN ACCOUNT
  // =========================================================

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [profilePicture, setProfilePicture] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // =========================================================
  // LOAD ADMIN PROFILE
  // =========================================================

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem("smartAttendToken");

        if (!token) {
          setLoadingProfile(false);
          return;
        }

        const response = await fetch(
          "http://railway-up-production-d063.up.railway.app/api/auth/profile",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load profile"
          );
        }

        setAdminName(data.admin?.name || "");
        setAdminEmail(data.admin?.email || "");
        setProfilePicture(
          data.admin?.profilePicture || ""
        );

        // Keep local administrator information updated
        localStorage.setItem(
          "smartAttendAdmin",
          JSON.stringify(data.admin)
        );

        // Tell Sidebar to refresh
        window.dispatchEvent(
          new Event("smartAttendAccountChanged")
        );
      } catch (error) {
        console.error(
          "Failed to load administrator profile:",
          error
        );

        // Try localStorage as fallback
        try {
          const savedAdmin =
            localStorage.getItem("smartAttendAdmin");

          if (savedAdmin) {
            const admin = JSON.parse(savedAdmin);

            setAdminName(admin.name || "");
            setAdminEmail(admin.email || "");
            setProfilePicture(
              admin.profilePicture || ""
            );
          }
        } catch (localError) {
          console.error(
            "Failed to load local administrator:",
            localError
          );
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  // =========================================================
  // CHANGE PROFILE PICTURE
  // =========================================================

 const handleProfilePictureChange = (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Please select an image smaller than 5MB.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();

    img.onload = () => {
      // Maximum dimensions
      const MAX_SIZE = 400;

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height = Math.round(
            (height * MAX_SIZE) / width
          );
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width = Math.round(
            (width * MAX_SIZE) / height
          );
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      // Compress image
      const compressedImage = canvas.toDataURL(
        "image/jpeg",
        0.75
      );

      setProfilePicture(compressedImage);
    };

    img.onerror = () => {
      alert("Could not process the selected image.");
    };

    img.src = e.target.result;
  };

  reader.onerror = () => {
    alert("Failed to read the selected image.");
  };

  reader.readAsDataURL(file);

  // Allow selecting the same file again
  event.target.value = "";
};

  // =========================================================
  // REMOVE PROFILE PICTURE
  // =========================================================

  const handleRemovePicture = () => {
    setProfilePicture("");
  };

  // =========================================================
  // SAVE ADMIN ACCOUNT
  // =========================================================

  const handleSaveAccount = async (event) => {
    event.preventDefault();

    try {
      setSavingAccount(true);

      const token = localStorage.getItem("smartAttendToken");

      if (!token) {
        alert("Your session has expired. Please login again.");
        return;
      }

      const response = await fetch(
        "http://railway-up-production-d063.up.railway.app/api/auth/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: adminName,
            email: adminEmail,
            currentPassword,
            newPassword,
            profilePicture,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update account."
        );
      }

      // Save administrator locally
      if (data.admin) {
        localStorage.setItem(
          "smartAttendAdmin",
          JSON.stringify(data.admin)
        );

        setAdminName(data.admin.name || "");
        setAdminEmail(data.admin.email || "");
        setProfilePicture(
          data.admin.profilePicture || ""
        );
      }

      // Save new token if backend returns one
      if (data.token) {
        localStorage.setItem(
          "smartAttendToken",
          data.token
        );
      }

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");

      // Tell Sidebar to update
      window.dispatchEvent(
        new Event("smartAttendAccountChanged")
      );

      alert("Administrator account updated successfully.");
    } catch (error) {
      console.error(
        "Failed to save administrator account:",
        error
      );

      alert(error.message || "Failed to update account.");
    } finally {
      setSavingAccount(false);
    }
  };

  // =========================================================
  // UPDATE SETTING
  // =========================================================

  const updateSetting = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  // =========================================================
  // SAVE SETTINGS
  // =========================================================

  const handleSaveSettings = () => {
    try {
      setSavingSettings(true);

      saveSettings(settings);

      alert("Settings saved successfully.");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // =========================================================
  // RESET SETTINGS
  // =========================================================

  const handleResetSettings = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset all settings to default?"
    );

    if (!confirmed) return;

    setSettings({
      ...DEFAULT_SETTINGS,
    });

    saveSettings({
      ...DEFAULT_SETTINGS,
    });

    alert("Settings have been reset to default.");
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-6xl">

          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">

              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>

              <p className="text-sm text-gray-500">
                Loading settings...
              </p>

            </div>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">

      <div className="mx-auto max-w-6xl">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-8">

          <h1 className="text-2xl font-bold text-gray-900">
            Settings
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage your SmartAttend system and administrator
            account.
          </p>

        </div>

        {/* =====================================================
            ADMINISTRATOR ACCOUNT
        ====================================================== */}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <h2 className="text-lg font-semibold text-gray-900">
              Administrator Account
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Update your administrator information and
              profile picture.
            </p>

          </div>

          <form
            onSubmit={handleSaveAccount}
            className="p-6"
          >

            {/* =================================================
                PROFILE PICTURE
            ================================================== */}

            <div className="mb-8">

              <label className="mb-4 block text-sm font-semibold text-gray-700">
                Profile Picture
              </label>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

                {/* PROFILE PREVIEW */}

                <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-gray-100 bg-blue-50 shadow-sm">

                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Administrator Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-blue-600">
                      {adminName
                        ? adminName
                            .charAt(0)
                            .toUpperCase()
                        : "A"}
                    </span>
                  )}

                </div>

                {/* PICTURE BUTTONS */}

                <div>

                  <div className="flex flex-wrap gap-3">

                    {/* UPLOAD / CHANGE */}

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">

                      {profilePicture ? (
                        <FiCamera size={17} />
                      ) : (
                        <FiUpload size={17} />
                      )}

                      {profilePicture
                        ? "Change Picture"
                        : "Upload Picture"}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={
                          handleProfilePictureChange
                        }
                      />

                    </label>

                    {/* REMOVE */}

                    {profilePicture && (
                      <button
                        type="button"
                        onClick={handleRemovePicture}
                        className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <FiTrash2 size={17} />
                        Remove
                      </button>
                    )}

                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    JPG, PNG or WebP. Maximum size: 2MB.
                  </p>

                </div>

              </div>

            </div>

            {/* =================================================
                NAME
            ================================================== */}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Administrator Name
                </label>

                <input
                  type="text"
                  value={adminName}
                  onChange={(e) =>
                    setAdminName(e.target.value)
                  }
                  placeholder="Enter administrator name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />

              </div>

              {/* EMAIL */}

              <div>

                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email Address
                </label>

                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) =>
                    setAdminEmail(e.target.value)
                  }
                  placeholder="Enter email address"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />

              </div>

            </div>

            {/* =================================================
                PASSWORD
            ================================================== */}

            <div className="mt-8 border-t border-gray-100 pt-6">

              <h3 className="mb-1 text-sm font-semibold text-gray-900">
                Change Password
              </h3>

              <p className="mb-5 text-xs text-gray-500">
                Leave these fields empty if you don't want to
                change your password.
              </p>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Current Password
                  </label>

                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) =>
                      setCurrentPassword(e.target.value)
                    }
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    New Password
                  </label>

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

              </div>

            </div>

            {/* =================================================
                SAVE ACCOUNT
            ================================================== */}

            <div className="mt-8 flex justify-end border-t border-gray-100 pt-6">

              <button
                type="submit"
                disabled={savingAccount}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                <FiSave size={17} />

                {savingAccount
                  ? "Saving..."
                  : "Save Account"}

              </button>

            </div>

          </form>

        </div>

        {/* =====================================================
            FACE RECOGNITION SETTINGS
        ====================================================== */}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <h2 className="text-lg font-semibold text-gray-900">
              Face Recognition
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Configure automatic face recognition and
              attendance behavior.
            </p>

          </div>

          <div className="divide-y divide-gray-100">

            {/* FACE RECOGNITION */}

            <div className="flex items-center justify-between px-6 py-5">

              <div>

                <p className="text-sm font-semibold text-gray-900">
                  Face Recognition
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Enable AI face recognition.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  updateSetting(
                    "faceRecognition",
                    !settings.faceRecognition
                  )
                }
                className={`relative h-6 w-11 rounded-full transition ${
                  settings.faceRecognition
                    ? "bg-blue-600"
                    : "bg-gray-300"
                }`}
              >

                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                    settings.faceRecognition
                      ? "left-6"
                      : "left-1"
                  }`}
                />

              </button>

            </div>

            {/* AUTOMATIC ATTENDANCE */}

            <div className="flex items-center justify-between px-6 py-5">

              <div>

                <p className="text-sm font-semibold text-gray-900">
                  Automatic Attendance
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Automatically mark recognized students
                  present.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  updateSetting(
                    "autoAttendance",
                    !settings.autoAttendance
                  )
                }
                className={`relative h-6 w-11 rounded-full transition ${
                  settings.autoAttendance
                    ? "bg-blue-600"
                    : "bg-gray-300"
                }`}
              >

                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                    settings.autoAttendance
                      ? "left-6"
                      : "left-1"
                  }`}
                />

              </button>

            </div>

            {/* DAILY ATTENDANCE */}

            <div className="flex items-center justify-between px-6 py-5">

              <div>

                <p className="text-sm font-semibold text-gray-900">
                  Daily Attendance
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Enable daily attendance tracking.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  updateSetting(
                    "dailyAttendance",
                    !settings.dailyAttendance
                  )
                }
                className={`relative h-6 w-11 rounded-full transition ${
                  settings.dailyAttendance
                    ? "bg-blue-600"
                    : "bg-gray-300"
                }`}
              >

                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                    settings.dailyAttendance
                      ? "left-6"
                      : "left-1"
                  }`}
                />

              </button>

            </div>

            {/* ATTENDANCE TIME */}

            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-semibold text-gray-900">
                  Attendance Time
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Default daily attendance time.
                </p>

              </div>

              <input
                type="time"
                value={
                  settings.attendanceTime || "09:00"
                }
                onChange={(e) =>
                  updateSetting(
                    "attendanceTime",
                    e.target.value
                  )
                }
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </div>

        </div>

        {/* =====================================================
            NOTIFICATIONS
        ====================================================== */}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="flex items-center justify-between px-6 py-5">

            <div>

              <h2 className="text-lg font-semibold text-gray-900">
                Notifications
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Receive SmartAttend notifications.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                updateSetting(
                  "notifications",
                  !settings.notifications
                )
              }
              className={`relative h-6 w-11 rounded-full transition ${
                settings.notifications
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >

              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                  settings.notifications
                    ? "left-6"
                    : "left-1"
                }`}
              />

            </button>

          </div>

        </div>

        {/* =====================================================
            SETTINGS ACTIONS
        ====================================================== */}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={handleResetSettings}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >

            <FiRefreshCw size={17} />

            Reset Settings

          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >

            <FiSave size={17} />

            {savingSettings
              ? "Saving..."
              : "Save Settings"}

          </button>

        </div>

      </div>

    </div>
  );
};

export default Settings;