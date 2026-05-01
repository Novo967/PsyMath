import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import { RootStackParamList } from "../App";
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

export default function PracticeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // הרחבת הסטייט כדי שישמור גם האם תקופת הניסיון פעילה
  const [userStatus, setUserStatus] = useState<{
    isPremium: boolean;
    solvedToday: number;
    isTrialActive: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const [hasCountedInQuota, setHasCountedInQuota] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await checkUserLimit();
      await fetchQuestions();
      setLoading(false);
    };

    loadData();
  }, []);

  const checkUserLimit = async () => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      const customerInfo = await Purchases.getCustomerInfo();
      const isUserPremium = !!customerInfo.entitlements.active["premium"];

      if (userSnap.exists()) {
        const data = userSnap.data();
        const lastDate = data.lastQuestionDate
          ? new Date(data.lastQuestionDate).toDateString()
          : "";
        const today = new Date().toDateString();

        let solvedToday = data.questionsSolvedToday || 0;

        // בדיקת תוקף הניסיון בפיירבייס
        const trialEndsAt = data.trialEndsAt;
        const isTrialActive = trialEndsAt
          ? new Date(trialEndsAt) > new Date()
          : false;

        const updateObj: any = { isPremium: isUserPremium };

        if (lastDate !== today) {
          updateObj.questionsSolvedToday = 0;
          updateObj.lastQuestionDate = new Date().toISOString();
          solvedToday = 0;
        }

        await updateDoc(userRef, updateObj);

        // עדכון הסטייט כולל משתנה הניסיון
        setUserStatus({ isPremium: isUserPremium, solvedToday, isTrialActive });
      }
    } catch (error) {
      console.error("Error checking limit:", error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "Questions"));
      const questionsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Question[];

      setQuestions(shuffleArray(questionsList));
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  const handleCheck = async () => {
    if (selectedAnswer === null || !userStatus || !auth.currentUser) {
      Alert.alert("שים לב", "נא לבחור תשובה לפני הבדיקה");
      return;
    }

    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswerIndex;

    if (!hasCountedInQuota) {
      // למשתמש יש גישה חופשית אם הוא פרימיום *או* אם הוא בתקופת הניסיון שלו
      const hasFullAccess = userStatus.isPremium || userStatus.isTrialActive;

      if (!hasFullAccess && userStatus.solvedToday >= 10) {
        Alert.alert(
          "המכסה היומית הסתיימה",
          "פתרת 10 שאלות היום. משתמשי פרימיום נהנים מתרגול ללא הגבלה!",
          [
            { text: "הבנתי", style: "cancel" },
            {
              text: "שדרג לפרימיום",
              onPress: () => navigation.navigate("Paywall" as any),
            },
          ],
        );
        return;
      }

      try {
        const userRef = doc(db, "users", auth.currentUser.uid);

        const updateData: any = {
          questionsSolvedToday: increment(1),
          totalQuestionsPracticed: increment(1),
          practicedQuestions: arrayUnion(currentQuestion.id),
          lastQuestionDate: new Date().toISOString(),
        };

        if (isCorrect) {
          updateData.totalCorrectAnswers = increment(1);
        }

        await updateDoc(userRef, updateData);

        setUserStatus((prev) =>
          prev ? { ...prev, solvedToday: prev.solvedToday + 1 } : null,
        );
        setHasCountedInQuota(true);
      } catch (error) {
        console.error("Error updating stats:", error);
      }
    }

    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setShowSolution(false);
      setHasCountedInQuota(false);
    } else {
      Alert.alert("כל הכבוד!", "סיימת את כל השאלות במאגר הנוכחי.");
    }
  };

  if (loading) {
    return (
      <ActivityIndicator
        style={{ flex: 1, justifyContent: "center" }}
        size="large"
        color="#3182CE"
      />
    );
  }

  if (questions.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={styles.questionText}>אין שאלות במאגר כרגע.</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isCorrectAnswer =
    showFeedback && selectedAnswer === currentQuestion.correctAnswerIndex;

  const getOptionStyle = (index: number) => {
    if (!showFeedback) {
      return selectedAnswer === index
        ? [styles.optionButton, styles.selectedOption]
        : styles.optionButton;
    }

    if (
      selectedAnswer === index &&
      selectedAnswer === currentQuestion.correctAnswerIndex
    ) {
      return [styles.optionButton, styles.correctOption];
    }

    if (
      selectedAnswer === index &&
      selectedAnswer !== currentQuestion.correctAnswerIndex
    ) {
      return [styles.optionButton, styles.wrongOption];
    }

    return styles.optionButton;
  };

  const getOptionTextStyle = (index: number) => {
    if (!showFeedback && selectedAnswer === index)
      return styles.selectedOptionText;
    if (
      showFeedback &&
      selectedAnswer === index &&
      selectedAnswer === currentQuestion.correctAnswerIndex
    )
      return styles.correctOptionText;
    if (
      showFeedback &&
      selectedAnswer === index &&
      selectedAnswer !== currentQuestion.correctAnswerIndex
    )
      return styles.wrongOptionText;
    return styles.optionText;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topicBadge}>
          <Text style={styles.topicText}>{currentQuestion.topic}</Text>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>
            {currentQuestion.questionText}
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((opt, index) => (
            <TouchableOpacity
              key={index}
              style={getOptionStyle(index)}
              onPress={() => {
                setSelectedAnswer(index);
                setShowFeedback(false);
                setShowSolution(false);
              }}
              disabled={isCorrectAnswer}
              activeOpacity={0.7}
            >
              <Text style={getOptionTextStyle(index)}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showFeedback && (
          <View style={styles.feedbackContainer}>
            <Text
              style={
                isCorrectAnswer
                  ? styles.correctFeedbackText
                  : styles.wrongFeedbackText
              }
            >
              {isCorrectAnswer
                ? "✅ תשובה נכונה! יפה מאוד."
                : "❌ תשובה שגויה. בחר תשובה אחרת ונסה שוב, או צפה בפתרון."}
            </Text>

            <TouchableOpacity
              onPress={() => setShowSolution(!showSolution)}
              style={styles.solutionButton}
            >
              <Text style={styles.solutionButtonText}>
                {showSolution ? "הסתר פתרון" : "הצג פתרון מלא"}
              </Text>
            </TouchableOpacity>

            {showSolution && (
              <View style={styles.solutionBox}>
                <Text style={styles.solutionBoxText}>
                  {currentQuestion.explanation}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.fixedBottomContainer}>
        {!showFeedback ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCheck}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>בדוק תשובה</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.nextButton]}
            onPress={handleNextQuestion}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>
              {currentIndex < questions.length - 1
                ? "לשאלה הבאה"
                : "סיום תרגול"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#9dbde9",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  topicBadge: {
    alignSelf: "flex-end",
    backgroundColor: "#E2E8F0",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 16,
  },
  topicText: {
    fontSize: 13,
    color: "#4A5568",
    fontWeight: "600",
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "right",
    color: "#2D3748",
    lineHeight: 30,
  },
  optionsContainer: {
    marginBottom: 10,
  },
  optionButton: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: "#3182CE",
    backgroundColor: "#EBF8FF",
  },
  correctOption: {
    borderColor: "#48BB78",
    backgroundColor: "#F0FFF4",
  },
  wrongOption: {
    borderColor: "#F56565",
    backgroundColor: "#FFF5F5",
  },
  optionText: {
    fontSize: 16,
    textAlign: "right",
    color: "#4A5568",
  },
  selectedOptionText: {
    fontSize: 16,
    textAlign: "right",
    color: "#2B6CB0",
    fontWeight: "600",
  },
  correctOptionText: {
    fontSize: 16,
    textAlign: "right",
    color: "#276749",
    fontWeight: "600",
  },
  wrongOptionText: {
    fontSize: 16,
    textAlign: "right",
    color: "#9B2C2C",
    fontWeight: "600",
  },
  fixedBottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    paddingTop: 10,
    backgroundColor: "#9dbde9",
  },
  actionButton: {
    backgroundColor: "#3182CE",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#3182CE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButton: {
    backgroundColor: "#2D3748",
    shadowColor: "#2D3748",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  feedbackContainer: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  correctFeedbackText: {
    fontSize: 16,
    color: "#38A169",
    textAlign: "right",
    fontWeight: "bold",
    marginBottom: 10,
  },
  wrongFeedbackText: {
    fontSize: 16,
    color: "#E53E3E",
    textAlign: "right",
    fontWeight: "600",
    marginBottom: 10,
  },
  solutionButton: {
    paddingVertical: 8,
    marginTop: 5,
  },
  solutionButtonText: {
    color: "#3182CE",
    fontSize: 15,
    textAlign: "right",
    fontWeight: "600",
  },
  solutionBox: {
    backgroundColor: "#EBF8FF",
    padding: 20,
    borderRadius: 12,
    marginTop: 15,
    width: "100%",
  },
  solutionBoxText: {
    fontSize: 16,
    textAlign: "right",
    color: "#2C5282",
    lineHeight: 26,
  },
});
