const DEFAULT_SETTINGS = {
  faceRecognition: true,
  notifications: true,
  autoAttendance: true,
  dailyAttendance: true,
  attendanceTime: "09:00",
};

export const getSettings = () => {
  try {
    const savedSettings = localStorage.getItem(
      "smartAttendSettings"
    );

    if (!savedSettings) {
      return DEFAULT_SETTINGS;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(savedSettings),
    };
  } catch (error) {
    console.error("Failed to load SmartAttend settings:", error);

    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings) => {
  localStorage.setItem(
    "smartAttendSettings",
    JSON.stringify(settings)
  );
};

export { DEFAULT_SETTINGS };
