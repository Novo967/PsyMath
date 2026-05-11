import { Ionicons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  sendEmailVerification,
  signInWithCredential,
  signOut,
  updateProfile,
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

export default function SignUpScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "493324822355-7hd2is082s1oqv8mjkuk6t1krbsvsv0a.apps.googleusercontent.com",
      iosClientId:
        "493324822355-sev2gl1gbn216thd3sa71k4s63lasv28.apps.googleusercontent.com",
    });
  }, []);

  // --- עדכון פונקציית יצירת המשתמש עם שיוך למכון ---
  const createUserDocument = async (user: any, fallbackName?: string) => {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || fallbackName || "",
        instituteId: "default_institute", // <-- שיוך אוטומטי למכון ברירת המחדל
        isPremium: false,
        questionsSolvedToday: 0,
        dailyLimit: 10,
        lastQuestionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleEmailSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("שגיאה", "אנא מלא את כל השדות (כולל שם פרטי)");
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

      await updateProfile(userCredential.user, { displayName: name });
      await sendEmailVerification(userCredential.user);
      await createUserDocument(userCredential.user, name);

      Alert.alert(
        "החשבון נוצר בהצלחה!",
        "שלחנו לך קישור לאימות לכתובת האימייל. אנא אמת את החשבון כדי להמשיך.",
        [
          {
            text: "הבנתי",
            onPress: () => navigation.navigate("Login" as never),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert("שגיאה", error.message);
    } finally {
      if (userCreated) {
        try {
          await signOut(auth);
        } catch (e) {}
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
      Alert.alert("שגיאה", "לא הצלחנו להתחבר דרך גוגל.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("No identity token");
      const provider = new OAuthProvider("apple.com");
      const authCredential = provider.credential({
        idToken: credential.identityToken,
      });
      const userCredential = await signInWithCredential(auth, authCredential);
      let fallbackName = "";
      if (credential.fullName) {
        fallbackName =
          `${credential.fullName.givenName || ""} ${credential.fullName.familyName || ""}`.trim();
      }
      await createUserDocument(userCredential.user, fallbackName);
    } catch (error: any) {
      if (error.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("שגיאה", "לא הצלחנו להתחבר דרך אפל.");
      }
    } finally {
      setIsAppleLoading(false);
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
              {Platform.OS === "ios" && (
                <View style={styles.appleButtonWrapper}>
                  {isAppleLoading ? (
                    <View
                      style={[
                        styles.googleButton,
                        { borderColor: theme.textPrimary },
                      ]}
                    >
                      <ActivityIndicator color={theme.textPrimary} />
                    </View>
                  ) : (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={
                        AppleAuthentication.AppleAuthenticationButtonType
                          .SIGN_IN
                      }
                      buttonStyle={
                        AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                      }
                      cornerRadius={12}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={isGoogleLoading || isAppleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color={theme.textPrimary} />
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
                  name="person-outline"
                  size={20}
                  color={theme.textSecondary}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="שם פרטי"
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                  placeholderTextColor={theme.textSecondary + "80"}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.textSecondary}
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
                  placeholderTextColor={theme.textSecondary + "80"}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.textSecondary}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="סיסמה (לפחות 6 תווים)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  textAlign="right"
                  placeholderTextColor={theme.textSecondary + "80"}
                />
                <TouchableOpacity
                  style={styles.eyeIconContainer}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={theme.textSecondary}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="אימות סיסמה"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  textAlign="right"
                  placeholderTextColor={theme.textSecondary + "80"}
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
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleEmailSignUp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.textLight} />
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

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.cardBackground },
    keyboardAvoidingView: { flex: 1 },
    scrollContainer: {
      flexGrow: 1,
      paddingHorizontal: 24,
      justifyContent: "center",
      paddingBottom: 40,
    },
    header: { alignItems: "center", marginBottom: 40 },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.textPrimary,
      marginBottom: 8,
    },
    subtitle: { fontSize: 16, color: theme.textSecondary },
    form: { gap: 16 },
    appleButtonWrapper: { width: "100%", height: 56 },
    appleButton: { width: "100%", height: "100%" },
    googleButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.cardBackground,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      gap: 10,
    },
    googleButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.textPrimary,
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 10,
    },
    divider: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
    dividerText: {
      marginHorizontal: 15,
      color: theme.textSecondary,
      fontSize: 14,
    },
    inputContainer: {
      flexDirection: "row-reverse",
      alignItems: "center",
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 56,
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    icon: { marginLeft: 12 },
    input: { flex: 1, fontSize: 16, color: theme.textPrimary },
    eyeIconContainer: { padding: 5 },
    submitButton: {
      backgroundColor: theme.primaryColor,
      height: 56,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 10,
      shadowColor: theme.primaryColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonText: {
      color: theme.textLight,
      fontSize: 18,
      fontWeight: "700",
    },
    loginLinkContainer: { marginTop: 15, alignItems: "center" },
    loginLinkText: {
      color: theme.primaryColor,
      fontSize: 16,
      fontWeight: "600",
    },
  });
