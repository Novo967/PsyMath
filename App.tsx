import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "./firebaseConfig";

// Video & Splash imports
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import * as SplashScreen from "expo-splash-screen";

// Import Screens
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isVideoFinished, setIsVideoFinished] = useState(false); // סטייט חדש לוידאו

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // בודקים אם המשתמש נרשם עם אימייל וסיסמה
        const isEmailProvider = currentUser.providerData.some(
          (provider) => provider.providerId === "password",
        );

        // אם זה משתמש אימייל והוא עדיין לא מאומת, נתייחס אליו כאל מנותק
        if (isEmailProvider && !currentUser.emailVerified) {
          setUser(null);
        } else {
          // משתמש מאומת או משתמש שנכנס דרך גוגל
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // ניהול מצב הנגן של הוידאו
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      // ברגע שהוידאו נטען ומתחיל, מעלימים את הספלאש הנייטיבי השחור
      SplashScreen.hideAsync();

      // כשהוידאו מסתיים
      if (status.didJustFinish) {
        setIsVideoFinished(true);
      }
    }
  };

  // 1. תצוגת הספלאש וידאו (מוצג כל עוד הוידאו לא הסתיים)
  if (!isVideoFinished) {
    return (
      <View style={styles.splashContainer}>
        <Video
          style={{ width: 250, height: 250 }} // כאן קובעים את הגודל החדש
          source={require("./assets/splashscreen.mp4")}
          resizeMode={ResizeMode.CONTAIN} // שינוי ל-CONTAIN
          shouldPlay={true}
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        />
      </View>
    );
  }

  // 2. תצוגת טעינה של Firebase (מוצגת רק אם הוידאו הסתיים אבל עדיין אין תשובה מ-Firebase)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  // 3. תצוגת האפליקציה הרגילה
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          // השורה הזו עושה את כל ההבדל - מציגה באייפון ומסתירה באנדרואיד
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingRight: 10,
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
          // App Stack (Authenticated users)
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
          </>
        ) : (
          // Auth Stack (Guest users)
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
    justifyContent: "center", // מרכוז אנכי
    alignItems: "center", // מרכוז אופקי
  },
});
