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
import { useTheme } from "../contexts/ThemeContexts"; // ייבוא ה-Hook החדש

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
  const { theme } = useTheme(); // שליפת ערכת הנושא
  const styles = getStyles(theme); // יצירת סטיילים דינמיים

  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { questions, userAnswers, score } = route.params as {
    questions: Question[];
    userAnswers: (number | null)[];
    score: number;
  };

  const total = questions.length;
  const correctCount = userAnswers.filter(
    (ans, idx) => ans === questions[idx].correctAnswerIndex,
  ).length;
  const unansweredCount = userAnswers.filter((ans) => ans === null).length;
  const wrongCount = total - correctCount - unansweredCount;

  const getScoreColor = () => {
    if (score >= 80) return theme.successText;
    if (score >= 55) return "#DD6B20"; // כתום - נשאר קבוע או ניתן להוסיף ל-Theme
    return theme.errorText;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.scoreHeader}>
          <Text style={styles.headerTitle}>סיכום סימולציה</Text>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
            <Text style={[styles.scoreText, { color: getScoreColor() }]}>
              {score}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.successText }]}>
                {correctCount}
              </Text>
              <Text style={styles.statLabel}>נכונות</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.errorText }]}>
                {wrongCount}
              </Text>
              <Text style={styles.statLabel}>שגויות</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: theme.textSecondary }]}>
                {unansweredCount}
              </Text>
              <Text style={styles.statLabel}>לא נענו</Text>
            </View>
          </View>
        </View>

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
                        ? theme.successBackground
                        : isUnanswered
                          ? "#EDF2F7"
                          : theme.errorBackground,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: isCorrect
                          ? theme.successText
                          : isUnanswered
                            ? theme.textSecondary
                            : theme.errorText,
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
                    iconColor = theme.successBorder;
                  } else if (isThisUserWrongOption) {
                    optionStyle = styles.optionWrong;
                    textStyle = styles.optionTextWrong;
                    iconName = "close-circle";
                    iconColor = theme.errorBorder;
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

              <View style={styles.explanationBox}>
                <View style={styles.explanationHeader}>
                  <Ionicons
                    name="bulb-outline"
                    size={20}
                    color={theme.tipBorder}
                  />
                  <Text
                    style={[
                      styles.explanationTitle,
                      { color: theme.tipBorder },
                    ]}
                  >
                    הסבר הפתרון:
                  </Text>
                </View>
                <Text style={styles.explanationText}>
                  {question.explanation}
                </Text>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.homeButtonText}>חזרה למסך הראשי</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.backgroundColor,
    },
    scrollContainer: {
      padding: 20,
      paddingTop: 60,
      paddingBottom: 100,
      flexGrow: 1,
    },
    scoreHeader: {
      alignItems: "center",
      backgroundColor: theme.cardBackground,
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
      color: theme.textPrimary,
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
      borderTopColor: "#EDF2F7",
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
      color: theme.textSecondary,
      marginTop: 4,
    },
    reviewTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.textLight,
      textAlign: "right",
      marginBottom: 15,
    },
    questionCard: {
      backgroundColor: theme.cardBackground,
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
      color: theme.textSecondary,
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
      color: theme.textSecondary,
      textAlign: "right",
      marginBottom: 8,
    },
    questionText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.textPrimary,
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
      borderColor: "#E2E8F0",
    },
    optionCorrect: {
      backgroundColor: theme.successBackground,
      borderColor: theme.successBorder,
    },
    optionWrong: {
      backgroundColor: theme.errorBackground,
      borderColor: theme.errorBorder,
    },
    optionText: {
      fontSize: 16,
      textAlign: "right",
      flex: 1,
    },
    optionTextNeutral: {
      color: theme.textSecondary,
    },
    optionTextCorrect: {
      color: theme.successText,
      fontWeight: "600",
    },
    optionTextWrong: {
      color: theme.errorText,
      fontWeight: "600",
      textDecorationLine: "line-through",
    },
    explanationBox: {
      backgroundColor: theme.tipBackground,
      borderWidth: 1,
      borderColor: theme.tipBorder,
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
      marginRight: 8,
    },
    explanationText: {
      fontSize: 15,
      color: "#744210",
      textAlign: "right",
      lineHeight: 24,
    },
    homeButton: {
      backgroundColor: theme.primaryColor,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 10,
    },
    homeButtonText: {
      color: theme.textLight,
      fontSize: 18,
      fontWeight: "700",
    },
  });
