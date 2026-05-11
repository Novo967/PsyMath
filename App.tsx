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
import { auth, db } from "./firebaseConfig";

// Video & Splash imports
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as SplashScreen from "expo-splash-screen";

// Theme & Screens
import { ThemeProvider, useTheme } from "./contexts/ThemeContexts"; // תיקון הנתיב
import ChapterScreen from "./screens/ChapterScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import PracticeScreen from "./screens/PracticeScreen";
import SignUpScreen from "./screens/SignUpScreen";
import SimulationResultsScreen from "./screens/SimulationResultsScreen";
import SimulationScreen from "./screens/SimulationScreen";
import StatisticsScreen from "./screens/StatisticsScreen";
import StudyMaterialsScreen from "./screens/StudyMaterialsScreen";

// עצירת הספלאש הנייטיבי
SplashScreen.preventAutoHideAsync();

export type RootStackParamList = {
  Home: undefined;
  StudyMaterials: undefined;
  Practice: undefined;
  Simulation: undefined;
  Statistics: undefined;
  SignUp: undefined;
  Login: undefined;
  SimulationResultsScreen: any;
  ChapterScreen: any;
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

// --- קומפוננטת הניווט הפנימית (יכולה להשתמש ב-useTheme) ---
function AppNavigator({ user }: { user: User | null }) {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerShown: Platform.OS === "ios",
          headerStyle: { backgroundColor: theme.backgroundColor }, // צבע הדר דינמי!
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
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Text style={{ color: theme.textLight, fontSize: 17 }}>
                    חזור
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.textLight}
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
            <Stack.Screen name="Home" component={HomeScreen} />
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

// --- קומפוננטת הניהול המרכזית (לוגיקה ואותנטיקציה) ---
function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [storeUrls, setStoreUrls] = useState({ ios: "", android: "" });

  const { setTheme } = useTheme();

  // בדיקת גרסה
  useEffect(() => {
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
        console.error(error);
      }
    };
    checkAppVersion();
  }, []);

  // ניהול התחברות וטעינת Theme מה-Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (
        currentUser &&
        (currentUser.providerData.some((p) => p.providerId !== "password") ||
          currentUser.emailVerified)
      ) {
        setUser(currentUser);

        // משיכת ה-Theme הממותג של המכון
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const instId = userDoc.data().instituteId || "default_institute";
            const instDoc = await getDoc(doc(db, "institutes", instId));
            if (instDoc.exists() && instDoc.data().theme) {
              setTheme(instDoc.data().theme); // הפעלת ה-Theme הדינמי!
            }
          }
        } catch (e) {
          console.log("Theme load error:", e);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      SplashScreen.hideAsync();
      if (status.didJustFinish) setIsVideoFinished(true);
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
          כדי להמשיך, חובה לעדכן לגרסה החדשה.
        </Text>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => {
            const url =
              Platform.OS === "ios" ? storeUrls.ios : storeUrls.android;
            url ? Linking.openURL(url) : Alert.alert("שגיאה", "קישור לא זמין.");
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

  return <AppNavigator user={user} />;
}

// --- הקומפוננטה הראשית שעוטפת הכל ב-ThemeProvider ---
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
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
  },
  updateSubtitle: {
    fontSize: 16,
    color: "#718096",
    textAlign: "center",
    marginBottom: 32,
  },
  updateButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  updateButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
