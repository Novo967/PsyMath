import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContexts"; // ייבוא ה-Hook

interface ContentBlock {
  type: "title" | "text" | "tip" | "rule";
  content: string;
}

interface SubTopic {
  id: string;
  title: string;
  contentBlocks: ContentBlock[];
}

export default function ChapterScreen({ route, navigation }: any) {
  const { theme } = useTheme(); // שליפת ערכת הנושא
  const styles = getStyles(theme); // יצירת סטיילים דינמיים

  const { chapter } = route.params;

  const [expandedTopicIds, setExpandedTopicIds] = useState<string[]>([]);

  const toggleTopic = (id: string) => {
    setExpandedTopicIds((prev) =>
      prev.includes(id)
        ? prev.filter((topicId) => topicId !== id)
        : [...prev, id],
    );
  };

  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case "title":
        return (
          <Text key={index} style={styles.blockTitle}>
            {block.content}
          </Text>
        );
      case "text":
        return (
          <Text key={index} style={styles.blockText}>
            {block.content}
          </Text>
        );
      case "tip":
        return (
          <View key={index} style={styles.tipContainer}>
            <View style={styles.iconWrapperTip}>
              <Ionicons name="bulb" size={22} color={theme.tipBorder} />
            </View>
            <Text style={styles.tipText}>{block.content}</Text>
          </View>
        );
      case "rule":
        return (
          <View key={index} style={styles.ruleContainer}>
            <View style={styles.iconWrapperRule}>
              <Ionicons name="warning" size={22} color={theme.ruleBorder} />
            </View>
            <Text style={styles.ruleText}>{block.content}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{chapter.title}</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {chapter.subTopics?.map((topic: SubTopic) => (
          <View key={topic.id} style={styles.topicCard}>
            <TouchableOpacity
              style={styles.topicHeader}
              activeOpacity={0.7}
              onPress={() => toggleTopic(topic.id)}
            >
              <Ionicons
                name={
                  expandedTopicIds.includes(topic.id)
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={24}
                color={theme.primaryColor}
              />
              <Text style={styles.topicTitle}>{topic.title}</Text>
            </TouchableOpacity>

            {expandedTopicIds.includes(topic.id) && (
              <View style={styles.topicContent}>
                {topic.contentBlocks?.map(
                  (block: ContentBlock, index: number) =>
                    renderBlock(block, index),
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.backgroundColor,
    },
    header: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingTop: 30,
      paddingBottom: 20,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.textLight,
      textAlign: "center",
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    topicCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      marginBottom: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 3,
    },
    topicHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 20,
      backgroundColor: theme.cardBackground,
    },
    topicTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.textPrimary,
      flex: 1,
      textAlign: "right",
      marginLeft: 15,
    },
    topicContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: "#EDF2F7",
      paddingTop: 15,
    },
    blockTitle: {
      fontSize: 17,
      fontWeight: "bold",
      color: theme.secondaryColor,
      marginTop: 15,
      marginBottom: 8,
      textAlign: "right",
    },
    blockText: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 24,
      marginBottom: 12,
      textAlign: "right",
    },
    tipContainer: {
      backgroundColor: theme.tipBackground,
      borderRadius: 12,
      padding: 16,
      marginVertical: 12,
      borderRightWidth: 4,
      borderRightColor: theme.tipBorder,
    },
    tipText: {
      fontSize: 15,
      color: "#744210", // נשאר קבוע כדי לשמור על קונטרסט בתוך הטיפ הצהוב
      lineHeight: 22,
      textAlign: "right",
    },
    iconWrapperTip: {
      alignItems: "flex-end",
      marginBottom: 6,
    },
    ruleContainer: {
      backgroundColor: theme.ruleBackground,
      borderRadius: 12,
      padding: 16,
      marginVertical: 12,
      borderRightWidth: 4,
      borderRightColor: theme.ruleBorder,
    },
    ruleText: {
      fontSize: 15,
      color: "#742A2A", // נשאר קבוע כדי לשמור על קונטרסט בתוך התיבה האדומה
      lineHeight: 22,
      textAlign: "right",
      fontWeight: "600",
    },
    iconWrapperRule: {
      alignItems: "flex-end",
      marginBottom: 6,
    },
  });
