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
import { auth, db } from "../firebaseConfig";
import { Subject, TopicStats, generateTargetedPracticeSession, generateTopicSpecificPracticeSession } from "../utils/topicStatsUtils";

interface WeakTopicDisplay extends TopicStats {
  accuracy: number;
}

const colors = {
  backgroundColor: "#9dbde9",
  cardBackground: "#FFFFFF",
  primaryColor: "#2695D8",
  textPrimary: "#162C5B",
  textSecondary: "#6B7C9D",
  textLight: "#FFFFFF",
  successBorder: "#48BB78",
  errorBackground: "#FED7D7",
  errorBorder: "#E53E3E"
};

export default function WeaknessAnalyzerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const subject: Subject = route.params?.subject || "quantitative";

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTopicId, setLoadingTopicId] = useState<string | null>(null);
  const [weakTopics, setWeakTopics] = useState<WeakTopicDisplay[]>([]);

  useEffect(() => {
    fetchTopicStats();
  }, []);

  const fetchTopicStats = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, "users", auth.currentUser.uid, "topicStats"),
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

  const handlePracticeSingleTopic = async (topicId: string) => {
    setLoadingTopicId(topicId);
    try {
      const sessionQuestions = await generateTopicSpecificPracticeSession(topicId, subject);

      if (sessionQuestions.length === 0) {
        Alert.alert("אין שאלות זמינות", "לא מצאנו מספיק שאלות לתרגול בנושא זה כרגע.");
        setLoadingTopicId(null);
        return;
      }

      navigation.navigate("Practice", {
        subject,
        sessionQuestions,
      });
    } catch (error) {
      console.error("Error generating topic specific practice:", error);
      Alert.alert("שגיאה", "אירעה שגיאה בבניית התרגול. אנא נסה שוב.");
    } finally {
      setLoadingTopicId(null);
    }
  };

  const handleStartTargetedPractice = async () => {
    if (!auth.currentUser) return;
    setIsGenerating(true);
    try {
      const topicsList = weakTopics.map((t) => t.topicId);
      const sessionQuestions = await generateTargetedPracticeSession(
        auth.currentUser.uid,
        topicsList,
        subject
      );

      if (sessionQuestions.length === 0) {
        Alert.alert("אין שאלות זמינות", "לא מצאנו שאלות לתרגול חכם כרגע.");
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
        <ActivityIndicator size="large" color={colors.primaryColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="analytics" size={40} color={colors.primaryColor} />
          <Text style={styles.title}>מנתח חולשות</Text>
          <Text style={styles.subtitle}>
            זיהינו את הנושאים שדורשים חיזוק. תרגול חכם יעזור לך לשפר את האחוזים שלך.
          </Text>
        </View>

        {weakTopics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={60} color={colors.successBorder} />
            <Text style={styles.emptyTitle}>הכל נראה מצוין!</Text>
            <Text style={styles.emptySubtitle}>
              אין לנו מספיק נתונים כרגע כדי להצביע על חולשות. תוכל להתחיל תרגול חכם בכל מקרה והמערכת תבחר עבורך שאלות.
            </Text>
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

                <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 5 }}>
                  <TouchableOpacity
                    style={[styles.studyButton, { flex: 1, marginLeft: 5 }]}
                    onPress={() => handleStudyMaterial(topic.topicId)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="book-outline" size={18} color={colors.primaryColor} />
                    <Text style={styles.studyButtonText}>חומרי לימוד</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.studyButton, { flex: 1, marginRight: 5, backgroundColor: colors.primaryColor }]}
                    onPress={() => handlePracticeSingleTopic(topic.topicId)}
                    activeOpacity={0.8}
                    disabled={loadingTopicId === topic.topicId}
                  >
                    {loadingTopicId === topic.topicId ? (
                      <ActivityIndicator size="small" color={colors.textLight} />
                    ) : (
                      <>
                        <Ionicons name="barbell-outline" size={18} color={colors.textLight} />
                        <Text style={[styles.studyButtonText, { color: colors.textLight }]}>תרגול נושא</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* The start session button is now ALWAYS available! */}
        <TouchableOpacity
          style={styles.practiceButton}
          onPress={handleStartTargetedPractice}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          {isGenerating ? (
            <ActivityIndicator color={colors.textLight} />
          ) : (
            <>
              <Text style={styles.practiceButtonText}>התחל תרגול חכם</Text>
              <Ionicons name="rocket-outline" size={20} color={colors.textLight} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.backgroundColor },
  container: { flex: 1, backgroundColor: colors.backgroundColor },
  scrollContainer: { padding: 50, paddingBottom: 80 },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textLight, // Usually titles on this background are white
    marginTop: 10,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  cardsContainer: {
    width: "100%",
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#162C5B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
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
    color: colors.textPrimary,
  },
  accuracyBadge: {
    backgroundColor: colors.errorBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  accuracyText: {
    color: colors.errorBorder,
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
    color: colors.textSecondary,
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
    color: colors.primaryColor,
    fontWeight: "600",
    fontSize: 15,
    marginRight: 8,
  },
  practiceButton: {
    flexDirection: "row-reverse",
    backgroundColor: colors.primaryColor,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: colors.primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  practiceButtonText: {
    color: colors.textLight,
    fontSize: 18,
    fontWeight: "bold",
  },
});
