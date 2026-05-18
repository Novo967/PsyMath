import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContexts";
import { db } from "../../firebaseConfig";
import { Question, Subject } from "../../types";

const SUBJECT_LABELS: Record<Subject | "all", string> = {
  all: "הכל",
  quantitative: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#48BB78",
  medium: "#ED8936",
  hard: "#F56565",
};

export default function QuestionListScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<Subject | "all">("all");
  const [searchText, setSearchText] = useState("");

  // Realtime listener
  useEffect(() => {
    const instituteId = userProfile?.instituteId || "default_institute";
    const q = query(
      collection(db, "questions"),
      where("instituteId", "==", instituteId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Question[];
      setQuestions(list);
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile?.instituteId]);

  const filteredQuestions = questions.filter((q) => {
    if (subjectFilter !== "all" && q.subject !== subjectFilter) return false;
    if (
      searchText &&
      !q.questionText.includes(searchText) &&
      !q.topic.includes(searchText)
    )
      return false;
    return true;
  });

  const handleDelete = (question: Question) => {
    Alert.alert(
      "מחיקת שאלה",
      `האם למחוק את השאלה "${question.questionText.substring(0, 40)}..."?`,
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "questions", question.id));
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("שגיאה", "לא הצלחנו למחוק את השאלה.");
            }
          },
        },
      ]
    );
  };

  const renderQuestion = ({ item }: { item: Question }) => (
    <TouchableOpacity
      style={styles.questionCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("QuestionForm", { questionId: item.id })}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.questionCardHeader}>
        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              { backgroundColor: "#EDE9FE" },
            ]}
          >
            <Text style={[styles.badgeText, { color: "#8B5CF6" }]}>
              {SUBJECT_LABELS[item.subject] || item.subject}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  (DIFFICULTY_COLORS[item.difficulty] || "#CBD5E0") + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: DIFFICULTY_COLORS[item.difficulty] || "#CBD5E0" },
              ]}
            >
              {item.difficulty}
            </Text>
          </View>
        </View>
        <Text style={styles.topicText}>{item.topic}</Text>
      </View>
      <Text style={styles.questionText} numberOfLines={2}>
        {item.questionText}
      </Text>
      {item.imageUrl ? (
        <View style={styles.hasImageBadge}>
          <Ionicons name="image-outline" size={14} color={theme.primaryColor} />
          <Text style={styles.hasImageText}>תמונה מצורפת</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={styles.loadingText}>טוען שאלות...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ניהול שאלות</Text>
          <Text style={styles.countText}>
            {filteredQuestions.length} שאלות
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="חפש לפי נושא או תוכן..."
            value={searchText}
            onChangeText={setSearchText}
            textAlign="right"
            placeholderTextColor={theme.textSecondary + "80"}
          />
        </View>

        {/* Subject filter chips */}
        <View style={styles.filterRow}>
          {(
            Object.keys(SUBJECT_LABELS) as Array<Subject | "all">
          ).map((key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterChip,
                subjectFilter === key && styles.filterChipActive,
              ]}
              onPress={() => setSubjectFilter(key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  subjectFilter === key && styles.filterChipTextActive,
                ]}
              >
                {SUBJECT_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Question list */}
        <FlatList
          data={filteredQuestions}
          keyExtractor={(item) => item.id}
          renderItem={renderQuestion}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color={theme.textSecondary + "60"}
              />
              <Text style={styles.emptyText}>לא נמצאו שאלות</Text>
            </View>
          }
        />

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: "#8B5CF6" }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("QuestionForm", {})}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.backgroundColor },
    container: { flex: 1, paddingHorizontal: 20, paddingTop: 50 },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: theme.textSecondary,
    },
    header: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.textLight,
    },
    countText: {
      fontSize: 14,
      color: theme.textLight,
      opacity: 0.8,
    },
    searchContainer: {
      flexDirection: "row-reverse",
      alignItems: "center",
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.textPrimary,
      marginRight: 10,
    },
    filterRow: {
      flexDirection: "row-reverse",
      gap: 8,
      marginBottom: 16,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.cardBackground,
    },
    filterChipActive: {
      backgroundColor: "#8B5CF6",
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    filterChipTextActive: {
      color: "#FFFFFF",
    },
    listContent: { paddingBottom: 100 },
    questionCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    questionCardHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    topicText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: "600",
      flex: 1,
      textAlign: "right",
    },
    badges: {
      flexDirection: "row",
      gap: 6,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
    },
    questionText: {
      fontSize: 15,
      color: theme.textPrimary,
      textAlign: "right",
      lineHeight: 22,
    },
    hasImageBadge: {
      flexDirection: "row-reverse",
      alignItems: "center",
      marginTop: 8,
      gap: 4,
    },
    hasImageText: {
      fontSize: 12,
      color: theme.primaryColor,
    },
    emptyContainer: {
      alignItems: "center",
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 12,
    },
    fab: {
      position: "absolute",
      bottom: 30,
      left: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#8B5CF6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  });
