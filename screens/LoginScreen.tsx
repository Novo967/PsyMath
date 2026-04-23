import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '493324822355-7hd2is082s1oqv8mjkuk6t1krbsvsv0a.apps.googleusercontent.com',
    });
  }, []);

  // פונקציה לבדיקת/יצירת מסמך משתמש (חשוב גם בהתחברות עם גוגל)
  const checkUserDocument = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || '',
        isPremium: false,
        questionsSolvedToday: 0,
        dailyLimit: 10,
        lastQuestionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'אנא מלא אימייל וסיסמה');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // הניווט יקרה אוטומטית דרך App.tsx
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        Alert.alert('שגיאה', 'אימייל או סיסמה לא נכונים');
      } else {
        Alert.alert('שגיאה', 'לא הצלחנו להתחבר, נסה שוב מאוחר יותר');
      }
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
      if (!idToken) throw new Error('No ID token found');

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      await checkUserDocument(userCredential.user);
    } catch (error: any) {
      Alert.alert('שגיאה', 'לא הצלחנו להתחבר דרך גוגל.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>שלום שוב!</Text>
          <Text style={styles.subtitle}>התחבר כדי להמשיך ללמוד ל-PsyMath</Text>
        </View>

        <View style={styles.form}>
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} disabled={isGoogleLoading}>
            {isGoogleLoading ? <ActivityIndicator color="#333" /> : (
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
              placeholder="סיסמה"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              textAlign="right"
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleEmailLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>התחברות</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkContainer} onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.linkText}>אין לך חשבון? הרשם עכשיו</Text>
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
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 10, elevation: 2 },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  divider: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 15, color: '#A0AEC0', fontSize: 14 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#E2E8F0' },
  icon: { marginLeft: 12 },
  input: { flex: 1, fontSize: 16, color: '#2D3748' },
  submitButton: { backgroundColor: '#4A90E2', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 4 },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  linkContainer: { marginTop: 15, alignItems: 'center' },
  linkText: { color: '#4A90E2', fontSize: 16, fontWeight: '600' },
});