import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Configure how notifications appear when the app is in the foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permissions and registers the Expo Push Token
 * in the user's Firestore document.
 *
 * Should be called once after the user is authenticated.
 *
 * @param userId - Firebase Auth UID
 */
export async function registerForPushNotifications(
  userId: string
): Promise<void> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permissions not granted.");
      return;
    }

    // Get the Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "0129cf91-ea19-46f3-86f8-e5bb93391d54",
    });
    const expoPushToken = tokenData.data;

    console.log("Expo Push Token:", expoPushToken);

    // Save the token to Firestore
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      expoPushToken: expoPushToken,
    });

    // Set up Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4A90E2",
      });
    }
  } catch (error) {
    console.error("Error registering for push notifications:", error);
  }
}
