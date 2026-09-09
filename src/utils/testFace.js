import { getFaceDescriptor } from "./faceRecognition";

export const testFace = async (imageUrl) => {
  try {
    const descriptor = await getFaceDescriptor(imageUrl);

    console.log("Face descriptor generated:", descriptor);
    console.log("Descriptor length:", descriptor.length);

    return descriptor;
  } catch (error) {
    console.error("Face descriptor test failed:", error);
  }
};