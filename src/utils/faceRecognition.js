import * as faceapi from "@vladmandic/face-api";

let modelsLoaded = false;

// Load face-api models
export const loadFaceModels = async () => {
  if (modelsLoaded) return;

  try {
    console.log("Loading face recognition models...");

    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

    modelsLoaded = true;

    console.log("Face recognition models loaded successfully");
  } catch (error) {
    console.error("Failed to load face recognition models:", error);
    throw error;
  }
};

// Detect one face and generate its descriptor
export const getFaceDetection = async (image) => {
  await loadFaceModels();

  const detection = await faceapi
    .detectSingleFace(
      image,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.15,
      })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
};

// Get only the face descriptor
export const getFaceDescriptor = async (image) => {
  const detection = await getFaceDetection(image);

  if (!detection) {
    throw new Error("No face detected");
  }

  return detection.descriptor;
};

// Find the closest matching student
export const findMatchingStudent = async (descriptor, students) => {
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const student of students) {
    if (!student.faceId) continue;

    try {
      const storedDescriptor = JSON.parse(student.faceId);

      if (!Array.isArray(storedDescriptor)) continue;

      if (storedDescriptor.length !== descriptor.length) {
        continue;
      }

      const distance = faceapi.euclideanDistance(
        descriptor,
        storedDescriptor
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = student;
      }
    } catch (error) {
      console.error(
        `Invalid faceId for ${student.name}:`,
        error
      );
    }
  }

  // Face matching threshold
  const MATCH_THRESHOLD = 0.5;

  if (!bestMatch || bestDistance >= MATCH_THRESHOLD) {
    return null;
  }

  return {
    student: bestMatch,
    distance: bestDistance,
  };
}; 