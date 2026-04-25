import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import React, { useState } from "react";
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
import { auth } from "../firebaseConfig";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("שגיאה", "אנא מלא אימייל וסיסמה");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        await signOut(auth);
        Alert.alert(
          "המייל טרם אומת",
          "אנא אמת את כתובת המייל שלך לפני ההתחברות. אם אינך רואה את המייל, בדוק בתיקיית דואר הזבל (Spam/Junk).",
        );
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        Alert.alert("שגיאה", "אימייל או סיסמה לא נכונים");
      } else {
        Alert.alert("שגיאה", "לא הצלחנו להתחבר, נסה שוב מאוחר יותר");
      }
    } finally {
      setIsLoading(false);
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
              <Text style={styles.title}>שלום שוב!</Text>
              <Text style={styles.subtitle}>התחבר כדי להמשיך ללמוד לכמותי</Text>
            </View>

            <View style={styles.form}>
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
                  placeholder="סיסמה"
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

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleEmailLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitButtonText}>התחברות</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkContainer}
                onPress={() => navigation.navigate("SignUp")}
              >
                <Text style={styles.linkText}>אין לך חשבון? הרשם עכשיו</Text>
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
  },
  header: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 28, fontWeight: "800", color: "#2D3748", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#718096" },
  form: { gap: 16 },
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
    elevation: 4,
  },
  submitButtonText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  linkContainer: { marginTop: 15, alignItems: "center" },
  linkText: { color: "#4A90E2", fontSize: 16, fontWeight: "600" },
});
