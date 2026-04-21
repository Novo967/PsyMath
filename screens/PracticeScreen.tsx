import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { doc, getDoc, updateDoc, increment, collection, getDocs, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Define the Question interface based on our JSON structure
interface Question {
  id: string;
  topic: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: string;
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function PracticeScreen() {
  const [userStatus, setUserStatus] = useState<{ isPremium: boolean, solvedToday: number } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for the questions fetched from Firestore
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  
  // State to track if the current question has already been counted towards the daily quota and stats
  const [hasCountedInQuota, setHasCountedInQuota] = useState(false);

  useEffect(() => {
    // Load both user limits and questions on mount
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
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const lastDate = data.lastQuestionDate ? new Date(data.lastQuestionDate).toDateString() : "";
        const today = new Date().toDateString();

        let solvedToday = data.questionsSolvedToday || 0;

        // If a day has passed - reset the counter in Firestore
        if (lastDate !== today) {
          await updateDoc(userRef, {
            questionsSolvedToday: 0,
            lastQuestionDate: new Date().toISOString()
          });
          solvedToday = 0;
        }

        setUserStatus({ isPremium: data.isPremium, solvedToday });
      }
    } catch (error) {
      console.error("Error checking limit:", error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'Questions'));
      const questionsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Question[];
      
      // Shuffle the questions before setting them to state
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

    // בודק אם זו הפעם הראשונה שהמשתמש לוחץ על "בדוק" בשאלה הנוכחית
    if (!hasCountedInQuota) {
      // חסימת משתמשים חינמיים שסיימו את המכסה היומית
      if (!userStatus.isPremium && userStatus.solvedToday >= 10) {
        Alert.alert(
          "המכסה היומית הסתיימה",
          "פתרת 10 שאלות היום. משתמשי פרימיום נהנים מתרגול ללא הגבלה!",
          [{ text: "הבנתי" }]
        );
        return;
      }

      // עדכון הסטטיסטיקות והמכסות בפיירבייס
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        
        // אובייקט העדכון הבסיסי
        const updateData: any = {
          questionsSolvedToday: increment(1),
          totalQuestionsPracticed: increment(1), // ספירת כלל השאלות שתורגלו
          practicedQuestions: arrayUnion(currentQuestion.id), // הוספת ה-ID של השאלה למערך ששומר את כל השאלות שבוצעו
          lastQuestionDate: new Date().toISOString()
        };

        // אם הוא צדק בניסיון הראשון, נוסיף לעדכון גם את מונה התשובות הנכונות
        if (isCorrect) {
          updateData.totalCorrectAnswers = increment(1);
        }

        await updateDoc(userRef, updateData);
        
        // עדכון סטייט מקומי
        setUserStatus(prev => prev ? { ...prev, solvedToday: prev.solvedToday + 1 } : null);
        setHasCountedInQuota(true); // מסמן שהשאלה כבר נספרה
      } catch (error) {
        console.error("Error updating stats:", error);
      }
    }

    // הצגת המשוב למשתמש (לאחר שהסטטיסטיקות עודכנו במידת הצורך)
    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setShowSolution(false);
      setHasCountedInQuota(false); // איפוס המעקב לקראת השאלה הבאה
    } else {
      Alert.alert("כל הכבוד!", "סיימת את כל השאלות במאגר הנוכחי.");
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} size="large" color="#007BFF" />;
  }

  // Handle empty database scenario
  if (questions.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.questionText}>אין שאלות במאגר כרגע.</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  // עזר לקביעה האם התשובה הנבחרת נכונה (רלוונטי רק כשהמשוב מוצג)
  const isCorrectAnswer = showFeedback && selectedAnswer === currentQuestion.correctAnswerIndex;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }} 
    >
      <Text style={styles.topicText}>
        {currentQuestion.topic}
      </Text>
      
      <Text style={styles.questionText}>{currentQuestion.questionText}</Text>

      {currentQuestion.options.map((opt, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.optionButton,
            selectedAnswer === index && styles.selectedOption
          ]}
          onPress={() => {
            setSelectedAnswer(index);
            // מסתיר את המשוב והפתרון במידה והמשתמש מנסה שוב לאחר טעות
            setShowFeedback(false);
            setShowSolution(false);
          }}
          disabled={isCorrectAnswer} // נועל את הכפתורים רק אם הוא כבר מצא את התשובה הנכונה
        >
          <Text style={styles.optionText}>{opt}</Text>
        </TouchableOpacity>
      ))}

      {!showFeedback ? (
        <TouchableOpacity style={styles.actionButton} onPress={handleCheck}>
          <Text style={styles.actionButtonText}>בדוק תשובה</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.feedbackContainer}>
          <Text style={isCorrectAnswer ? styles.correctText : styles.wrongText}>
            {isCorrectAnswer ? '✅ תשובה נכונה! יפה מאוד.' : '❌ תשובה שגויה. בחר תשובה אחרת ונסה שוב, או צפה בפתרון.'}
          </Text>
          
          <TouchableOpacity onPress={() => setShowSolution(true)} style={styles.solutionButton}>
            <Text style={styles.solutionButtonText}>הצג פתרון מלא</Text>
          </TouchableOpacity>
          
          {showSolution && (
            <View style={styles.solutionBox}>
              <Text style={styles.solutionBoxText}>{currentQuestion.explanation}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.actionButton, { marginTop: 20 }]} onPress={handleNextQuestion}>
            <Text style={styles.actionButtonText}>
              {currentIndex < questions.length - 1 ? 'לשאלה הבאה' : 'סיום תרגול'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  topicText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginBottom: 5,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 20,
    color: '#333',
    lineHeight: 28,
  },
  optionButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  selectedOption: {
    borderColor: '#007BFF',
    backgroundColor: '#E6F2FF',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'right',
  },
  actionButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  feedbackContainer: {
    marginTop: 20,
  },
  correctText: {
    fontSize: 18,
    color: 'green',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  wrongText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  solutionButton: {
    marginTop: 15,
  },
  solutionButtonText: {
    color: '#007BFF',
    fontSize: 16,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
  solutionBox: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  solutionBoxText: {
    fontSize: 16,
    textAlign: 'right',
    color: '#2e7d32',
    lineHeight: 24,
  },
});