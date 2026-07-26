import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { deleteUser, signOut } from "firebase/auth";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import { RootStackParamList } from "../App";
import AnimatedBackground from "../components/AnimatedBackground";
import { auth, db } from "../firebaseConfig";
import { fetchCurrentStreak } from "../utils/streakUtils";
import FeedbackModal from "./FeedbackModal";
const { width, height } = Dimensions.get("window");

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userName, setUserName] = useState("");
  const [isFeedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  const slideAnim = useRef(new Animated.Value(width)).current;
  // אנימציית פעימה לאייקון הסטריק
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        if (auth.currentUser) {
          try {
            const userRef = doc(db, "users", auth.currentUser.uid);

            // משיכת נתוני המשתמש מה-Firestore (מקור האמת שלנו)
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().name) {
              setUserName(userSnap.data().name);
            } else if (auth.currentUser.displayName) {
              // גיבוי למקרה שהשם שמור רק ב-Auth מסיבה כלשהי
              setUserName(auth.currentUser.displayName);
            }

            const customerInfo = await Purchases.getCustomerInfo();
            const hasPremium =
              !!customerInfo.entitlements.active["כמותי לפסיכומטרי Pro"];

            setIsPremium(hasPremium);

            await updateDoc(userRef, {
              isPremium: hasPremium,
            });
          } catch (error) {
            console.error("Error fetching user data/premium status:", error);
          }
        }
      };

      fetchUserData();
    }, []),
  );

  // Refresh streak every time the Home screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadStreak = async () => {
        if (auth.currentUser) {
          const streak = await fetchCurrentStreak(auth.currentUser.uid);
          setCurrentStreak(streak);
        }
      };
      loadStreak();
    }, [])
  );

  // Subtle pulse animation for the fire icon when streak > 0
  useEffect(() => {
    if (currentStreak > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [currentStreak]);

  const handleNavigation = async (screenName: keyof RootStackParamList) => {
    if (!auth.currentUser) return;

    if (screenName === "Practice" || screenName === "Statistics") {
      navigation.navigate(screenName as any);
      return;
    }

    try {
      // 1. קודם בודקים מול RevenueCat האם המשתמש כבר רכש
      const customerInfo = await Purchases.getCustomerInfo();
      const premiumStatus =
        !!customerInfo.entitlements.active["כמותי לפסיכומטרי Pro"];

      if (premiumStatus) {
        navigation.navigate(screenName as any);
        return;
      }

      // 2. במידה ואין מנוי, בודקים את תוקף הניסיון בפיירבייס
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      let isTrialActive = false;

      if (userSnap.exists()) {
        const trialEndsAt = userSnap.data().trialEndsAt;
        if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
          isTrialActive = true;
        }
      }

      if (isTrialActive) {
        // אם תקופת הניסיון עדיין בתוקף, נותנים להיכנס למסך
        navigation.navigate(screenName as any);
      } else {
        Alert.alert(
          "תוכן פרימיום",
          "מסך זה זמין למנויי פרימיום בלבד. תרצה לשדרג את המנוי?",
          [
            { text: "אולי מאוחר יותר", style: "cancel" },
            {
              text: "למעבר לרכישת מנוי",
              onPress: () => {
                navigation.navigate("Paywall" as any);
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error("Error checking premium/trial status:", error);
      Alert.alert("שגיאה", "לא הצלחנו לאמת את סטטוס המנוי שלך.");
    }
  };

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = (callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
      if (callback) callback();
    });
  };

  const handleLogout = async () => {
    closeMenu(async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Logout error:", error);
        Alert.alert("שגיאה", "לא הצלחנו לנתק אותך מהחשבון. נסה שוב.");
      }
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "מחיקת חשבון",
      "האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו תמחק את כל הנתונים שלך, אינה ניתנת לביטול ותוביל להתנתקות מיידית.",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק חשבון לצמיתות",
          style: "destructive",
          onPress: () => {
            closeMenu(async () => {
              if (!auth.currentUser) return;

              try {
                const uid = auth.currentUser.uid;
                const userRef = doc(db, "users", uid);

                await deleteDoc(userRef);
                await deleteUser(auth.currentUser);
              } catch (error: any) {
                console.error("Delete account error:", error);
                if (error.code === "auth/requires-recent-login") {
                  Alert.alert(
                    "נדרש אימות מחדש",
                    "מטעמי אבטחה, עליך להתנתק ולהתחבר מחדש לאפליקציה לפני שתוכל למחוק את החשבון.",
                  );
                } else {
                  Alert.alert(
                    "שגיאה",
                    "לא הצלחנו למחוק את החשבון. אנא נסה שוב מאוחר יותר.",
                  );
                }
              }
            });
          },
        },
      ],
    );
  };

  const handleMenuPress = (action: string) => {
    closeMenu(() => {
      switch (action) {
        case "premium":
          navigation.navigate("Paywall" as any);
          break;
        case "feedback":
          setFeedbackModalVisible(true);
          break;
        case "policy":
          Linking.openURL("https://novo967.github.io/Camuty-landing-page/");
          break;
        case "contact":
          Linking.openURL(
            "https://novo967.github.io/Camuty-landing-page/contact.html",
          );
          break;
        default:
          break;
      }
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.topBar}>
            {/* Streak badge — top-left corner */}
            <BlurView intensity={Platform.OS === 'ios' ? 20 : 60} tint="light" style={[
              styles.streakBadge,
              currentStreak === 0 && styles.streakBadgeInactive,
            ]}>
              {currentStreak > 0 ? (
                <Animated.Text
                  style={[
                    styles.streakFireIcon,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  🔥
                </Animated.Text>
              ) : (
                <Ionicons name="flame-outline" size={18} color="#B0B8C9" />
              )}
              <Text style={[
                styles.streakNumber,
                currentStreak === 0 && styles.streakNumberInactive,
              ]}>
                {currentStreak}
              </Text>
            </BlurView>

            <TouchableOpacity onPress={openMenu} style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={26} color="#1A1F36" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContainer}>
            <Text style={styles.title}>הכנה כמותית לפסיכומטרי</Text>
            <Text style={styles.subtitle}>שלום {userName}, מה נלמד היום?</Text>
          </View>

          <View style={styles.cardsContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleNavigation("StudyMaterials")}
            >
              <BlurView intensity={Platform.OS === 'ios' ? 30 : 75} tint="light" style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name="book-outline" size={24} color="#3366FF" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>חומרי לימוד</Text>
                  <Text style={styles.cardDescription}>
                    למידה מסודרת לפי נושאים
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleNavigation("Practice")}
            >
              <BlurView intensity={Platform.OS === 'ios' ? 30 : 75} tint="light" style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name="pencil-outline" size={24} color="#FF6D00" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>תרגול חופשי</Text>
                  <Text style={styles.cardDescription}>
                    אימון יומי לשיפור המיומנות
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleNavigation("Simulation")}
            >
              <BlurView intensity={Platform.OS === 'ios' ? 30 : 75} tint="light" style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name="timer-outline" size={24} color="#7C3AED" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>סימולציה מלאה</Text>
                  <Text style={styles.cardDescription}>מבחן זמן בתנאי אמת</Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleNavigation("Statistics")}
            >
              <BlurView intensity={Platform.OS === 'ios' ? 30 : 75} tint="light" style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name="stats-chart-outline" size={24} color="#00BCD4" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>סטטיסטיקות</Text>
                  <Text style={styles.cardDescription}>מעקב אחר קצב ההתקדמות</Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleNavigation("WeaknessAnalyzer")}
            >
              <BlurView intensity={Platform.OS === 'ios' ? 30 : 75} tint="light" style={styles.card}>
                <View style={[styles.cardIcon, { backgroundColor: "#EEF2FF" }]}>
                  <Ionicons name="rocket-outline" size={24} color="#3366FF" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>תרגול חכם ממוקד</Text>
                  <Text style={styles.cardDescription}>השלמת פערים לפי חולשות</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeMenu()}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => closeMenu()}
        >
          <Animated.View
            style={[
              styles.dropdownMenu,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderText}>הגדרות</Text>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress("premium")}
            >
              <Ionicons name="star-outline" size={22} color="#3366FF" />
              <Text style={styles.menuItemText}>
                {isPremium ? "ניהול מנוי פרימיום" : "שדרוג לפרימיום"}
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress("feedback")}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={22}
                color="#3366FF"
              />
              <Text style={styles.menuItemText}>מה נוכל לשפר?</Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress("policy")}
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color="#3366FF"
              />
              <Text style={styles.menuItemText}>מדיניות האפליקציה</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress("contact")}
            >
              <Ionicons name="mail-outline" size={22} color="#3366FF" />
              <Text style={styles.menuItemText}>צור קשר</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#3366FF" />
              <Text style={[styles.menuItemText]}>התנתק מהחשבון</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={22} color="#FF3D71" />
              <Text style={[styles.menuItemText, { color: "#FF3D71" }]}>
                מחק חשבון
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <FeedbackModal
        visible={isFeedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  settingsButton: { padding: 8 },

  // --- Streak Badge Styles ---
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Platform.select({ ios: "transparent", android: "rgba(255, 255, 255, 0.45)" }),
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    overflow: "hidden",
    gap: 4,
  },
  streakBadgeInactive: {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  streakFireIcon: {
    fontSize: 18,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#3366FF",
  },
  streakNumberInactive: {
    color: "#B0B8C9",
  },

  headerContainer: { marginBottom: 24, alignItems: "flex-end" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1F36",
    marginBottom: 6,
    textAlign: "right",
  },
  subtitle: { fontSize: 15, color: "#6C7693", textAlign: "right" },

  // --- Cards Styles ---
  cardsContainer: { gap: 16 },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: Platform.select({ ios: "transparent", android: "rgba(255, 255, 255, 0.5)" }),
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    overflow: "hidden",
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F0F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 14,
  },
  cardTextContainer: { flex: 1, alignItems: "flex-end" },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1F36",
    marginBottom: 2,
  },
  cardDescription: { fontSize: 13, color: "#6C7693", textAlign: "right" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 31, 54, 0.35)",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  dropdownMenu: {
    backgroundColor: "#ffffff",
    width: 260,
    height: "100%",
    paddingTop: 60,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E9F2",
    marginBottom: 10,
  },
  menuHeaderText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1F36",
    textAlign: "right",
  },
  menuItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 15,
  },
  menuItemText: {
    fontSize: 16,
    color: "#1A1F36",
    fontWeight: "600",
    textAlign: "right",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E5E9F2",
    marginVertical: 10,
    marginHorizontal: 16,
  },
});
