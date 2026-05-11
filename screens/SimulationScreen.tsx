import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
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
import { useTheme } from "../contexts/ThemeContexts"; // ייבוא ה-Hook
import { auth, db } from "../firebaseConfig";

interface Question {
  id: string;
  topic: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: string;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function SimulationScreen() {
  const { theme } = useTheme(); // שליפת ערכת הנושא
  const styles = getStyles(theme); // יצירת סטיילים דינמיים

  const navigation = useNavigation<any>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(20).fill(null),
  );

  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [isActive, setIsActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const totalQuestions = 20;

  useEffect(() => {
    const fetchAndPrepareQuestions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Questions"));
        const allQuestions = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Question[];

        const easyQs = allQuestions.filter((q) => q.difficulty === "easy");
        const mediumQs = allQuestions.filter((q) => q.difficulty === "medium");
        const hardQs = allQuestions.filter((q) => q.difficulty === "hard");

        const selectedEasy = shuffleArray(easyQs).slice(0, 6);
        const selectedMedium = shuffleArray(mediumQs).slice(0, 8);
        const selectedHard = shuffleArray(hardQs).slice(0, 6);

        let finalQuestions = [
          ...selectedEasy,
          ...selectedMedium,
          ...selectedHard,
        ];

        if (finalQuestions.length < 20 && allQuestions.length >= 20) {
          const remaining = shuffleArray(
            allQuestions.filter(
              (q) => !finalQuestions.find((fq) => fq.id === q.id),
            ),
          );
          finalQuestions = [
            ...finalQuestions,
            ...remaining.slice(0, 20 - finalQuestions.length),
          ];

          const diffMap: Record<string, number> = {
            easy: 1,
            medium: 2,
            hard: 3,
          };
          finalQuestions.sort(
            (a, b) =>
              (diffMap[a.difficulty] || 2) - (diffMap[b.difficulty] || 2),
          );
        }

        setQuestions(finalQuestions);
        setIsLoading(false);
        setIsActive(true);
      } catch (error) {
        console.error("Error fetching simulation questions:", error);
        Alert.alert("שגיאה", "לא הצלחנו לטעון את המבחן. אנא נסה שוב.");
        navigation.goBack();
      }
    };

    fetchAndPrepareQuestions();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (hasSubmitted || isSubmitting) return;
      e.preventDefault();
      Alert.alert(
        "לצאת מהסימולציה?",
        "האם אתה בטוח שברצונך לצאת? התקדמות המבחן לא תישמר.",
        [
          { text: "הישאר במבחן", style: "cancel", onPress: () => {} },
          {
            text: "כן, צא",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, hasSubmitted, isSubmitting]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimeUp();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const submitExamData = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    setIsActive(false);
    setHasSubmitted(true);

    try {
      let correctAnswersCount = 0;
      const examResults = questions.map((q, index) => {
        const isCorrect = answers[index] === q.correctAnswerIndex;
        if (isCorrect) correctAnswersCount++;
        return {
          questionId: q.id,
          userAnswer: answers[index],
          isCorrect: isCorrect,
        };
      });

      const score = Math.round(
        (correctAnswersCount / questions.length) * 100 + 50,
      );

      const simulationData = {
        timestamp: serverTimestamp(),
        score: score,
        correctCount: correctAnswersCount,
        totalQuestions: questions.length,
        results: examResults,
      };

      const userSimulationsRef = collection(
        db,
        "users",
        auth.currentUser.uid,
        "simulations",
      );
      await addDoc(userSimulationsRef, simulationData);

      navigation.replace("SimulationResultsScreen", {
        questions: questions,
        userAnswers: answers,
        score: score,
      });
    } catch (error) {
      console.error("Error saving simulation:", error);
      navigation.replace("SimulationResultsScreen", {
        questions,
        userAnswers: answers,
      });
    }
  };

  const handleTimeUp = () => {
    Alert.alert("הזמן נגמר!", "הסימולציה הסתיימה. מעביר אותך למסך התוצאות...", [
      { text: "הבנתי", onPress: () => submitExamData() },
    ]);
  };

  const finishSimulation = () => {
    const unansweredCount = answers.filter((a) => a === null).length;
    const warningText =
      unansweredCount > 0
        ? `\n\nשים לב: נותרו לך ${unansweredCount} שאלות ללא מענה!`
        : "";

    Alert.alert(
      "סיום סימולציה",
      `האם אתה בטוח שברצונך להגיש את המבחן?${warningText}`,
      [
        { text: "ביטול", style: "cancel" },
        { text: "כן, הגש", style: "destructive", onPress: submitExamData },
      ],
    );
  };

  const handleNext = () => {
    setCurrentQuestionIndex((prev) => Math.min(questions.length, prev + 1));
  };

  const handlePrev = () => {
    setCurrentQuestionIndex((prev) => Math.max(1, prev - 1));
  };

  const handleSelectOption = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex - 1] = optionIndex;
    setAnswers(newAnswers);
  };

