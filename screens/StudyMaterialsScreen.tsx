import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useTheme } from "../contexts/ThemeContexts"; // ייבוא ה-Hook החדש
import { db } from "../firebaseConfig";

interface Chapter {
  id: string;
  title: string;
  icon: string;
}

const CACHE_KEY = "chapters_cache";
const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // שעה

export default function StudyMaterialsScreen() {
  const { theme } = useTheme(); // שליפת ערכת הנושא
  const styles = getStyles(theme); // יצירת סטיילים דינמיים

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setIsLoading(true);

      if (!forceRefresh) {
        const cachedDataStr = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedDataStr) {
          const cachedData = JSON.parse(cachedDataStr);
          const now = Date.now();
          if (now - cachedData.timestamp < CACHE_EXPIRATION_MS) {
            setChapters(cachedData.chapters);
            setIsLoading(false);
            return;
          }
        }
      }

      const querySnapshot = await getDocs(collection(db, "study_chapters"));
      const fetchedChapters: Chapter[] = [];

      querySnapshot.forEach((doc) => {
        fetchedChapters.push({
          id: doc.id,
          title: doc.data().title,
          icon: doc.data().icon,
          ...doc.data(),
        } as Chapter);
      });

      fetchedChapters.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setChapters(fetchedChapters);

      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          chapters: fetchedChapters,
        }),
      );
    } catch (error) {
      console.error("שגיאה בטעינת הפרקים:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchChapters(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>פרקי לימוד</Text>
          <Text style={styles.subtitle}>בחר נושא כדי להתחיל ללמוד</Text>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.textLight} />
            <Text style={styles.loaderText}>טוען חומרי לימוד...</Text>
          </View>
        ) : (
          <FlatList
            data={chapters}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={theme.textLight}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chapterCard}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate("ChapterScreen", { chapter: item })
                }
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color="#CBD5E0"
                  style={styles.chevron}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.chapterTitle}>{item.title}</Text>
                </View>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={(item.icon as any) || "book-outline"}
                    size={24}
                    color={theme.primaryColor}
                  />
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.backgroundColor,
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
    },
    headerContainer: {
      marginBottom: 30,
      alignItems: "flex-end",
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.textLight,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textLight,
    },
    listContainer: {
      paddingBottom: 20,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loaderText: {
      marginTop: 10,
      color: theme.textLight,
      fontSize: 16,
    },
    chapterCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    chevron: {
      marginRight: 10,
    },
    cardContent: {
      flex: 1,
      alignItems: "flex-end",
      paddingRight: 15,
    },
    chapterTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.textPrimary,
      textAlign: "right",
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#F0F7FF", // צבע רקע עדין לאייקון, נשאר קבוע או ניתן להוסיף ל-Theme אם תרצה
      justifyContent: "center",
      alignItems: "center",
    },
  });
