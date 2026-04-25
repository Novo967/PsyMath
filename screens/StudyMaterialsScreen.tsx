import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const CHAPTERS = [
  {
    id: "1",
    title: "אלגברה - משוואות ואי-שוויונות",
    icon: "calculator-outline",
  },
  { id: "2", title: "גיאומטריה - משולשים ומעגלים", icon: "triangle-outline" },
  {
    id: "3",
    title: "בעיות כמותיות - תנועה והספק",
    icon: "speedometer-outline",
  },
  { id: "4", title: "הסקה מתרשים", icon: "bar-chart-outline" },
];

export default function StudyMaterialsScreen() {
  // משתנים לשליטה באנימציה ובתזמון ההיעלמות של ההתראה
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = () => {
    // איפוס טיימר קודם במקרה שהמשתמש לוחץ מהר כמה פעמים ברצף
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // הופעת ההתראה
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // העלמת ההתראה אחרי 2 שניות
    timeoutRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>פרקי לימוד</Text>
          <Text style={styles.subtitle}>בחר נושא כדי להתחיל ללמוד</Text>
        </View>

        <FlatList
          data={CHAPTERS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chapterCard}
              activeOpacity={0.7}
              onPress={showToast} // הוספנו את הקריאה להתראה בלחיצה
            >
              {/* חץ שמאלה להוראה על כניסה (כי אנחנו בעברית/RTL) */}
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
                {/* @ts-ignore - התעלמות משגיאת טיפוס זמנית של אייקון */}
                <Ionicons name={item.icon} size={24} color="#4A90E2" />
              </View>
            </TouchableOpacity>
          )}
        />

        {/* רכיב ההתראה שמרחף למטה */}
        <Animated.View
          style={[styles.toastContainer, { opacity: fadeAnim }]}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>יעלה בהמשך</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

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
  // סגנונות חדשים עבור ה-Toast
  toastContainer: {
    position: "absolute",
    bottom: 70,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)", // רקע כהה מעט שקוף כדי שיראה מודרני
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
