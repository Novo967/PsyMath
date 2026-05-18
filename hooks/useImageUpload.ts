import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useState } from "react";
import { Alert, Platform } from "react-native";
import { storage } from "../firebaseConfig";

/**
 * Reusable hook for picking an image from the device and uploading it
 * to Firebase Storage. Returns the download URL on success.
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Request media library permissions (needed on iOS).
   */
  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "הרשאה נדרשת",
          "יש לאשר גישה לגלריה כדי להעלות תמונות."
        );
        return false;
      }
    }
    return true;
  };

  /**
   * Open the device image picker, upload the selected image to Firebase Storage,
   * and return the download URL.
   *
   * @param storagePath - The full path in Storage (e.g. "questions/default_institute/img_123.jpg")
   * @returns The download URL string, or null if the user cancelled.
   */
  const pickAndUpload = async (
    storagePath: string
  ): Promise<string | null> => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    const uri = result.assets[0].uri;
    return await uploadImage(uri, storagePath);
  };

  /**
   * Upload a local image URI to Firebase Storage and return the download URL.
   */
  const uploadImage = async (
    localUri: string,
    storagePath: string
  ): Promise<string | null> => {
    setUploading(true);
    setProgress(0);

    try {
      // Convert URI to blob
      const response = await fetch(localUri);
      const blob = await response.blob();

      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      return await new Promise<string | null>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            setProgress(pct);
          },
          (error) => {
            console.error("Upload error:", error);
            Alert.alert("שגיאה", "העלאת התמונה נכשלה. נסה שוב.");
            setUploading(false);
            resolve(null);
          },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setUploading(false);
            setProgress(100);
            resolve(downloadUrl);
          }
        );
      });
    } catch (error) {
      console.error("Image upload error:", error);
      Alert.alert("שגיאה", "העלאת התמונה נכשלה.");
      setUploading(false);
      return null;
    }
  };

  return { pickAndUpload, uploading, progress };
}
