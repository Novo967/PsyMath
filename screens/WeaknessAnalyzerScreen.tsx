import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContexts";
import { db } from "../firebaseConfig";
import { Subject, TopicStats } from "../types";
import { generateTargetedPracticeSession } from "../utils/topicStatsUtils";

interface WeakTopicDisplay extends TopicStats {
  accuracy: number;
}

export default function WeaknessAnalyzerScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { userProfile } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const subject: Subject = route.params?.subject || "quantitative";

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [weakTopics, setWeakTopics] = useState<WeakTopicDisplay[]>([]);

  useEffect(() => {
    fetchTopicStats();
  }, []);

  const fetchTopicStats = async () => {
    if (!userProfile?.uid) return;
    try {
      const q = query(
        collection(db, "users", userProfile.uid, "topicStats"),
        where("subject", "==", subject)
      );
      const querySnapshot = await getDocs(q);
      const allTopics: TopicStats[] = [];
      querySnapshot.forEach((doc) => {
        allTopics.push(doc.data() as TopicStats);
      });

      const analyzedTopics: WeakTopicDisplay[] = allTopics
        .filter((t) => t.totalAttempted >= 3) // ensure statistical significance
        .map((t) => ({
          ...t,
          accuracy: (t.totalCorrect / t.totalAttempted) * 100,
        }))
        .filter((t) => t.accuracy < 65) // weak threshold
        .sort((a, b) => a.accuracy - b.accuracy) // lowest accuracy first
        .slice(0, 3); // top 3 weakest

      setWeakTopics(analyzedTopics);
    } catch (error) {
      console.error("Error fetching topic stats:", error);
      Alert.alert("שגיאה", "לא הצלחנו לטעון את נתוני הניתוח.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudyMaterial = (topicId: string) => {
    navigation.navigate("StudyMaterials", { subject, defaultTopic: topicId });
  };

  const handleStartTargetedPractice = async () => {
    if (!userProfile?.uid) return;
    setIsGenerating(true);
    try {
      const topicsList = weakTopics.map((t) => t.topicId);
      const instituteId = userProfile.instituteId || "B2C_PUBLIC";
      const sessionQuestions = await generateTargetedPracticeSession(
        userProfile.uid,
        topicsList,
        subject,
        instituteId
      );

      if (sessionQuestions.length === 0) {
        Alert.alert("אין שאלות זמינות", "לא מצאנו שאלות לתרגול ממוקד בנושאים אלו.");
        setIsGenerating(false);
        return;
      }

      navigation.navigate("Practice", {
        subject,
        sessionQuestions,
      });
    } catch (error) {
      console.error("Error generating targeted practice:", error);
      Alert.alert("שגיאה", "אירעה שגיאה בבניית התרגול. אנא נסה שוב.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primaryColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Ionicons name="analytics" size={40} color={theme.primaryColor} />
          <Text style={styles.title}>מנתח חולשות</Text>
          <Text style={styles.subtitle}>
            זיהינו את הנושאים שדורשים חיזוק. תרגול ממוקד יעזור לך לשפר את האחוזים שלך.
          </Text>
        </View>

        {weakTopics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={60} color={theme.successBorder} />
            <Text style={styles.emptyTitle}>מצוין!</Text>
            <Text style={styles.emptySubtitle}>לא מצאנו נושאים חלשים עם מספיק נתונים כרגע.</Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {weakTopics.map((topic, index) => (
              <View key={index} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.topicName}>{topic.topicId}</Text>
                  <View style={styles.accuracyBadge}>
                    <Text style={styles.accuracyText}>{Math.round(topic.accuracy)}% הצלחה</Text>
                  </View>
                </View>
                
                <View style={styles.statsRow}>
                  <Text style={styles.statText}>סה"כ שאלות: {topic.totalAttempted}</Text>
                  <Text style={styles.statText}>שגיאות: {topic.totalAttempted - topic.totalCorrect}</Text>
                </View>

                <TouchableOpacity
                  style={styles.studyButton}
                  onPress={() => handleStudyMaterial(topic.topicId)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="book-outline" size={18} color={theme.primaryColor} />
                  <Text style={styles.studyButtonText}>חומרי לימוד</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {weakTopics.length > 0 && (
          <TouchableOpacity
            style={styles.practiceButton}
            onPress={handleStartTargetedPractice}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <ActivityIndicator color={theme.textLight} />
            ) : (
              <>
                <Text style={styles.practiceButtonText}>התחל תרגול ממוקד</Text>
                <Ionicons name="rocket-outline" size={20} color={theme.textLight} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.backgroundColor },
    container: { flex: 1, backgroundColor: theme.backgroundColor },
    scrollContainer: { padding: 20, paddingBottom: 40 },
    header: {
      alignItems: "center",
      marginBottom: 30,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.textPrimary,
      marginTop: 10,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 10,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      marginTop: 20,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.textPrimary,
      marginTop: 15,
      marginBottom: 5,
    },
    emptySubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
    },
    cardsContainer: {
      width: "100%",
    },
    card: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    topicName: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.textPrimary,
    },
    accuracyBadge: {
      backgroundColor: theme.errorBackground,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    accuracyText: {
      color: theme.errorBorder,
      fontWeight: "bold",
      fontSize: 14,
    },
    statsRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginBottom: 15,
    },
    statText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    studyButton: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      backgroundColor: "#EBF4FF",
      borderRadius: 10,
    },
    studyButtonText: {
      color: theme.primaryColor,
      fontWeight: "600",
      fontSize: 15,
      marginRight: 8,
    },
    practiceButton: {
      flexDirection: "row-reverse",
      backgroundColor: theme.primaryColor,
      padding: 16,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
      shadowColor: theme.primaryColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    practiceButtonText: {
      color: theme.textLight,
      fontSize: 18,
      fontWeight: "bold",
    },
  });
