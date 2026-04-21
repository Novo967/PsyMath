import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

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
  const correctCount = userAnswers.filter((ans, idx) => ans === questions[idx].correctAnswerIndex).length;
  const unansweredCount = userAnswers.filter(ans => ans === null).length;
  const wrongCount = total - correctCount - unansweredCount;

  // בחירת צבע לציון
  const getScoreColor = () => {
    if (score >= 80) return '#38A169'; // ירוק
    if (score >= 55) return '#DD6B20'; // כתום
    return '#E53E3E'; // אדום
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* אזור הציון העליון */}
        <View style={styles.scoreHeader}>
          <Text style={styles.headerTitle}>סיכום סימולציה</Text>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
            <Text style={[styles.scoreText, { color: getScoreColor() }]}>{score}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#38A169' }]}>{correctCount}</Text>
              <Text style={styles.statLabel}>נכונות</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#E53E3E' }]}>{wrongCount}</Text>
              <Text style={styles.statLabel}>שגויות</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#718096' }]}>{unansweredCount}</Text>
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
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: isCorrect ? '#C6F6D5' : isUnanswered ? '#EDF2F7' : '#FED7D7' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: isCorrect ? '#2F855A' : isUnanswered ? '#4A5568' : '#C53030' }
                  ]}>
                    {isCorrect ? 'נכון' : isUnanswered ? 'לא נענה' : 'שגוי'}
                  </Text>
                </View>
              </View>

              <Text style={styles.topicText}>{question.topic}</Text>
              <Text style={styles.questionText}>{question.questionText}</Text>

              <View style={styles.optionsContainer}>
                {question.options.map((opt, optIndex) => {
                  const isThisCorrectOption = optIndex === question.correctAnswerIndex;
                  const isThisUserWrongOption = optIndex === userAnswer && !isCorrect;

                  let optionStyle = styles.optionNeutral;
                  let textStyle = styles.optionTextNeutral;
                  let iconName = "";
                  let iconColor = "";

                  if (isThisCorrectOption) {
                    optionStyle = styles.optionCorrect;
                    textStyle = styles.optionTextCorrect;
                    iconName = "checkmark-circle";
                    iconColor = "#38A169";
                  } else if (isThisUserWrongOption) {
                    optionStyle = styles.optionWrong;
                    textStyle = styles.optionTextWrong;
                    iconName = "close-circle";
                    iconColor = "#E53E3E";
                  }

                  return (
                    <View key={optIndex} style={[styles.optionBase, optionStyle]}>
                      <Text style={[styles.optionText, textStyle]}>{opt}</Text>
                      {iconName !== "" && (
                        <Ionicons name={iconName as any} size={22} color={iconColor} style={{ marginLeft: 10 }} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* קוביית ההסבר */}
              <View style={styles.explanationBox}>
                <View style={styles.explanationHeader}>
                  <Ionicons name="bulb-outline" size={20} color="#D69E2E" />
                  <Text style={styles.explanationTitle}>הסבר הפתרון:</Text>
                </View>
                <Text style={styles.explanationText}>{question.explanation}</Text>
              </View>

            </View>
          );
        })}

        {/* כפתור חזרה למסך הראשי */}
        <TouchableOpacity 
          style={styles.homeButton} 
          onPress={() => navigation.navigate('Home')} // ודא ששם המסך הראשי שלך הוא 'Home'
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
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  scoreHeader: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 40,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    paddingTop: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'right',
    marginBottom: 15,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  topicText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'right',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'right',
    marginBottom: 20,
    lineHeight: 26,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionBase: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  optionNeutral: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0',
  },
  optionCorrect: {
    backgroundColor: '#F0FFF4',
    borderColor: '#9AE6B4',
  },
  optionWrong: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEB2B2',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'right',
    flex: 1,
  },
  optionTextNeutral: {
    color: '#4A5568',
  },
  optionTextCorrect: {
    color: '#276749',
    fontWeight: '600',
  },
  optionTextWrong: {
    color: '#9B2C2C',
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  explanationBox: {
    backgroundColor: '#FFFFF0',
    borderWidth: 1,
    borderColor: '#FEFCBF',
    borderRadius: 12,
    padding: 15,
  },
  explanationHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B7791F',
    marginRight: 8,
  },
  explanationText: {
    fontSize: 15,
    color: '#744210',
    textAlign: 'right',
    lineHeight: 24,
  },
  homeButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});