import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Application from "expo-application";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
// --- RevenueCat Import ---
import Purchases from "react-native-purchases";

import { auth, db } from "./firebaseConfig";

// Video & Splash imports
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as SplashScreen from "expo-splash-screen";

// Import Screens
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import PaywallScreen from "./screens/PaywallScreen"; // הייבוא החדש
import PracticeScreen from "./screens/PracticeScreen";
import SignUpScreen from "./screens/SignUpScreen";
import SimulationResultsScreen from "./screens/SimulationResultsScreen";
import SimulationScreen from "./screens/SimulationScreen";
import StatisticsScreen from "./screens/StatisticsScreen";
import StudyMaterialsScreen from "./screens/StudyMaterialsScreen";

// עצירת הספלאש הנייטיבי מלהיעלם אוטומטית
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// פונקציית עזר לבדיקה אם הגרסה הנוכחית קטנה מהגרסה המינימלית
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

  // סטייטים חדשים למערכת החסימה
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [storeUrls, setStoreUrls] = useState({ ios: "", android: "" });

  // אתחול RevenueCat ובדיקת גרסת אפליקציה מול פיירבייס
  useEffect(() => {
    // 1. אתחול RevenueCat מיד כשהאפליקציה עולה
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

    // 2. בדיקת גרסת אפליקציה מול פיירבייס
    const checkAppVersion = async () => {
      try {
        const docRef = doc(db, "appConfig", "versionControl");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const minVersion =
            Platform.OS === "ios" ? data.minVersionIos : data.minVersionAndroid;
          // שליפת הגרסה האמיתית של המכשיר (ברירת מחדל 1.0.0 אם לא נמצא)
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

  // האזנה לסטטוס התחברות
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const isEmailProvider = currentUser.providerData.some(
          (provider) => provider.providerId === "password",
        );

        if (isEmailProvider && !currentUser.emailVerified) {
          setUser(null);
        } else {
          setUser(currentUser);

          try {
            await Purchases.logIn(currentUser.uid);
          } catch (error) {
            console.error("Error logging in to RevenueCat:", error);
          }
        }
      } else {
        setUser(null);

        try {
          await Purchases.logOut();
        } catch (error) {
          console.error("Error logging out of RevenueCat:", error);
        }
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);
  // מאזין לשינויים בסטטוס המנוי ברקע (למשל מיד אחרי רכישה מוצלחת)
  // מאזין לשינויים בסטטוס המנוי ברקע
  useEffect(() => {
    // 1. מגדירים את פונקציית המאזין
    const customerInfoUpdateListener = (info: any) => {
      console.log("Customer Info updated in background:", info);
    };

    // 2. רושמים את המאזין
    Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);

    // 3. מסירים אותו בסגירה בעזרת הפקודה הייעודית
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
            if (url) {
              Linking.openURL(url);
            } else {
              Alert.alert("שגיאה", "קישור לחנות עדיין לא זמין.");
            }
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
                      fontSize: 16,
                      fontWeight: "500",
                      marginRight: 4,
                    }}
                  >
                    חזור
                  </Text>
                  <Ionicons name="chevron-forward" size={22} color="#007AFF" />
                </TouchableOpacity>
              );
            }
            return null;
          },
        })}
      >
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="StudyMaterials"
              component={StudyMaterialsScreen}
            />
            <Stack.Screen name="Practice" component={PracticeScreen} />
            <Stack.Screen name="Simulation" component={SimulationScreen} />
            <Stack.Screen name="Statistics" component={StatisticsScreen} />
            <Stack.Screen
              name="SimulationResultsScreen"
              component={SimulationResultsScreen}
              options={{ title: "תוצאות המבחן" }}
            />
            {/* מסך ה-Paywall החדש שלנו מוגדר כאן: */}
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{
                presentation: "modal", // גורם למסך להחליק מלמטה (כמו פופ-אפ)
                headerShown: false, // מסתיר את שורת הכותרת כדי שה-Paywall יתפוס את כל המסך
              }}
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
  updateButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
