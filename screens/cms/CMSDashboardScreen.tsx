import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContexts";

export default function CMSDashboardScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();

  // Role guard
  const isAllowed =
    userProfile?.role === "editor" || userProfile?.role === "admin";

  if (!isAllowed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color={theme.errorBorder} />
          <Text style={styles.accessDeniedTitle}>אין גישה</Text>
          <Text style={styles.accessDeniedText}>
            מסך זה זמין רק לעורכים ומנהלים.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>חזרה</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>ניהול תוכן</Text>
          <Text style={styles.subtitle}>
            {userProfile?.role === "admin" ? "מנהל" : "עורך"} •{" "}
            {userProfile?.name}
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("QuestionList")}
          >
            <View
              style={[styles.cardIcon, { backgroundColor: "#EDE9FE" }]}
            >
              <Ionicons
                name="help-circle-outline"
                size={32}
                color="#8B5CF6"
              />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>ניהול שאלות</Text>
              <Text style={styles.cardDescription}>
                יצירה, עריכה ומחיקה של שאלות תרגול
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color="#CBD5E0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("MaterialList")}
          >
            <View
              style={[styles.cardIcon, { backgroundColor: "#DBEAFE" }]}
            >
              <Ionicons name="library-outline" size={32} color="#3B82F6" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>ניהול חומרי לימוד</Text>
              <Text style={styles.cardDescription}>
                עריכת פרקים, נושאי משנה ותכני לימוד
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color="#CBD5E0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("AIBatchUpload")}
          >
            <View
              style={[styles.cardIcon, { backgroundColor: "#FEF3C7" }]}
            >
              <Ionicons name="sparkles" size={32} color="#D97706" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>העלאת שאלות עם AI</Text>
              <Text style={styles.cardDescription}>
                חילוץ שאלות מקובץ באמצעות בינה מלאכותית
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color="#CBD5E0" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.backgroundColor },
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 30,
    },
    headerContainer: { marginBottom: 40, alignItems: "flex-end" },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.textLight,
      marginBottom: 8,
      textAlign: "right",
    },
    subtitle: {
      fontSize: 15,
      color: theme.textLight,
      textAlign: "right",
      opacity: 0.85,
    },
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
      width: 60,
      height: 60,
      borderRadius: 16,
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
    // Access denied
    accessDenied: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    accessDeniedTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    accessDeniedText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    backButton: {
      backgroundColor: theme.primaryColor,
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 12,
    },
    backButtonText: {
      color: theme.textLight,
      fontSize: 16,
      fontWeight: "700",
    },
  });
