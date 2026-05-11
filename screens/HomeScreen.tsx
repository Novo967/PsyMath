import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { deleteUser, signOut } from "firebase/auth";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
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
import { RootStackParamList } from "../App";
import { useTheme } from "../contexts/ThemeContexts"; // ייבוא ה-Hook החדש
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
  // שאיבת ערכת הנושא והסטיילים הדינמיים
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userName, setUserName] = useState("");

  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        if (auth.currentUser.displayName) {
          setUserName(auth.currentUser.displayName);
        }

        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          setIsPremium(userSnap.data()?.isPremium || false);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleNavigation = async (screenName: keyof RootStackParamList) => {
    if (!auth.currentUser) return;
    navigation.navigate(screenName as any);
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
                    "עליך להתנתק ולהתחבר מחדש לפני מחיקת החשבון.",
                  );
                } else {
                  Alert.alert("שגיאה", "לא הצלחנו למחוק את החשבון.");
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
            <Ionicons
              name="settings-outline"
              size={26}
              color={theme.textPrimary}
            />
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
              <Text style={styles.menuItemText}>התנתק מהחשבון</Text>
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

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.backgroundColor },
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
      color: theme.textLight,
      marginBottom: 8,
      textAlign: "right",
    },
    subtitle: { fontSize: 16, color: theme.textLight, textAlign: "right" },
    cardsContainer: { gap: 16 },
    card: {
      backgroundColor: theme.cardBackground,
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
      color: theme.textPrimary,
      marginBottom: 4,
    },
    cardDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "right",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(22, 44, 91, 0.4)",
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    dropdownMenu: {
      backgroundColor: theme.cardBackground,
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
      color: theme.textPrimary,
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
      color: theme.textPrimary,
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
