import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebaseConfig";

interface Chapter {
  id: string;
  title: string;
  icon: string;
}

const CACHE_KEY = "chapters_cache";
const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // שעה

export default function StudyMaterialsScreen() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // <--- סטייט חדש לריענון

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchChapters();
  }, []);

  // הוספנו פרמטר forceRefresh כדי שנוכל לעקוף את הקאש כשהמשתמש מרענן ידנית
  const fetchChapters = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setIsLoading(true);

      // נבדוק קאש רק אם לא ביקשו ריענון בכוח
      if (!forceRefresh) {
        const cachedDataStr = await AsyncStorage.getItem(CACHE_KEY);

        if (cachedDataStr) {
          const cachedData = JSON.parse(cachedDataStr);
          const now = Date.now();

          if (now - cachedData.timestamp < CACHE_EXPIRATION_MS) {
            console.log("טוען חומר מהקאש (שמירה מקומית)");
            setChapters(cachedData.chapters);
            setIsLoading(false);
            return;
          }
        }
      }

      console.log("טוען חומר מפיירבייס");
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

      // מיון הפרקים לפי שדה order כדי שיופיעו בסדר הגיוני (אלגברה, גיאומטריה...)
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
      setIsRefreshing(false); // עוצרים את האנימציה של הריענון
    }
  };

  // פונקציה שמופעלת כשהמשתמש מושך למטה
  const onRefresh = () => {
    setIsRefreshing(true);
    fetchChapters(true); // קוראים לפונקציה עם true כדי לעקוף את הקאש
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
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loaderText}>טוען חומרי לימוד...</Text>
          </View>
        ) : (
          <FlatList
            data={chapters}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            // --- הוספנו את ה-RefreshControl ל-FlatList ---
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#ffffff"
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
                  {/* @ts-ignore */}
                  <Ionicons
                    name={item.icon || "book-outline"}
                    size={24}
                    color="#4A90E2"
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

// ... הסטיילים נשארים בדיוק אותו דבר, השמטתי אותם כאן כדי לחסוך מקום

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#9dbde9",
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
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#ffffff",
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
    color: "#ffffff",
    fontSize: 16,
  },
  chapterCard: {
    backgroundColor: "#FFFFFF",
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
    color: "#2D3748",
    textAlign: "right",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
  },
  toastContainer: {
    position: "absolute",
    bottom: 70,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  toastText: {
    color: "#323232",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
