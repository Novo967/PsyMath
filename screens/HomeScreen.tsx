import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {

  const handleNavigation = async (screenName: keyof RootStackParamList) => {
    if (!auth.currentUser) return;

    // מסך תרגול פתוח לכולם (החסימה של ה-10 שאלות נמצאת בתוך המסך עצמו)
    if (screenName === 'Practice' || screenName === 'Statistics') {
      navigation.navigate(screenName as any);
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      const isPremium = userSnap.data()?.isPremium || false;

      if (isPremium) {
        navigation.navigate(screenName as any);
      } else {
        Alert.alert(
          "תוכן פרימיום",
          "מסך זה זמין למנויי פרימיום בלבד. תרצה לשדרג את המנוי?",
          [
            { text: "אולי מאוחר יותר", style: "cancel" },
            { text: "לפרטים על פרימיום", onPress: () => console.log('Navigate to Paywall') }
          ]
        );
      }
    } catch (error) {
      console.error("Error checking premium status:", error);
      Alert.alert("שגיאה", "לא הצלחנו לאמת את סטטוס המנוי שלך.");
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>הכנה כמותית לפסיכומטרי</Text>
          <Text style={styles.subtitle}>בחר את אופן הלמידה שלך להיום</Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.7}
            onPress={() => handleNavigation('StudyMaterials')}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="book-outline" size={28} color="#4A90E2" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>חומרי לימוד</Text>
              <Text style={styles.cardDescription}>למידה מסודרת לפי נושאים</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.7}
            onPress={() => handleNavigation('Practice')}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="pencil-outline" size={28} color="#48BB78" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>תרגול חופשי</Text>
              <Text style={styles.cardDescription}>אימון יומי לשיפור המיומנות</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.7}
            onPress={() => handleNavigation('Simulation')}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="timer-outline" size={28} color="#F6AD55" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>סימולציה מלאה</Text>
              <Text style={styles.cardDescription}>מבחן זמן בתנאי אמת</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.7}
            onPress={() => handleNavigation('Statistics')}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="stats-chart-outline" size={28} color="#9F7AEA" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>סטטיסטיקות</Text>
              <Text style={styles.cardDescription}>מעקב אחר קצב ההתקדמות</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 30 },
  headerContainer: { marginBottom: 40, alignItems: 'flex-end' },
  title: { fontSize: 28, fontWeight: '800', color: '#1A202C', marginBottom: 8, textAlign: 'right' },
  subtitle: { fontSize: 16, color: '#718096', textAlign: 'right' },
  cardsContainer: { gap: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, flexDirection: 'row-reverse', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  cardIcon: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F7FAFC', justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  cardTextContainer: { flex: 1, alignItems: 'flex-end' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748', marginBottom: 4 },
  cardDescription: { fontSize: 14, color: '#718096', textAlign: 'right' },
});