import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Dimensions, TouchableOpacity, Alert, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

// ממשק לתצורת נתוני סימולציה במסך
interface SimulationResult {
  id: string;
  date: string;
  score: number;
  change: string;
  changeNum: number;
}

export default function StatisticsScreen() {
  const viewToSnapshotRef = useRef<View>(null);

  // סטייט לנתונים מפיירבייס
  const [loading, setLoading] = useState(true);
  const [totalQuestionsSolved, setTotalQuestionsSolved] = useState(0);
  const [accuracyRate, setAccuracyRate] = useState(0);
  const [improvementTrend, setImprovementTrend] = useState("0%");
  const [lastSimulations, setLastSimulations] = useState<SimulationResult[]>([]);

  // סטייט להגדרות השיתוף
  const [showAccuracy, setShowAccuracy] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);
  const [showTrend, setShowTrend] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  // useFocusEffect מרענן את המסך בכל פעם שנכנסים אליו
  useFocusEffect(
    useCallback(() => {
      fetchStatistics();
    }, [])
  );

  const fetchStatistics = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    
    try {
      // 1. הבאת נתוני תרגול כלליים
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const totalPracticed = data.totalQuestionsPracticed || 0;
        const totalCorrect = data.totalCorrectAnswers || 0;
        
        setTotalQuestionsSolved(totalPracticed);

        if (totalPracticed > 0) {
          setAccuracyRate(Math.round((totalCorrect / totalPracticed) * 100));
        } else {
          setAccuracyRate(0);
        }
      }

      // 2. הבאת היסטוריית סימולציות
      const simsRef = collection(db, 'users', auth.currentUser.uid, 'simulations');
      // אנו מושכים מהישן לחדש כדי שנוכל לחשב מגמות בצורה כרונולוגית
      const q = query(simsRef, orderBy('timestamp', 'asc'));
      const simsSnap = await getDocs(q);

      let fetchedSims: any[] = [];
      simsSnap.forEach(doc => {
        fetchedSims.push({ id: doc.id, ...doc.data() });
      });

      let formattedSims: SimulationResult[] = [];
      let previousScore: number | null = null;

      // מעבר על המבחנים לחישוב שינוי (הפרש) בין כל מבחן לקודם
      for (let sim of fetchedSims) {
        let changeVal = previousScore !== null ? (sim.score - previousScore) : 0;
        let changeStr = changeVal > 0 ? `+${changeVal}` : `${changeVal}`; // פלוס לשיפור, מינוס או 0 רגיל
        
        let dateStr = "N/A";
        if (sim.timestamp) {
          const d = sim.timestamp.toDate();
          dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        }

        formattedSims.push({
          id: sim.id,
          date: dateStr,
          score: sim.score,
          change: changeStr,
          changeNum: changeVal
        });
        
        previousScore = sim.score;
      }

      // חישוב מגמה כללית (ההפרש בין הסימולציה הראשונה אי פעם לאחרונה)
      if (fetchedSims.length > 1) {
        const firstScore = fetchedSims[0].score;
        const lastScore = fetchedSims[fetchedSims.length - 1].score;
        const trendVal = lastScore - firstScore;
        setImprovementTrend(trendVal > 0 ? `+${trendVal}%` : `${trendVal}%`);
      } else {
        setImprovementTrend("0%");
      }

      // הופכים את המערך כדי להציג את החדשים ביותר למעלה, ולוקחים רק את ה-3 האחרונים ל-UI
      formattedSims.reverse();
      setLastSimulations(formattedSims.slice(0, 3));

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    try {
      const uri = await captureRef(viewToSnapshotRef, {
        format: 'png',
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'שתף את ההישגים שלך!',
          UTI: 'public.png',
        });
      } else {
        Alert.alert('שגיאה', 'שיתוף לא זמין במכשיר זה');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו ליצור תמונה לשיתוף');
    }
  };

  if (loading) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: 15, color: '#4A5568' }}>טוען נתונים...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Container to be captured by view-shot */}
        <View ref={viewToSnapshotRef} collapsable={false} style={styles.shareContainer}>
          <View style={styles.shareCardHeader}>
            <Text style={styles.shareCardTitle}>ההתקדמות שלי 🔥</Text>
            <Text style={styles.appName}>PsyMath</Text>
          </View>

          {(showAccuracy || showQuestions) && (
            <View style={styles.statsGrid}>
              {showAccuracy && (
                <View style={[styles.statBox, !showQuestions && { width: '100%' }]}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#48BB78" />
                  <Text style={styles.statValue}>{accuracyRate}%</Text>
                  <Text style={styles.statLabel}>דיוק כללי</Text>
                </View>
              )}
              {showQuestions && (
                <View style={[styles.statBox, !showAccuracy && { width: '100%' }]}>
                  <Ionicons name="flame-outline" size={24} color="#ED8936" />
                  <Text style={styles.statValue}>{totalQuestionsSolved}</Text>
                  <Text style={styles.statLabel}>שאלות שפתרת</Text>
                </View>
              )}
            </View>
          )}

          {showTrend && lastSimulations.length > 1 && (
            <View style={[
              styles.miniChartContainer, 
              improvementTrend.startsWith('-') && { backgroundColor: '#FFF5F5' }
            ]}>
               <View style={styles.trendInfo}>
                  <Text style={[styles.trendLabel, improvementTrend.startsWith('-') && { color: '#C53030' }]}>מגמת שיפור כללית</Text>
                  <Text style={[styles.trendValue, improvementTrend.startsWith('-') && { color: '#E53E3E' }]}>
                    {improvementTrend}
                  </Text>
               </View>
            </View>
          )}

          {showHistory && (
            <View style={styles.historyShareContainer}>
              <Text style={styles.listHeaderShare}>סימולציות אחרונות</Text>
              
              {lastSimulations.length === 0 ? (
                <Text style={styles.emptyStateText}>טרם ביצעת סימולציות.</Text>
              ) : (
                lastSimulations.map((sim) => (
                  <View key={sim.id} style={styles.simRowShare}>
                    <View style={[
                      styles.simChangeContainer,
                      sim.changeNum < 0 && { backgroundColor: '#FFF5F5' },
                      sim.changeNum === 0 && { backgroundColor: '#EDF2F7' }
                    ]}>
                      <Text style={[
                        styles.simChangeText,
                        sim.changeNum < 0 && { color: '#E53E3E' },
                        sim.changeNum === 0 && { color: '#718096' }
                      ]}>
                        {sim.change}
                      </Text>
                      <Ionicons 
                        name={sim.changeNum > 0 ? "trending-up" : sim.changeNum < 0 ? "trending-down" : "remove"} 
                        size={16} 
                        color={sim.changeNum > 0 ? "#48BB78" : sim.changeNum < 0 ? "#E53E3E" : "#718096"} 
                      />
                    </View>
                    <View style={styles.simInfo}>
                      <Text style={styles.simScore}>ציון: {sim.score}</Text>
                      <Text style={styles.simDate}>{sim.date}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
        
        {/* Configuration panel */}
        <View style={styles.editPanel}>
          <Text style={styles.editPanelTitle}>בחר מה לשתף :</Text>
          
          <View style={styles.toggleRow}>
            <Switch value={showAccuracy} onValueChange={setShowAccuracy} trackColor={{ true: '#0d78f2' }} thumbColor={ '#f4f3f4'}/>
            <Text style={styles.toggleLabel}>אחוז דיוק</Text>
          </View>
          
          <View style={styles.toggleRow}>
            <Switch value={showQuestions} onValueChange={setShowQuestions} trackColor={{ true: '#0d78f2' }}thumbColor={'#f4f3f4'} />
            <Text style={styles.toggleLabel}>מספר שאלות שפתרת</Text>
          </View>
          
          {lastSimulations.length > 1 && (
            <View style={styles.toggleRow}>
              <Switch value={showTrend} onValueChange={setShowTrend} trackColor={{ true: '#0d78f2' }} thumbColor={'#f4f3f4'}/>
              <Text style={styles.toggleLabel}>מגמת שיפור</Text>
            </View>
          )}

          <View style={styles.toggleRow}>
            <Switch value={showHistory} onValueChange={setShowHistory} trackColor={{ true: '#0d78f2' }}thumbColor={'#f4f3f4'} />
            <Text style={styles.toggleLabel}>היסטוריית סימולציות</Text>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={onShare}>
            <Ionicons name="share-social-outline" size={20} color="#FFF" />
            <Text style={styles.shareText}>שתף עכשיו</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  editPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40, // Increased bottom margin to ensure scrolling leaves space
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  editPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'right',
    marginBottom: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#4A5568',
    marginLeft: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  shareText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  shareContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  shareCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
    paddingBottom: 15,
  },
  shareCardTitle: { fontSize: 20, fontWeight: '800', color: '#2D3748' },
  appName: { fontSize: 16, fontWeight: '600', color: '#4A90E2', opacity: 0.7 },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    backgroundColor: '#F7FAFC',
    width: (width - 100) / 2,
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#2D3748', marginTop: 5 },
  statLabel: { fontSize: 12, color: '#718096', marginTop: 2 },
  miniChartContainer: {
    backgroundColor: '#F0FFF4',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  trendInfo: { flexDirection: 'row-reverse', alignItems: 'center' },
  trendLabel: { fontSize: 14, color: '#2F855A', marginLeft: 8 },
  trendValue: { fontSize: 16, fontWeight: '700', color: '#48BB78' },
  historyShareContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
    paddingTop: 15,
  },
  listHeaderShare: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'right',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  simRowShare: {
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  simInfo: { alignItems: 'flex-end' },
  simScore: { fontSize: 15, fontWeight: '700', color: '#2D3748' },
  simDate: { fontSize: 12, color: '#A0AEC0' },
  simChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  simChangeText: { color: '#38B2AC', fontWeight: '700', marginRight: 4, fontSize: 13 },
});