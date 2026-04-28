import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { deleteUser, signOut } from "firebase/auth";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases from "react-native-purchases"; // התוספת של RevenueCat
import { RootStackParamList } from "../App";
import { auth, db } from "../firebaseConfig";

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
  const [userName, setUserName] = useState("חבר");

  const slideAnim = useRef(new Animated.Value(width)).current;

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        if (auth.currentUser) {
          if (auth.currentUser.displayName) {
            setUserName(auth.currentUser.displayName);
          }

          try {
            const userRef = doc(db, "users", auth.currentUser.uid);

            const customerInfo = await Purchases.getCustomerInfo();
            const hasPremium =
              !!customerInfo.entitlements.active["כמותי לפסיכומטרי Pro"];

            setIsPremium(hasPremium);

            // סנכרון שקט לפיירבייס ליתר ביטחון
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
  const handleNavigation = async (screenName: keyof RootStackParamList) => {
    if (!auth.currentUser) return;

    // מאפשרים גישה חופשית למסכי תרגול וסטטיסטיקה
    if (screenName === "Practice" || screenName === "Statistics") {
      navigation.navigate(screenName as any);
      return;
    }

    // בדיקת פרימיום למסכים חסומים ישירות מול RevenueCat
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const premiumStatus =
        !!customerInfo.entitlements.active["כמותי לפסיכומטרי Pro"];
      console.log(
        "All active subscriptions:",
        customerInfo.activeSubscriptions,
      );
      console.log("Active Entitlements:", customerInfo.entitlements.active);
      if (premiumStatus) {
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
      console.error("Error checking premium status:", error);
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openMenu} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={26} color="#162C5B" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContainer}>
          <Text style={styles.title}>הכנה כמותית לפסיכומטרי</Text>
          <Text style={styles.subtitle}>שלום {userName}, מה נלמד היום?</Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleNavigation("StudyMaterials")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="book-outline" size={28} color="#2695D8" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>חומרי לימוד</Text>
              <Text style={styles.cardDescription}>
                למידה מסודרת לפי נושאים
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleNavigation("Practice")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="pencil-outline" size={28} color="#F3902E" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>תרגול חופשי</Text>
              <Text style={styles.cardDescription}>
                אימון יומי לשיפור המיומנות
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleNavigation("Simulation")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="timer-outline" size={28} color="#162C5B" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>סימולציה מלאה</Text>
              <Text style={styles.cardDescription}>מבחן זמן בתנאי אמת</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => handleNavigation("Statistics")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="stats-chart-outline" size={28} color="#4FB5ED" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>סטטיסטיקות</Text>
              <Text style={styles.cardDescription}>מעקב אחר קצב ההתקדמות</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              <Ionicons name="star-outline" size={22} color="#2695D8" />
              <Text style={styles.menuItemText}>
                {isPremium ? "ניהול מנוי פרימיום" : "שדרוג לפרימיום"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress("policy")}
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color="#2695D8"
              />
              <Text style={styles.menuItemText}>מדיניות האפליקציה</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress("contact")}
            >
              <Ionicons name="mail-outline" size={22} color="#2695D8" />
              <Text style={styles.menuItemText}>צור קשר</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#2695D8" />
              <Text style={[styles.menuItemText]}>התנתק מהחשבון</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={22} color="#E53E3E" />
              <Text style={[styles.menuItemText, { color: "#E53E3E" }]}>
                מחק חשבון
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#9dbde9" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  topBar: { alignItems: "flex-end", marginBottom: 10 },
  settingsButton: { padding: 8 },
  headerContainer: { marginBottom: 40, alignItems: "flex-end" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "right",
  },
  subtitle: { fontSize: 16, color: "#ffffff", textAlign: "right" },
  cardsContainer: { gap: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row-reverse",
    alignItems: "center",
    shadowColor: "#162C5B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#F0F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  cardTextContainer: { flex: 1, alignItems: "flex-end" },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#162C5B",
    marginBottom: 4,
  },
  cardDescription: { fontSize: 14, color: "#6B7C9D", textAlign: "right" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(22, 44, 91, 0.4)",
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
    borderBottomColor: "#F0F4F8",
    marginBottom: 10,
  },
  menuHeaderText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#162C5B",
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
    color: "#162C5B",
    fontWeight: "600",
    textAlign: "right",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
    marginHorizontal: 16,
  },
});
