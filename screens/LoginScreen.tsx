import { Ionicons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContexts";
import { auth, db } from "../firebaseConfig";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "493324822355-7hd2is082s1oqv8mjkuk6t1krbsvsv0a.apps.googleusercontent.com",
    });
  }, []);

  // פונקציה לוודא שלמשתמש יש מסמך ב-Firestore עם שיוך למכון
  const checkUserDocument = async (user: any) => {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // יצירת מסמך חדש למשתמש (נפוץ בכניסה ראשונה דרך גוגל)
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || "",
        instituteId: "default_institute", // שיוך למכון ברירת מחדל
        isPremium: false,
        questionsSolvedToday: 0,
        dailyLimit: 10,
        lastQuestionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("שגיאה", "אנא מלא את כל השדות");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await checkUserDocument(userCredential.user);
      // הניווט יתבצע אוטומטית דרך onAuthStateChanged ב-App.tsx
    } catch (error: any) {
      let errorMessage = "חלה שגיאה בהתחברות";
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        errorMessage = "אימייל או סיסמה שגויים";
      }
      Alert.alert("שגיאה", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error("No ID token found");

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      await checkUserDocument(userCredential.user);
    } catch (error: any) {
      Alert.alert("שגיאה", "התחברות עם גוגל נכשלה");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>התחברות</Text>
              <Text style={styles.subtitle}>טוב לראות אותך שוב!</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.textSecondary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="אימייל"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
              </View>

              <View style={styles.inputContainer}>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="סיסמה"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textAlign="right"
                />
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.textLight} />
                ) : (
                  <Text style={styles.loginButtonText}>התחבר</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>או התחבר עם</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color={theme.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#4181ef" />
                    <Text style={styles.googleButtonText}>Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signUpLink}
                onPress={() => navigation.navigate("SignUp")}
              >
                <Text style={{ color: theme.textSecondary }}>
                  עדיין אין לך חשבון?{" "}
                </Text>
                <Text style={{ color: theme.primaryColor, fontWeight: "bold" }}>
                  הירשם כאן
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.cardBackground },
    scrollContainer: { flexGrow: 1, padding: 24, justifyContent: "center" },
    header: { alignItems: "center", marginBottom: 40 },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: theme.textPrimary,
      marginBottom: 8,
    },
    subtitle: { fontSize: 18, color: theme.textSecondary },
    form: { gap: 20 },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      paddingHorizontal: 16,
      height: 60,
    },
    input: {
      flex: 1,
      paddingHorizontal: 12,
      fontSize: 16,
      color: theme.textPrimary,
      textAlign: "right",
    },
    loginButton: {
      backgroundColor: theme.primaryColor,
      height: 60,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.primaryColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    loginButtonText: {
      color: theme.textLight,
      fontSize: 18,
      fontWeight: "700",
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 10,
    },
    divider: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
    dividerText: {
      marginHorizontal: 10,
      color: theme.textSecondary,
      fontSize: 14,
    },
    googleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 60,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      gap: 12,
    },
    googleButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.textPrimary,
    },
    signUpLink: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 10,
    },
  });
