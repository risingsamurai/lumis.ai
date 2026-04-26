import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadDataset(userId: string, auditId: string, file: File) {
  if (!storage) {
    throw new Error("Firebase Storage is not configured. Add VITE_FIREBASE_* values to .env.");
  }
  const fileRef = ref(storage, `datasets/${userId}/${auditId}/original.csv`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