  if (isLoading || isSubmitting) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primaryColor} />
        <Text
          style={{ marginTop: 20, fontSize: 18, color: theme.textSecondary }}
        >
          {isSubmitting ? "מגיש את המבחן..." : "בונה לך סימולציה..."}
        </Text>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex - 1];
  const progressPercentage = (currentQuestionIndex / questions.length) * 100;
  const currentAnswer = answers[currentQuestionIndex - 1];
  const isLastQuestion = currentQuestionIndex === questions.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topStatus}>
          <View style={styles.timeContainer}>
            <Ionicons
              name="timer-outline"
              size={20}
              color={timeLeft < 60 ? theme.ruleBorder : theme.textSecondary}
            />
            <Text
              style={[
                styles.timerText,
                timeLeft < 60 && { color: theme.ruleBorder },
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
          </View>
          <Text style={styles.progressText}>
            שאלה {currentQuestionIndex} מתוך {questions.length}
          </Text>
        </View>

        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercentage}%` },
            ]}
          />
        </View>

        <ScrollView
          style={styles.questionScroll}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View style={styles.questionCard}>
            <Text style={styles.topicBadge}>{currentQuestion.topic}</Text>
            <Text style={styles.questionText}>
              {currentQuestion.questionText}
            </Text>

            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((opt, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    currentAnswer === index && {
                      backgroundColor: "#EBF4FF",
                      borderColor: theme.primaryColor,
                    },
                  ]}
                  onPress={() => handleSelectOption(index)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      currentAnswer === index && {
                        color: theme.secondaryColor,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {opt}
                  </Text>
                  <View
                    style={[
                      styles.radioCircle,
                      currentAnswer === index && {
                        borderColor: theme.primaryColor,
                        borderWidth: 5,
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.textSecondary}
              />
              <Text style={styles.infoText}>
                המשוב והתשובות הנכונות יוצגו רק בסיום הפרק כדי לדמות מבחן אמיתי.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomControls}>
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.prevButton,
                currentQuestionIndex === 1 && styles.disabledButton,
              ]}
              activeOpacity={0.8}
              onPress={handlePrev}
              disabled={currentQuestionIndex === 1}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.primaryColor}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[styles.actionButtonText, { color: theme.primaryColor }]}
              >
                הקודם
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                isLastQuestion && {
                  backgroundColor: theme.successBorder,
                  shadowColor: theme.successBorder,
                },
              ]}
              activeOpacity={0.8}
              onPress={isLastQuestion ? finishSimulation : handleNext}
            >
              <Text style={styles.actionButtonText}>
                {isLastQuestion ? "הגש סימולציה" : "הבא"}
              </Text>
              <Ionicons
                name={isLastQuestion ? "checkmark-outline" : "chevron-back"}
                size={20}
                color={theme.textLight}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.backgroundColor },
    container: { flex: 1, paddingHorizontal: 20, paddingTop: 40 },
    topStatus: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 15,
    },
    timeContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.cardBackground,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    timerText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.textSecondary,
      marginLeft: 6,
    },
    progressText: { fontSize: 15, fontWeight: "600", color: theme.textLight },
    progressBarBackground: {
      height: 6,
      backgroundColor: "#E2E8F0",
      borderRadius: 3,
      marginBottom: 15,
      overflow: "hidden",
      flexDirection: "row-reverse",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: theme.primaryColor,
      borderRadius: 3,
    },
    questionScroll: { flex: 1 },
    questionCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 15,
      elevation: 3,
      marginBottom: 10,
    },
    topicBadge: {
      alignSelf: "flex-end",
      backgroundColor: "#EBF4FF",
      color: theme.primaryColor,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 15,
      overflow: "hidden",
    },
    questionText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.textPrimary,
      textAlign: "right",
      marginBottom: 30,
      lineHeight: 30,
    },
    optionsContainer: { width: "100%", marginBottom: 30 },
    optionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      backgroundColor: "#F7FAFC",
      borderWidth: 2,
      borderColor: "#EDF2F7",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    optionText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "right",
      marginRight: 15,
      flex: 1,
    },
    radioCircle: {
      height: 20,
      width: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: "#CBD5E0",
      alignItems: "center",
      justifyContent: "center",
    },
    infoBox: {
      flexDirection: "row-reverse",
      alignItems: "center",
      backgroundColor: "#F7FAFC",
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "right",
      marginRight: 10,
      flex: 1,
    },
    bottomControls: { paddingBottom: 40, paddingTop: 10 },
    navRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      marginBottom: 15,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      backgroundColor: theme.primaryColor,
      flexDirection: "row-reverse",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 14,
      borderRadius: 14,
      shadowColor: theme.primaryColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
    prevButton: { backgroundColor: "#EBF4FF", shadowOpacity: 0, elevation: 0 },
    actionButtonText: {
      color: theme.textLight,
      fontSize: 16,
      fontWeight: "700",
    },
    disabledButton: { opacity: 0.4 },
  });
