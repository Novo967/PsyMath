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
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContexts";
import { db } from "../../firebaseConfig";
import { StudyChapter, Subject } from "../../types";

const SUBJECT_LABELS: Record<Subject | "all", string> = {
  all: "הכל",
  quantitative: "כמותי",
  verbal: "מילולי",
  english: "אנגלית",
};

export default function MaterialListScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();

  const [chapters, setChapters] = useState<StudyChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<Subject | "all">("all");

  useEffect(() => {
    const instituteId = userProfile?.instituteId || "default_institute";
    const q = query(
      collection(db, "study_chapters"),
      where("instituteId", "==", instituteId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }) as StudyChapter)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setChapters(list);
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile?.instituteId]);

  const filteredChapters = chapters.filter((ch) => {
    if (subjectFilter !== "all" && ch.subject !== subjectFilter) return false;
    return true;
  });

  const handleDelete = (chapter: StudyChapter) => {
    Alert.alert(
      "מחיקת פרק",
      `האם למחוק את הפרק "${chapter.title}"?`,
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "study_chapters", chapter.id));
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("שגיאה", "לא הצלחנו למחוק את הפרק.");
            }
          },
        },
      ]
    );
  };

  const renderChapter = ({ item }: { item: StudyChapter }) => (
    <TouchableOpacity
      style={styles.chapterCard}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("MaterialForm", { chapterId: item.id })
      }
      onLongPress={() => handleDelete(item)}
    >
      <Ionicons name="chevron-back" size={18} color="#CBD5E0" />
      <View style={styles.chapterContent}>
        <Text style={styles.chapterTitle}>{item.title}</Text>
        <View style={styles.chapterMeta}>
          <View style={[styles.badge, { backgroundColor: "#EDE9FE" }]}>
            <Text style={[styles.badgeText, { color: "#8B5CF6" }]}>
              {SUBJECT_LABELS[item.subject] || item.subject}
            </Text>
          </View>
          <Text style={styles.subTopicCount}>
            {item.subTopics?.length || 0} נושאי משנה
          </Text>
        </View>
      </View>
      <View style={styles.iconContainer}>
        <Ionicons
          name={(item.icon as any) || "book-outline"}
          size={24}
          color={theme.primaryColor}
        />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={styles.loadingText}>טוען חומרי לימוד...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>ניהול חומרי לימוד</Text>
          <Text style={styles.countText}>{filteredChapters.length} פרקים</Text>
        </View>

        {/* Subject filter */}
        <View style={styles.filterRow}>
          {(Object.keys(SUBJECT_LABELS) as Array<Subject | "all">).map(
            (key) => (
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
            )
          )}
        </View>

        <FlatList
          data={filteredChapters}
          keyExtractor={(item) => item.id}
          renderItem={renderChapter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="library-outline"
                size={48}
                color={theme.textSecondary + "60"}
              />
              <Text style={styles.emptyText}>לא נמצאו חומרי לימוד</Text>
            </View>
          }
        />

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: "#3B82F6" }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("MaterialForm", {})}
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
      backgroundColor: "#3B82F6",
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
    chapterCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 14,
      padding: 18,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    chapterContent: {
      flex: 1,
      alignItems: "flex-end",
      paddingHorizontal: 12,
    },
    chapterTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.textPrimary,
      marginBottom: 6,
      textAlign: "right",
    },
    chapterMeta: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
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
    subTopicCount: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: "#F0F7FF",
      justifyContent: "center",
      alignItems: "center",
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
      shadowColor: "#3B82F6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  });
