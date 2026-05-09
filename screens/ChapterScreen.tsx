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
  const { chapter } = route.params;
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const toggleTopic = (id: string) => {
    setExpandedTopicId((prev) => (prev === id ? null : id));
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
              <Ionicons name="bulb" size={22} color="#D69E2E" />
            </View>
            <Text style={styles.tipText}>{block.content}</Text>
          </View>
        );
      case "rule":
        return (
          <View key={index} style={styles.ruleContainer}>
            <View style={styles.iconWrapperRule}>
              <Ionicons name="warning" size={22} color="#E53E3E" />
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-forward" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{chapter.title}</Text>
        <View style={{ width: 40 }} />
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
                  expandedTopicId === topic.id ? "chevron-up" : "chevron-down"
                }
                size={24}
                color="#4A90E2"
              />
              <Text style={styles.topicTitle}>{topic.title}</Text>
            </TouchableOpacity>

            {expandedTopicId === topic.id && (
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#9dbde9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  topicCard: {
    backgroundColor: "#ffffff",
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
    backgroundColor: "#ffffff",
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D3748",
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
    color: "#2B6CB0",
    marginTop: 15,
    marginBottom: 8,
    textAlign: "right",
  },
  blockText: {
    fontSize: 16,
    color: "#4A5568",
    lineHeight: 24,
    marginBottom: 12,
    textAlign: "right",
  },
  tipContainer: {
    backgroundColor: "#FEFCBF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderRightWidth: 4,
    borderRightColor: "#D69E2E",
  },
  tipText: {
    fontSize: 15,
    color: "#744210",
    lineHeight: 22,
    textAlign: "right",
  },
  iconWrapperTip: {
    alignItems: "flex-end",
    marginBottom: 6,
  },
  ruleContainer: {
    backgroundColor: "#FED7D7",
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderRightWidth: 4,
    borderRightColor: "#E53E3E",
  },
  ruleText: {
    fontSize: 15,
    color: "#742A2A",
    lineHeight: 22,
    textAlign: "right",
    fontWeight: "600",
  },
  iconWrapperRule: {
    alignItems: "flex-end",
    marginBottom: 6,
  },
});
