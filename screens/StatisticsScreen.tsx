import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Sharing from "expo-sharing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { useTheme } from "../contexts/ThemeContexts"; // ייבוא ה-Hook החדש
import { auth, db } from "../firebaseConfig";

const { width } = Dimensions.get("window");

interface Question {
  id: string;
  topic: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: string;
}

interface SimulationResult {
  id: string;
  date: string;
  score: number;
  change: string;
  changeNum: number;
  rawResults: any[];
}

export default function StatisticsScreen() {
  const { theme } = useTheme(); // שליפת ערכת הנושא
  const styles = getStyles(theme); // יצירת סטיילים דינמיים

  const viewToSnapshotRef = useRef<View>(null);
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [totalQuestionsSolved, setTotalQuestionsSolved] = useState(0);
  const [accuracyRate, setAccuracyRate] = useState(0);
  const [improvementTrend, setImprovementTrend] = useState("0%");

  const [allSimulations, setAllSimulations] = useState<SimulationResult[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const [showAccuracy, setShowAccuracy] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);
  const [showTrend, setShowTrend] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchStatistics();
    }, []),
  );

  const fetchStatistics = async () => {
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
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

      const simsRef = collection(
        db,
        "users",
        auth.currentUser.uid,
        "simulations",
      );
      const q = query(simsRef, orderBy("timestamp", "asc"));
      const simsSnap = await getDocs(q);

      let fetchedSims: any[] = [];
      simsSnap.forEach((doc) => {
        fetchedSims.push({ id: doc.id, ...doc.data() });
      });

      let formattedSims: SimulationResult[] = [];
      let previousScore: number | null = null;

      for (let sim of fetchedSims) {
        let changeVal = previousScore !== null ? sim.score - previousScore : 0;
        let changeStr = changeVal > 0 ? `+${changeVal}` : `${changeVal}`;

        let dateStr = "N/A";
        if (sim.timestamp) {
          const d = sim.timestamp.toDate();
          dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        }

        formattedSims.push({
          id: sim.id,
          date: dateStr,
          score: sim.score,
          change: changeStr,
          changeNum: changeVal,
          rawResults: sim.results || [],
        });

        previousScore = sim.score;
      }

      if (fetchedSims.length > 1) {
        const firstScore = fetchedSims[0].score;
        const lastScore = fetchedSims[fetchedSims.length - 1].score;
        const trendVal = lastScore - firstScore;
        setImprovementTrend(trendVal > 0 ? `+${trendVal}%` : `${trendVal}%`);
      } else {
        setImprovementTrend("0%");
      }

      formattedSims.reverse();
      setAllSimulations(formattedSims);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulationPress = async (sim: SimulationResult) => {
    if (!sim.rawResults || sim.rawResults.length === 0) {
      Alert.alert("שגיאה", "לא נמצאו נתונים מפורטים עבור סימולציה זו.");
      return;
    }

    setIsFetchingDetails(true);
    try {
      const questionPromises = sim.rawResults.map(async (res) => {
        const qRef = doc(db, "Questions", res.questionId);
        const qSnap = await getDoc(qRef);
        if (qSnap.exists()) {
          return { id: qSnap.id, ...qSnap.data() } as Question;
        }
        return null;
      });

      const fetchedQuestions = await Promise.all(questionPromises);

      const validQuestions: Question[] = [];
      const validUserAnswers: (number | null)[] = [];

      for (let i = 0; i < fetchedQuestions.length; i++) {
        if (fetchedQuestions[i] !== null) {
          validQuestions.push(fetchedQuestions[i]!);
          validUserAnswers.push(sim.rawResults[i].userAnswer);
        }
      }

      if (validQuestions.length === 0) {
        Alert.alert("שגיאה", "לא הצלחנו לשחזר את השאלות של מבחן זה.");
        return;
      }

      navigation.navigate("SimulationResultsScreen", {
        questions: validQuestions,
        userAnswers: validUserAnswers,
        score: sim.score,
      });
    } catch (error) {
      console.error("Error loading simulation details:", error);
      Alert.alert("שגיאה", "לא הצלחנו לטעון את פרטי המבחן. אנא נסה שוב.");
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const onShare = async () => {
    try {
      const uri = await captureRef(viewToSnapshotRef, {
        format: "png",
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "שתף את ההישגים שלך!",
          UTI: "public.png",
        });
      } else {
        Alert.alert("שגיאה", "שיתוף לא זמין במכשיר זה");
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("שגיאה", "לא הצלחנו ליצור תמונה לשיתוף");
    }
  };

  const simsToDisplay = showAllHistory
    ? allSimulations
    : allSimulations.slice(0, 3);

  if (loading) {
    return (
      <View
        style={[
          styles.safeArea,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primaryColor} />
        <Text style={{ marginTop: 15, color: theme.textSecondary }}>
          טוען נתונים...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {isFetchingDetails && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={styles.loadingOverlayText}>מכין את פרטי המבחן...</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          ref={viewToSnapshotRef}
          collapsable={false}
          style={styles.shareContainer}
        >
          <View style={styles.shareCardHeader}>
            <Text style={styles.shareCardTitle}>ההתקדמות שלי 🔥</Text>
          </View>

          {(showAccuracy || showQuestions) && (
            <View style={styles.statsGrid}>
              {showAccuracy && (
                <View
                  style={[styles.statBox, !showQuestions && { width: "100%" }]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color={theme.successBorder}
                  />
                  <Text style={styles.statValue}>{accuracyRate}%</Text>
                  <Text style={styles.statLabel}>דיוק כללי</Text>
                </View>
              )}
              {showQuestions && (
                <View
                  style={[styles.statBox, !showAccuracy && { width: "100%" }]}
                >
                  <Ionicons name="flame-outline" size={24} color="#ED8936" />
                  <Text style={styles.statValue}>{totalQuestionsSolved}</Text>
                  <Text style={styles.statLabel}>שאלות שפתרת</Text>
                </View>
              )}
            </View>
          )}

          {showTrend && allSimulations.length > 1 && (
            <View
              style={[
                styles.miniChartContainer,
                improvementTrend.startsWith("-") && {
                  backgroundColor: theme.errorBackground,
                },
              ]}
            >
              <View style={styles.trendInfo}>
                <Text
                  style={[
                    styles.trendLabel,
                    improvementTrend.startsWith("-") && {
                      color: theme.errorText,
                    },
                  ]}
                >
                  מגמת שיפור כללית
                </Text>
                <Text
                  style={[
                    styles.trendValue,
                    improvementTrend.startsWith("-") && {
                      color: theme.errorBorder,
                    },
                  ]}
                >
                  {improvementTrend}
                </Text>
              </View>
            </View>
          )}

          {showHistory && (
            <View style={styles.historyShareContainer}>
              <Text style={styles.listHeaderShare}>סימולציות אחרונות</Text>

              {allSimulations.length === 0 ? (
                <Text style={styles.emptyStateText}>טרם ביצעת סימולציות.</Text>
              ) : (
                <>
                  {simsToDisplay.map((sim) => (
                    <TouchableOpacity
                      key={sim.id}
                      style={styles.simRowShare}
                      activeOpacity={0.7}
                      onPress={() => handleSimulationPress(sim)}
                      disabled={isFetchingDetails}
                    >
                      <View
                        style={[
                          styles.simChangeContainer,
                          sim.changeNum < 0 && {
                            backgroundColor: theme.errorBackground,
                          },
                          sim.changeNum === 0 && { backgroundColor: "#EDF2F7" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.simChangeText,
                            sim.changeNum < 0 && { color: theme.errorText },
                            sim.changeNum === 0 && {
                              color: theme.textSecondary,
                            },
                          ]}
                        >
                          {sim.change}
                        </Text>
                        <Ionicons
                          name={
                            sim.changeNum > 0
                              ? "trending-up"
                              : sim.changeNum < 0
                                ? "trending-down"
                                : "remove"
                          }
                          size={16}
                          color={
                            sim.changeNum > 0
                              ? theme.successBorder
                              : sim.changeNum < 0
                                ? theme.errorBorder
                                : theme.textSecondary
                          }
                        />
                      </View>
                      <View style={styles.simInfo}>
                        <Text style={styles.simScore}>ציון: {sim.score}</Text>
                        <Text style={styles.simDate}>{sim.date}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {allSimulations.length > 3 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => setShowAllHistory(!showAllHistory)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.showMoreText,
                          { color: theme.primaryColor },
                        ]}
                      >
                        {showAllHistory ? "הצג פחות" : "הצג את כל ההיסטוריה"}
                      </Text>
                      <Ionicons
                        name={showAllHistory ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={theme.primaryColor}
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {!isShareMenuOpen ? (
          <TouchableOpacity
            style={[
              styles.mainShareButton,
              {
                backgroundColor: theme.primaryColor,
                shadowColor: theme.primaryColor,
              },
            ]}
            onPress={() => setIsShareMenuOpen(true)}
          >
            <Ionicons
              name="share-social-outline"
              size={22}
              color={theme.textLight}
            />
            <Text
              style={[styles.mainShareButtonText, { color: theme.textLight }]}
            >
              {" "}
              לא תשוויץ קצת?{" "}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editPanel}>
            <View style={styles.editPanelHeader}>
              <TouchableOpacity
                onPress={() => setIsShareMenuOpen(false)}
                style={styles.closeMenuButton}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={26}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.editPanelTitle}>בחר מה לשתף:</Text>
            </View>

            <View style={styles.toggleRow}>
              <Switch
                value={showAccuracy}
                onValueChange={setShowAccuracy}
                trackColor={{ true: theme.primaryColor }}
                thumbColor={"#f4f3f4"}
              />
              <Text style={styles.toggleLabel}>אחוז דיוק</Text>
            </View>

            <View style={styles.toggleRow}>
              <Switch
                value={showQuestions}
                onValueChange={setShowQuestions}
                trackColor={{ true: theme.primaryColor }}
                thumbColor={"#f4f3f4"}
              />
              <Text style={styles.toggleLabel}>מספר שאלות שפתרת</Text>
            </View>

            {allSimulations.length > 1 && (
              <View style={styles.toggleRow}>
                <Switch
                  value={showTrend}
                  onValueChange={setShowTrend}
                  trackColor={{ true: theme.primaryColor }}
                  thumbColor={"#f4f3f4"}
                />
                <Text style={styles.toggleLabel}>מגמת שיפור</Text>
              </View>
            )}

            <View style={styles.toggleRow}>
              <Switch
                value={showHistory}
                onValueChange={setShowHistory}
                trackColor={{ true: theme.primaryColor }}
                thumbColor={"#f4f3f4"}
              />
              <Text style={styles.toggleLabel}>היסטוריית סימולציות</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.shareButton,
                { backgroundColor: theme.successBorder },
              ]}
              onPress={onShare}
            >
              <Ionicons
                name="paper-plane-outline"
                size={20}
                color={theme.textLight}
              />
              <Text style={[styles.shareText, { color: theme.textLight }]}>
                שתף עכשיו
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.backgroundColor },
    scrollView: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 80,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255, 255, 255, 0.85)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    loadingOverlayText: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: "700",
      color: theme.textPrimary,
    },

    mainShareButton: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 16,
      marginBottom: 20,
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 4,
    },
    mainShareButtonText: {
      marginRight: 10,
      fontWeight: "700",
      fontSize: 18,
    },

    editPanel: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    editPanelHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    editPanelTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.textPrimary,
    },
    closeMenuButton: {
      padding: 4,
    },
    toggleRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      marginBottom: 12,
    },
    toggleLabel: {
      fontSize: 15,
      color: theme.textSecondary,
      marginLeft: 12,
    },
    shareButton: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 10,
    },
    shareText: {
      marginRight: 8,
      fontWeight: "700",
      fontSize: 16,
    },

    shareContainer: {
      backgroundColor: theme.cardBackground,
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    shareCardHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: "#F7FAFC",
      paddingBottom: 15,
    },
    shareCardTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.textPrimary,
    },
    statsGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 15,
    },
    statBox: {
      backgroundColor: "#F7FAFC",
      width: (width - 100) / 2,
      padding: 16,
      borderRadius: 18,
      alignItems: "center",
    },
    statValue: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.textPrimary,
      marginTop: 5,
    },
    statLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    miniChartContainer: {
      backgroundColor: theme.successBackground,
      padding: 12,
      borderRadius: 14,
      alignItems: "center",
      marginBottom: 10,
    },
    trendInfo: { flexDirection: "row-reverse", alignItems: "center" },
    trendLabel: { fontSize: 14, color: theme.successText, marginLeft: 8 },
    trendValue: { fontSize: 16, fontWeight: "700", color: theme.successBorder },
    historyShareContainer: {
      marginTop: 15,
      borderTopWidth: 1,
      borderTopColor: "#F7FAFC",
      paddingTop: 15,
    },
    listHeaderShare: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.textPrimary,
      textAlign: "right",
      marginBottom: 12,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
      marginTop: 10,
      marginBottom: 10,
    },
    simRowShare: {
      backgroundColor: "#F7FAFC",
      padding: 12,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    simInfo: { alignItems: "flex-end" },
    simScore: { fontSize: 15, fontWeight: "700", color: theme.textPrimary },
    simDate: { fontSize: 12, color: theme.textSecondary },
    simChangeContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.successBackground,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    simChangeText: {
      color: theme.successText,
      fontWeight: "700",
      marginRight: 4,
      fontSize: 13,
    },
    showMoreButton: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      marginTop: 5,
    },
    showMoreText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
  });
