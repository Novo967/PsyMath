import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { deleteUser, signOut } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { RootStackParamList } from "../App";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContexts";
import { auth, db } from "../firebaseConfig";
import { Subject } from "../types";

const { width } = Dimensions.get("window");

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

// Subject card configuration
const SUBJECT_CONFIG: {
  key: Subject;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgLight: string;
}[] = [
  {
    key: "quantitative",
    label: "כמותי",
    subtitle: "חשיבה כמותית ומתמטיקה",
    icon: "calculator-outline",
    color: "#F3902E",
    bgLight: "#FFF3E8",
  },
  {
    key: "verbal",
    label: "מילולי",
    subtitle: "חשיבה מילולית והבנת הנקרא",
    icon: "chatbubble-ellipses-outline",
    color: "#8B5CF6",
    bgLight: "#F3EEFF",
  },
  {
    key: "english",
    label: "אנגלית",
    subtitle: "הבנת הנקרא ואוצר מילים",
    icon: "language-outline",
    color: "#3B82F6",
    bgLight: "#EBF4FF",
  },
];

export default function HomeScreen({ navigation }: Props) {
  const { theme, branding } = useTheme();
  const styles = getStyles(theme);
  const { userProfile } = useAuth();

  const [isMenuVisible, setMenuVisible] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<Subject | null>(null);

  const slideAnim = useRef(new Animated.Value(width)).current;

  const toggleSubjectCard = (subject: Subject) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSubject(expandedSubject === subject ? null : subject);
  };

  const navigateWithSubject = (
    screen: "Practice" | "Simulation" | "StudyMaterials",
    subject: Subject
  ) => {
    navigation.navigate(screen, { subject });
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
                await deleteUser(auth.currentUser!);
              } catch (error: any) {
                if (error.code === "auth/requires-recent-login") {
                  Alert.alert(
                    "נדרש אימות מחדש",
                    "עליך להתנתק ולהתחבר מחדש לפני מחיקת החשבון."
                  );
                } else {
                  Alert.alert("שגיאה", "לא הצלחנו למחוק את החשבון.");
                }
              }
            });
          },
        },
      ]
    );
  };

  const handleMenuPress = (action: string) => {
    closeMenu(() => {
      switch (action) {
        case "policy":
          if (branding.policyUrl) Linking.openURL(branding.policyUrl);
          break;
        case "contact":
          if (branding.contactUrl) Linking.openURL(branding.contactUrl);
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
          <Text style={styles.title}>{branding.appTitle}</Text>
          <Text style={styles.subtitle}>
            שלום {userProfile?.name || ""}, מה נלמד היום?
          </Text>
        </View>

        {/* Subject Cards */}
        <View style={styles.cardsContainer}>
          {SUBJECT_CONFIG.map((subj) => {
            const isExpanded = expandedSubject === subj.key;
            return (
              <TouchableOpacity
                key={subj.key}
                style={[
                  styles.subjectCard,
                  isExpanded && {
                    borderColor: subj.color,
                    borderWidth: 2,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => toggleSubjectCard(subj.key)}
              >
                <View style={styles.subjectCardHeader}>
                  <View
                    style={[
                      styles.subjectIcon,
                      { backgroundColor: subj.bgLight },
                    ]}
                  >
                    <Ionicons
                      name={subj.icon}
                      size={28}
                      color={subj.color}
                    />
                  </View>
                  <View style={styles.subjectTextContainer}>
                    <Text style={styles.subjectTitle}>{subj.label}</Text>
                    <Text style={styles.subjectSubtitle}>
                      {subj.subtitle}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </View>

                {/* Expanded actions */}
                {isExpanded && (
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: subj.bgLight },
                      ]}
                      onPress={() =>
                        navigateWithSubject("Practice", subj.key)
                      }
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={20}
                        color={subj.color}
                      />
                      <Text
                        style={[styles.actionButtonText, { color: subj.color }]}
                      >
                        תרגול
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: subj.bgLight },
                      ]}
                      onPress={() =>
                        navigateWithSubject("Simulation", subj.key)
                      }
                    >
                      <Ionicons
                        name="timer-outline"
                        size={20}
                        color={subj.color}
                      />
                      <Text
                        style={[styles.actionButtonText, { color: subj.color }]}
                      >
                        סימולציה
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: subj.bgLight },
                      ]}
                      onPress={() =>
                        navigateWithSubject("StudyMaterials", subj.key)
                      }
                    >
                      <Ionicons
                        name="book-outline"
                        size={20}
                        color={subj.color}
                      />
                      <Text
                        style={[styles.actionButtonText, { color: subj.color }]}
                      >
                        לימוד
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom cards — Statistics & CMS */}
        <View style={styles.bottomCardsContainer}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Statistics")}
          >
            <View style={styles.cardIcon}>
              <Ionicons
                name="stats-chart-outline"
                size={28}
                color="#4FB5ED"
              />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>סטטיסטיקות</Text>
              <Text style={styles.cardDescription}>
                מעקב אחר קצב ההתקדמות
              </Text>
            </View>
          </TouchableOpacity>

          {/* CMS Card — visible only to editors/admins */}
          {(userProfile?.role === "editor" ||
            userProfile?.role === "admin") && (
            <TouchableOpacity
              style={[styles.card, styles.cmsCard]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("CMSDashboard" as any)}
            >
              <View style={styles.cardIcon}>
                <Ionicons
                  name="construct-outline"
                  size={28}
                  color="#8B5CF6"
                />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>ניהול תוכן</Text>
                <Text style={styles.cardDescription}>
                  עריכת שאלות וחומרי לימוד
                </Text>
              </View>
            </TouchableOpacity>
          )}
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
                size={20}
                color={theme.textPrimary}
              />
              <Text style={styles.menuItemText}>תנאי שימוש</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress("contact")}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={theme.textPrimary}
              />
              <Text style={styles.menuItemText}>צור קשר</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color={theme.errorBorder}
              />
              <Text style={[styles.menuItemText, { color: theme.errorBorder }]}>
                התנתק
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteAccount}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={theme.errorBorder}
              />
              <Text style={[styles.menuItemText, { color: theme.errorBorder }]}>
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
    headerContainer: { marginBottom: 32, alignItems: "flex-end" },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.textLight,
      marginBottom: 8,
      textAlign: "right",
    },
    subtitle: { fontSize: 16, color: theme.textLight, textAlign: "right" },

    // Subject cards
    cardsContainer: { gap: 14, marginBottom: 20 },
    subjectCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: "transparent",
      shadowColor: "#162C5B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 3,
    },
    subjectCardHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
    },
    subjectIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 14,
    },
    subjectTextContainer: { flex: 1, alignItems: "flex-end" },
    subjectTitle: {
      fontSize: 19,
      fontWeight: "700",
      color: theme.textPrimary,
      marginBottom: 2,
    },
    subjectSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: "right",
    },

    // Expanded action buttons
    actionButtonsRow: {
      flexDirection: "row-reverse",
      gap: 10,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: "#F0F4F8",
    },
    actionButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: "700",
    },

    // Bottom cards (Statistics, CMS)
    bottomCardsContainer: { gap: 14 },
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
    cmsCard: {
      borderWidth: 1.5,
      borderColor: "#8B5CF6",
      borderStyle: "dashed",
    },

    // Menu modal
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
