import * as faceapi from "@vladmandic/face-api";

let modelsLoaded = false;

// ======================================================
// LOAD MODELS
// ======================================================
export const loadFaceModels = async () => {
  if (modelsLoaded) {
    return;
  }

  try {
    console.log(
      "Loading face recognition models..."
    );

    await faceapi.nets.tinyFaceDetector.loadFromUri(
      "/models"
    );

    await faceapi.nets.faceLandmark68Net.loadFromUri(
      "/models"
    );

    await faceapi.nets.faceRecognitionNet.loadFromUri(
      "/models"
    );

    modelsLoaded = true;

    console.log(
      "Face recognition models loaded successfully"
    );
  } catch (error) {
    console.error(
      "Failed to load face recognition models:",
      error
    );

    throw error;
  }
};

// ======================================================
// GET FACE DESCRIPTOR
// ======================================================
export const getFaceDescriptor = async (
  image
) => {
  await loadFaceModels();

  console.log(
    "Starting face detection..."
  );

  const detection =
    await faceapi
      .detectSingleFace(
        image,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.2,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

  console.log(
    "Detection result:",
    detection
  );

  if (!detection) {
    throw new Error(
      "No face detected"
    );
  }

  console.log(
    "Face detected successfully"
  );

  console.log(
    "Descriptor length:",
    detection.descriptor.length
  );

  return detection.descriptor;
};

// ======================================================
// FIND MATCHING STUDENT
// ======================================================
export const findMatchingStudent = async (
  descriptor,
  students
) => {
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const student of students) {
    if (!student.faceId) {
      continue;
    }

    try {
      const storedDescriptor =
        JSON.parse(student.faceId);

      if (
        !Array.isArray(
          storedDescriptor
        ) ||
        storedDescriptor.length !==
          descriptor.length
      ) {
        console.warn(
          `Invalid descriptor length for ${student.name}`
        );

        continue;
      }

      const distance =
        faceapi.euclideanDistance(
          descriptor,
          storedDescriptor
        );

      console.log(
        `Face distance for ${student.name}:`,
        distance
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

  const MATCH_THRESHOLD = 0.5;

  console.log(
    "Best match:",
    bestMatch?.name || "None"
  );

  console.log(
    "Best distance:",
    bestDistance
  );

  console.log(
    "Match threshold:",
    MATCH_THRESHOLD
  );

  if (
    !bestMatch ||
    bestDistance >= MATCH_THRESHOLD
  ) {
    console.log(
      "❌ Face rejected - no reliable match"
    );

    return null;
  }

  console.log(
    "✅ Face accepted:",
    bestMatch.name
  );

  console.log(
    "Distance:",
    bestDistance
  );

  return {
    student: bestMatch,
    distance: bestDistance,
  };
};