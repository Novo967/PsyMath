import { Ionicons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithCredential,
  signOut,
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
import { auth, db } from "../firebaseConfig";

export default function SignUpScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "493324822355-7hd2is082s1oqv8mjkuk6t1krbsvsv0a.apps.googleusercontent.com",
    });
  }, []);

  const createUserDocument = async (user: any) => {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || "",
        isPremium: false,
        questionsSolvedToday: 0,
        dailyLimit: 10,
        lastQuestionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("שגיאה", "אנא מלא את כל השדות");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("שגיאה", "הסיסמאות אינן תואמות");
      return;
    }

    setIsLoading(true);
    let userCreated = false;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      userCreated = true;

      await sendEmailVerification(userCredential.user);
      await createUserDocument(userCredential.user);

      Alert.alert(
        "החשבון נוצר בהצלחה!",
        "שלחנו לך קישור לאימות לכתובת האימייל שהזנת. אנא אמת את החשבון כדי להמשיך.\n\nשים לב: אם אינך רואה את המייל, אנא בדוק בתיקיית דואר הזבל (Spam / Junk).",
        [
          {
            text: "הבנתי",
            onPress: () => navigation.navigate("Login" as never),
          },
        ],
      );
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert(
          "שגיאה",
          "המייל הזה כבר רשום במערכת. לחץ על הקישור למטה כדי להתחבר.",
        );
      } else {
        Alert.alert("שגיאת הרשמה", error.message);
      }
    } finally {
      if (userCreated) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.log("Error signing out:", signOutError);
        }
      }
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

      await createUserDocument(userCredential.user);
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      Alert.alert("שגיאה", "לא הצלחנו להתחבר דרך גוגל.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title}>ברוך הבא לכמותי</Text>
              <Text style={styles.subtitle}>נתחיל להתכונן?</Text>
            </View>

            <View style={styles.form}>
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color="#333" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#4181ef" />
                    <Text style={styles.googleButtonText}>המשך עם Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>או</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#718096"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="אימייל"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  textAlign="right"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#718096"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="סיסמה (לפחות 6 תווים)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  textAlign="right"
                />
                <TouchableOpacity
                  style={styles.eyeIconContainer}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#718096"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#718096"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="אימות סיסמה"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  textAlign="right"
                />
                <TouchableOpacity
                  style={styles.eyeIconContainer}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-outline" : "eye-off-outline"
                    }
                    size={20}
                    color="#718096"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleEmailSignUp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>הרשמה עם אימייל</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginLinkContainer}
                onPress={() => navigation.navigate("Login" as never)}
              >
                <Text style={styles.loginLinkText}>
                  כבר יש לך חשבון? התחבר כאן
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  keyboardAvoidingView: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingBottom: 40,
  },
  header: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 28, fontWeight: "800", color: "#2D3748", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#718096" },
  form: { gap: 16 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: { fontSize: 16, fontWeight: "600", color: "#2D3748" },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { marginHorizontal: 15, color: "#A0AEC0", fontSize: 14 },
  inputContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  icon: { marginLeft: 12 },
  input: { flex: 1, fontSize: 16, color: "#2D3748" },
  eyeIconContainer: { padding: 5 },
  submitButton: {
    backgroundColor: "#4A90E2",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  loginLinkContainer: {
    marginTop: 15,
    alignItems: "center",
  },
  loginLinkText: {
    color: "#4A90E2",
    fontSize: 16,
    fontWeight: "600",
  },
});
