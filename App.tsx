import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Application from "expo-application";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as SplashScreen from "expo-splash-screen";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases from "react-native-purchases";

import { auth, db } from "./firebaseConfig";

// Import Screens
import ChapterScreen from "./screens/ChapterScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import PaywallScreen from "./screens/PaywallScreen";
import PracticeScreen from "./screens/PracticeScreen";
import SignUpScreen from "./screens/SignUpScreen";
import SimulationResultsScreen from "./screens/SimulationResultsScreen";
import SimulationScreen from "./screens/SimulationScreen";
import StatisticsScreen from "./screens/StatisticsScreen";
import StudyMaterialsScreen from "./screens/StudyMaterialsScreen";

SplashScreen.preventAutoHideAsync();

export type RootStackParamList = {
  Home: undefined;
  StudyMaterials: undefined;
  Practice: undefined;
  Simulation: undefined;
  Statistics: undefined;
  SignUp: undefined;
  Login: undefined;
  SimulationResultsScreen: undefined;
  Paywall: undefined;
  ChapterScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const isVersionOlder = (currentVersion: string, minVersion: string) => {
  const v1 = currentVersion.split(".").map(Number);
  const v2 = minVersion.split(".").map(Number);
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 < num2) return true;
    if (num1 > num2) return false;
  }
  return false;
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [storeUrls, setStoreUrls] = useState({ ios: "", android: "" });

  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        if (Platform.OS === "android") {
          Purchases.configure({ apiKey: "goog_pgdcjCSnrMDfVqjdSVmzFEbwMRq" });
        } else if (Platform.OS === "ios") {
          Purchases.configure({ apiKey: "appl_HZOpQCaEjCsxuzwpXpOJwxzDHMO" });
        }
      } catch (error) {
        console.error("Error initializing RevenueCat:", error);
      }
    };

    const checkAppVersion = async () => {
      try {
        const docRef = doc(db, "appConfig", "versionControl");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const minVersion =
            Platform.OS === "ios" ? data.minVersionIos : data.minVersionAndroid;
          const currentVersion =
            Application.nativeApplicationVersion || "1.0.0";

          if (minVersion && isVersionOlder(currentVersion, minVersion)) {
            setIsUpdateRequired(true);
            setStoreUrls({
              ios: data.storeUrlIos || "",
              android: data.storeUrlAndroid || "",
            });
          }
        }
      } catch (error) {
        console.error("Error checking app version:", error);
      }
    };

    initRevenueCat();
    checkAppVersion();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const isEmailProvider = currentUser.providerData.some(
          (provider) => provider.providerId === "password",
        );

        if (isEmailProvider && !currentUser.emailVerified) {
          setUser(null);
          setIsLoading(false);
        } else {
          // --- התחלת לוגיקת מעקב החלפת מכשירים עם איפוס חודשי ---
          try {
            let localDeviceId = await AsyncStorage.getItem("deviceId");
            if (!localDeviceId) {
              localDeviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              await AsyncStorage.setItem("deviceId", localDeviceId);
            }

            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data();
              const lastDeviceId = userData.lastDeviceId;
              let deviceChangeCount = userData.deviceChangeCount || 0;
              const lastDeviceResetMonth = userData.lastDeviceResetMonth;

              // שליפת החודש הנוכחי בפורמט YYYY-MM (למשל: "2026-05")
              const currentMonthStr = new Date().toISOString().slice(0, 7);

              let updatePayload: any = {};
              let requiresDbUpdate = false;

              // 1. בדיקת איפוס חודשי (Lazy Reset)
              if (lastDeviceResetMonth !== currentMonthStr) {
                deviceChangeCount = 0; // מאפסים את המונה לוקאלית להמשך הבדיקה
                updatePayload.deviceChangeCount = 0;
                updatePayload.lastDeviceResetMonth = currentMonthStr;
                requiresDbUpdate = true;
              }

              // 2. בדיקת המכשיר עצמו
              if (!lastDeviceId) {
                // משתמש ישן שעוד אין לו את השדות החדשים
                updatePayload.lastDeviceId = localDeviceId;
                updatePayload.deviceChangeCount = 0;
                updatePayload.lastDeviceResetMonth = currentMonthStr;
                await updateDoc(userRef, updatePayload);
              } else if (lastDeviceId !== localDeviceId) {
                // המזהה שונה - המשתמש החליף מכשיר!
                if (deviceChangeCount >= 6) {
                  // חסימה: עבר 3 החלפות בחודש הנוכחי
                  await signOut(auth);
                  Alert.alert(
                    "מגבלת החלפת מכשירים",
                    "הגעת למגבלת החלפת המכשירים המותרת לחשבון זה לחודש הנוכחי (3 פעמים). לא ניתן להתחבר ממכשיר זה. המונה יתאפס בתחילת החודש הבא.",
                  );
                  setUser(null);
                  setIsLoading(false);
                  return; // עוצר את התהליך
                } else {
                  // מאשר, מעלה את המונה ומודיע למשתמש
                  const newCount = deviceChangeCount + 1;
                  updatePayload.lastDeviceId = localDeviceId;
                  updatePayload.deviceChangeCount = newCount;
                  updatePayload.lastDeviceResetMonth = currentMonthStr;

                  await updateDoc(userRef, updatePayload);

                  const remaining = 6 - newCount;
                  Alert.alert(
                    "התחברות ממכשיר שונה",
                    `זיהינו התחברות ממכשיר שונה מזה שהתחברת אליו בפעם הקודמת. שים לב שנותרו לך עוד ${remaining} החלפות מכשיר החודש.`,
                  );
                }
              } else if (requiresDbUpdate) {
                // זה אותו מכשיר בדיוק, אבל התחלף חודש אז צריך רק לשמור את האיפוס של המונה
                await updateDoc(userRef, updatePayload);
              }
            }
          } catch (error) {
            console.error("Device verification error:", error);
          }
          // --- סוף לוגיקת מעקב החלפת מכשירים ---

          setUser(currentUser);
          try {
            await Purchases.logIn(currentUser.uid);
          } catch (error) {
            console.error("Error logging in to RevenueCat:", error);
          }
          setIsLoading(false);
        }
      } else {
        setUser(null);
        try {
          await Purchases.logOut();
        } catch (error) {
          console.error("Error logging out of RevenueCat:", error);
        }
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const customerInfoUpdateListener = (info: any) => {
      console.log("Customer Info updated in background:", info);
    };
    Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoUpdateListener);
    };
  }, []);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      SplashScreen.hideAsync();
      if (status.didJustFinish) {
        setIsVideoFinished(true);
      }
    }
  };

  if (!isVideoFinished) {
    return (
      <View style={styles.splashContainer}>
        <Video
          style={{ width: 250, height: 250 }}
          source={require("./assets/splashscreen.mp4")}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={true}
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
      </View>
    );
  }

  if (isUpdateRequired) {
    return (
      <View style={styles.updateContainer}>
        <Ionicons
          name="cloud-download-outline"
          size={80}
          color="#4A90E2"
          style={{ marginBottom: 20 }}
        />
        <Text style={styles.updateTitle}>עדכון חשוב זמין!</Text>
        <Text style={styles.updateSubtitle}>
          כדי להמשיך להשתמש באפליקציה ולקבל את העדכונים החדשים ביותר, חובה לעדכן
          לגרסה החדשה.
        </Text>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => {
            const url =
              Platform.OS === "ios" ? storeUrls.ios : storeUrls.android;
            if (url) Linking.openURL(url);
            else Alert.alert("שגיאה", "קישור לחנות עדיין לא זמין.");
          }}
        >
          <Text style={styles.updateButtonText}>עדכן עכשיו</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerShown: Platform.OS === "ios",
          headerStyle: { backgroundColor: "#9dbde9" },
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => {
            if (Platform.OS === "ios" && navigation.canGoBack()) {
              return (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.0}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: "#007AFF",
                      fontSize: 17,
                      fontWeight: "400",
                    }}
                  >
                    חזור
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color="#007AFF"
                    style={{ marginLeft: 0 }}
                  />
                </TouchableOpacity>
              );
            }
            return null;
          },
        })}
      >
        {user ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="StudyMaterials"
              component={StudyMaterialsScreen}
            />
            <Stack.Screen name="Practice" component={PracticeScreen} />
            <Stack.Screen name="Simulation" component={SimulationScreen} />
            <Stack.Screen name="Statistics" component={StatisticsScreen} />
            <Stack.Screen name="ChapterScreen" component={ChapterScreen} />
            <Stack.Screen
              name="SimulationResultsScreen"
              component={SimulationResultsScreen}
              options={{ title: "תוצאות המבחן" }}
            />
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{ presentation: "modal", headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  updateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F8F9FA",
  },
  updateTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2D3748",
    marginBottom: 12,
    textAlign: "center",
  },
  updateSubtitle: {
    fontSize: 16,
    color: "#718096",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  updateButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
