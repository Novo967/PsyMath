import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// נגדיר שוב את הממשק כדי ש-TypeScript יכיר את המבנה
interface Question {
  id: string;
  topic: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: string;
}

export default function SimulationResultsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // שליפת הנתונים שהעברנו ממסך הסימולציה
  const { questions, userAnswers, score } = route.params as {
    questions: Question[];
    userAnswers: (number | null)[];
    score: number;
  };

  // חישוב סטטיסטיקות מהיר
  const total = questions.length;
  const correctCount = userAnswers.filter(
    (ans, idx) => ans === questions[idx].correctAnswerIndex,
  ).length;
  const unansweredCount = userAnswers.filter((ans) => ans === null).length;
  const wrongCount = total - correctCount - unansweredCount;

  // בחירת צבע לציון
  const getScoreColor = () => {
    if (score >= 80) return "#00C48F"; // ירוק
    if (score >= 55) return "#FF6D00"; // כתום
    return "#FF3D71"; // אדום
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* אזור הציון העליון */}
        <View style={styles.scoreHeader}>
          <Text style={styles.headerTitle}>סיכום סימולציה</Text>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
            <Text style={[styles.scoreText, { color: getScoreColor() }]}>
              {score}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: "#00D68F" }]}>
                {correctCount}
              </Text>
              <Text style={styles.statLabel}>נכונות</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: "#FF3D71" }]}>
                {wrongCount}
              </Text>
              <Text style={styles.statLabel}>שגויות</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: "#6C7693" }]}>
                {unansweredCount}
              </Text>
              <Text style={styles.statLabel}>לא נענו</Text>
            </View>
          </View>
        </View>

        {/* רשימת המשוב לשאלות */}
        <Text style={styles.reviewTitle}>פירוט תשובות והסברים:</Text>

        {questions.map((question, qIndex) => {
          const userAnswer = userAnswers[qIndex];
          const isCorrect = userAnswer === question.correctAnswerIndex;
          const isUnanswered = userAnswer === null;

          return (
            <View key={question.id} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>שאלה {qIndex + 1}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isCorrect
                        ? "#D5F5E8"
                        : isUnanswered
                          ? "#EBF0F7"
                          : "#FFE0E8",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: isCorrect
                          ? "#00875A"
                          : isUnanswered
                            ? "#4A5568"
                            : "#DB2B5A",
                      },
                    ]}
                  >
                    {isCorrect ? "נכון" : isUnanswered ? "לא נענה" : "שגוי"}
                  </Text>
                </View>
              </View>

              <Text style={styles.topicText}>{question.topic}</Text>
              <Text style={styles.questionText}>{question.questionText}</Text>

              <View style={styles.optionsContainer}>
                {question.options.map((opt, optIndex) => {
                  const isThisCorrectOption =
                    optIndex === question.correctAnswerIndex;
                  const isThisUserWrongOption =
                    optIndex === userAnswer && !isCorrect;

                  let optionStyle = styles.optionNeutral;
                  let textStyle = styles.optionTextNeutral;
                  let iconName = "";
                  let iconColor = "";

                  if (isThisCorrectOption) {
                    optionStyle = styles.optionCorrect;
                    textStyle = styles.optionTextCorrect;
                    iconName = "checkmark-circle";
                    iconColor = "#00D68F";
                  } else if (isThisUserWrongOption) {
                    optionStyle = styles.optionWrong;
                    textStyle = styles.optionTextWrong;
                    iconName = "close-circle";
                    iconColor = "#FF3D71";
                  }

                  return (
                    <View
                      key={optIndex}
                      style={[styles.optionBase, optionStyle]}
                    >
                      <Text style={[styles.optionText, textStyle]}>{opt}</Text>
                      {iconName !== "" && (
                        <Ionicons
                          name={iconName as any}
                          size={22}
                          color={iconColor}
                          style={{ marginLeft: 10 }}
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* קוביית ההסבר */}
              <View style={styles.explanationBox}>
                <View style={styles.explanationHeader}>
                  <Ionicons name="bulb-outline" size={20} color="#FFB020" />
                  <Text style={styles.explanationTitle}>הסבר הפתרון:</Text>
                </View>
                <Text style={styles.explanationText}>
                  {question.explanation}
                </Text>
              </View>
            </View>
          );
        })}

        {/* כפתור חזרה למסך הראשי */}
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")} // ודא ששם המסך הראשי שלך הוא 'Home'
        >
          <Text style={styles.homeButtonText}>חזרה למסך הראשי</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100, // תוקן: הוגדל מ-40 ל-100 כדי לתת מרווח גלילה ראוי מתחת לכפתור
    flexGrow: 1, // תוקן: עוזר לסדר את תצוגת התוכן בתוך ה-ScrollView כך שיתפוס את כל המקום
  },
  scoreHeader: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1F36",
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 40,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#E5E9F2",
    paddingTop: 20,
  },
  statBox: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 14,
    color: "#6C7693",
    marginTop: 4,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1F36",
    textAlign: "right",
    marginBottom: 15,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1F36",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  topicText: {
    fontSize: 14,
    color: "#6C7693",
    textAlign: "right",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1F36",
    textAlign: "right",
    marginBottom: 20,
    lineHeight: 26,
  },
  optionsContainer: {
    marginBottom: 0,
  },
  optionBase: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionNeutral: {
    backgroundColor: "#F7FAFC",
    borderColor: "#E5E9F2",
  },
  optionCorrect: {
    backgroundColor: "#F0FFF4",
    borderColor: "#7DDFBD",
  },
  optionWrong: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FFB3C7",
  },
  optionText: {
    fontSize: 16,
    textAlign: "right",
    flex: 1,
  },
  optionTextNeutral: {
    color: "#4A5568",
  },
  optionTextCorrect: {
    color: "#00875A",
    fontWeight: "600",
  },
  optionTextWrong: {
    color: "#B82050",
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  explanationBox: {
    backgroundColor: "#FFFFF0",
    borderWidth: 1,
    borderColor: "#FFFBEB",
    borderRadius: 12,
    padding: 15,
  },
  explanationHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#A67C00",
    marginRight: 8,
  },
  explanationText: {
    fontSize: 15,
    color: "#7A5600",
    textAlign: "right",
    lineHeight: 24,
  },
  homeButton: {
    backgroundColor: "#3366FF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  homeButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
