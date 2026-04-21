import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Platform } from 'react-native';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // הגדרת Google Sign-In כשהמסך נטען
  useEffect(() => {
    GoogleSignin.configure({
      // הדבק כאן את ה-Web Client ID שהעתקת מפיירבייס!
      webClientId: '493324822355-7hd2is082s1oqv8mjkuk6t1krbsvsv0a.apps.googleusercontent.com',
    });
  }, []);

  // פונקציית עזר: יצירת/עדכון מסמך משתמש ב-Firestore
  // שומר על מודל ה-Freemium שתכננו
  const createUserDocument = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    // יוצר מסמך רק אם המשתמש לא קיים (כדי לא לדרוס נתוני מנוי קיימים בהתחברות חוזרת)
    if (!docSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || '',
        isPremium: false, // ברירת מחדל: משתמש חינמי
        questionsSolvedToday: 0,
        dailyLimit: 10, // ההגבלה שביקשת
        lastQuestionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  };

  // 1. הרשמה קלאסית: אימייל וסיסמה
  const handleEmailSignUp = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'אנא מלא אימייל וסיסמה');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument(userCredential.user);
      Alert.alert('בהצלחה!', 'החשבון נוצר בהצלחה.');
      // navigation.navigate('Home'); // בעתיד תעביר למסך הבית
    } catch (error: any) {
      Alert.alert('שגיאת הרשמה', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. הרשמה/התחברות מהירה דרך גוגל
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // מוודא ששירותי גוגל זמינים
      await GoogleSignin.hasPlayServices();
      
      // מקבל את אישור ההתחברות מגוגל
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) throw new Error('No ID token found');

      // מחבר את אישור הגוגל לפיירבייס שלנו
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);

      // שומר את נתוני המנוי ב-Firestore
      await createUserDocument(userCredential.user);

      Alert.alert('בהצלחה!', 'התחברת בהצלחה עם Google!');
      // navigation.navigate('Home');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו להתחבר דרך גוגל.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>ברוך הבא ל-PsyMath</Text>
          <Text style={styles.subtitle}>התחל את ההכנה שלך עכשיו</Text>
        </View>

        <View style={styles.form}>
          {/* הרשמה עם גוגל */}
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleSignIn} 
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#333" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.googleButtonText}>המשך עם Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* מפריד */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>או</Text>
            <View style={styles.divider} />
          </View>

          {/* הרשמה עם אימייל */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#718096" style={styles.icon} />
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
            <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="סיסמה (לפחות 6 תווים)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              textAlign="right"
            />
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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#2D3748', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096' },
  form: { gap: 16 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  divider: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 15, color: '#A0AEC0', fontSize: 14 },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  icon: { marginLeft: 12 },
  input: { flex: 1, fontSize: 16, color: '#2D3748' },
  submitButton: {
    backgroundColor: '#4A90E2',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});