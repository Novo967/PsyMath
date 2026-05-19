import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContexts";
import { db } from "../../firebaseConfig";
import { ContentBlock, ContentBlockType, Subject, SubTopic } from "../../types";

// Curated icon grid (~20 relevant icons)
const ICON_OPTIONS: string[] = [
  "book-outline",
  "calculator-outline",
  "flask-outline",
  "pencil-outline",
  "stats-chart-outline",
  "grid-outline",
  "shapes-outline",
  "cube-outline",
  "analytics-outline",
  "bar-chart-outline",
  "pie-chart-outline",
  "bulb-outline",
  "code-slash-outline",
  "language-outline",
  "chatbubble-ellipses-outline",
  "reader-outline",
  "newspaper-outline",
  "document-text-outline",
  "school-outline",
  "trophy-outline",
];

const SUBJECTS: { key: Subject; label: string }[] = [
  { key: "quantitative", label: "כמותי" },
  { key: "verbal", label: "מילולי" },
  { key: "english", label: "אנגלית" },
];

const BLOCK_TYPES: { key: ContentBlockType; label: string; icon: string }[] = [
  { key: "title", label: "כותרת", icon: "text-outline" },
  { key: "text", label: "טקסט", icon: "document-text-outline" },
  { key: "tip", label: "טיפ", icon: "bulb-outline" },
  { key: "rule", label: "כלל", icon: "warning-outline" },
];

export default function MaterialFormScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userProfile } = useAuth();

  const chapterId: string | undefined = route.params?.chapterId;
  const isEditing = !!chapterId;

  // Form state
  const [subject, setSubject] = useState<Subject>("quantitative");
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("book-outline");
  const [order, setOrder] = useState("0");
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Load existing data
  useEffect(() => {
    if (!isEditing) return;
    const loadChapter = async () => {
      try {
        const docSnap = await getDoc(doc(db, "study_chapters", chapterId!));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSubject(data.subject || "quantitative");
          setTitle(data.title || "");
          setIcon(data.icon || "book-outline");
          setOrder(String(data.order || 0));
          setSubTopics(data.subTopics || []);
        }
      } catch (error) {
        console.error("Error loading chapter:", error);
        Alert.alert("שגיאה", "לא הצלחנו לטעון את הפרק.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    loadChapter();
  }, [chapterId]);

  // --- Sub-topic management ---
  const addSubTopic = () => {
    const newId = `st_${Date.now()}`;
    setSubTopics([
      ...subTopics,
      { id: newId, title: "", contentBlocks: [] },
    ]);
  };

  const removeSubTopic = (index: number) => {
    Alert.alert("מחיקה", "למחוק נושא משנה זה?", [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחק",
        style: "destructive",
        onPress: () => {
          const updated = [...subTopics];
          updated.splice(index, 1);
          setSubTopics(updated);
        },
      },
    ]);
  };

  const updateSubTopicTitle = (index: number, value: string) => {
    const updated = [...subTopics];
    updated[index] = { ...updated[index], title: value };
    setSubTopics(updated);
  };

  // --- Content block management ---
  const addContentBlock = (subTopicIndex: number, type: ContentBlockType) => {
    const updated = [...subTopics];
    const blocks = [...updated[subTopicIndex].contentBlocks];
    blocks.push({ type, content: "" });
    updated[subTopicIndex] = { ...updated[subTopicIndex], contentBlocks: blocks };
    setSubTopics(updated);
  };

  const removeContentBlock = (subTopicIndex: number, blockIndex: number) => {
    const updated = [...subTopics];
    const blocks = [...updated[subTopicIndex].contentBlocks];
    blocks.splice(blockIndex, 1);
    updated[subTopicIndex] = { ...updated[subTopicIndex], contentBlocks: blocks };
    setSubTopics(updated);
  };

  const updateBlockContent = (
    subTopicIndex: number,
    blockIndex: number,
    content: string
  ) => {
    const updated = [...subTopics];
    const blocks = [...updated[subTopicIndex].contentBlocks];
    blocks[blockIndex] = { ...blocks[blockIndex], content };
    updated[subTopicIndex] = { ...updated[subTopicIndex], contentBlocks: blocks };
    setSubTopics(updated);
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      Alert.alert("שגיאה", "יש למלא כותרת לפרק.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const instituteId = userProfile?.instituteId || "B2C_PUBLIC";
    const chapterData = {
      subject,
      title: title.trim(),
      icon,
      order: parseInt(order) || 0,
      subTopics,
      instituteId,
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, "study_chapters", chapterId!), chapterData);
        Alert.alert("הצלחה", "הפרק עודכן בהצלחה.");
      } else {
        await addDoc(collection(db, "study_chapters"), chapterData);
        Alert.alert("הצלחה", "הפרק נוצר בהצלחה.");
      }
      navigation.goBack();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("שגיאה", "לא הצלחנו לשמור את הפרק.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.screenTitle}>
            {isEditing ? "עריכת פרק" : "פרק חדש"}
          </Text>

          {/* Subject */}
          <Text style={styles.label}>נושא מקצועי</Text>
          <View style={styles.toggleRow}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.toggleButton,
                  subject === s.key && styles.toggleButtonActive,
                ]}
                onPress={() => setSubject(s.key)}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    subject === s.key && styles.toggleButtonTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.label}>כותרת הפרק</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="למשל: קומבינטוריקה והסתברות"
            textAlign="right"
            placeholderTextColor={theme.textSecondary + "80"}
          />

          {/* Icon picker */}
          <Text style={styles.label}>אייקון</Text>
          <TouchableOpacity
            style={styles.iconPickerButton}
            onPress={() => setShowIconPicker(true)}
          >
            <Ionicons name={icon as any} size={28} color={theme.primaryColor} />
            <Text style={styles.iconPickerText}>בחר אייקון</Text>
          </TouchableOpacity>

          {/* Order */}
          <Text style={styles.label}>סדר תצוגה</Text>
          <TextInput
            style={[styles.input, { width: 100 }]}
            value={order}
            onChangeText={setOrder}
            keyboardType="number-pad"
            textAlign="center"
          />

          {/* Sub-topics */}
          <View style={styles.sectionHeader}>
            <TouchableOpacity style={styles.addButton} onPress={addSubTopic}>
              <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.addButtonText}>הוסף נושא משנה</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>נושאי משנה</Text>
          </View>

          {subTopics.map((st, stIndex) => (
            <View key={st.id} style={styles.subTopicCard}>
              <View style={styles.subTopicHeader}>
                <TouchableOpacity
                  onPress={() => removeSubTopic(stIndex)}
                  style={styles.deleteSmall}
                >
                  <Ionicons name="trash-outline" size={18} color="#F56565" />
                </TouchableOpacity>
                <TextInput
                  style={styles.subTopicTitleInput}
                  value={st.title}
                  onChangeText={(val) => updateSubTopicTitle(stIndex, val)}
                  placeholder="כותרת נושא משנה"
                  textAlign="right"
                  placeholderTextColor={theme.textSecondary + "80"}
                />
                <Text style={styles.subTopicIndex}>{stIndex + 1}</Text>
              </View>

              {/* Content blocks */}
              {st.contentBlocks.map((block, blockIndex) => (
                <View key={blockIndex} style={styles.blockContainer}>
                  <View style={styles.blockHeader}>
                    <TouchableOpacity
                      onPress={() => removeContentBlock(stIndex, blockIndex)}
                    >
                      <Ionicons name="close-circle" size={20} color="#F56565" />
                    </TouchableOpacity>
                    <View style={styles.blockTypeBadge}>
                      <Text style={styles.blockTypeText}>
                        {BLOCK_TYPES.find((b) => b.key === block.type)?.label ||
                          block.type}
                      </Text>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.input, styles.blockInput]}
                    value={block.content}
                    onChangeText={(val) =>
                      updateBlockContent(stIndex, blockIndex, val)
                    }
                    placeholder="תוכן הבלוק..."
                    textAlign="right"
                    multiline
                    placeholderTextColor={theme.textSecondary + "60"}
                  />
                </View>
              ))}

              {/* Add block buttons */}
              <View style={styles.addBlockRow}>
                {BLOCK_TYPES.map((bt) => (
                  <TouchableOpacity
                    key={bt.key}
                    style={styles.addBlockButton}
                    onPress={() => addContentBlock(stIndex, bt.key)}
                  >
                    <Ionicons
                      name={bt.icon as any}
                      size={16}
                      color={theme.primaryColor}
                    />
                    <Text style={styles.addBlockText}>{bt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {subTopics.length === 0 && (
            <View style={styles.emptySubTopics}>
              <Text style={styles.emptySubTopicsText}>
                לחץ "הוסף נושא משנה" כדי להתחיל לבנות תוכן
              </Text>
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? "עדכן פרק" : "צור פרק"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Icon picker modal */}
      <Modal
        visible={showIconPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIconPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowIconPicker(false)}
        >
          <View style={styles.iconPickerModal}>
            <Text style={styles.iconPickerModalTitle}>בחר אייקון</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((iconName) => (
                <TouchableOpacity
                  key={iconName}
                  style={[
                    styles.iconOption,
                    icon === iconName && styles.iconOptionSelected,
                  ]}
                  onPress={() => {
                    setIcon(iconName);
                    setShowIconPicker(false);
                  }}
                >
                  <Ionicons
                    name={iconName as any}
                    size={28}
                    color={
                      icon === iconName ? "#FFFFFF" : theme.textPrimary
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.backgroundColor },
    container: {
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 60,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.textLight,
      textAlign: "right",
      marginBottom: 24,
    },
    label: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.textLight,
      textAlign: "right",
      marginBottom: 8,
      marginTop: 16,
    },
    input: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: theme.textPrimary,
      textAlign: "right",
    },
    toggleRow: {
      flexDirection: "row-reverse",
      gap: 10,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
      backgroundColor: theme.cardBackground,
      alignItems: "center",
    },
    toggleButtonActive: {
      backgroundColor: "#3B82F6",
      borderColor: "#3B82F6",
    },
    toggleButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    toggleButtonTextActive: {
      color: "#FFFFFF",
    },
    iconPickerButton: {
      flexDirection: "row-reverse",
      alignItems: "center",
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    iconPickerText: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    // Section
    sectionHeader: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 28,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.textLight,
    },
    addButton: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 4,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#3B82F6",
    },
    // Sub-topic card
    subTopicCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    subTopicHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      marginBottom: 12,
      gap: 10,
    },
    subTopicIndex: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "#3B82F6",
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
      lineHeight: 28,
      overflow: "hidden",
    },
    subTopicTitleInput: {
      flex: 1,
      backgroundColor: "#F7FAFC",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontWeight: "600",
      color: theme.textPrimary,
    },
    deleteSmall: { padding: 4 },
    // Content blocks
    blockContainer: {
      marginBottom: 10,
      backgroundColor: "#F7FAFC",
      borderRadius: 10,
      padding: 12,
    },
    blockHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    blockTypeBadge: {
      backgroundColor: "#EDE9FE",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
    },
    blockTypeText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#8B5CF6",
    },
    blockInput: {
      backgroundColor: "#FFFFFF",
      minHeight: 60,
      textAlignVertical: "top",
    },
    // Add block row
    addBlockRow: {
      flexDirection: "row-reverse",
      gap: 8,
      marginTop: 8,
      flexWrap: "wrap",
    },
    addBlockButton: {
      flexDirection: "row-reverse",
      alignItems: "center",
      backgroundColor: "#EBF4FF",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    addBlockText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.primaryColor,
    },
    // Empty
    emptySubTopics: {
      backgroundColor: theme.cardBackground,
      borderRadius: 14,
      padding: 30,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
      borderStyle: "dashed",
    },
    emptySubTopicsText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
    },
    // Save
    saveButton: {
      backgroundColor: "#3B82F6",
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 24,
      shadowColor: "#3B82F6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "700",
    },
    // Icon picker modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    iconPickerModal: {
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      padding: 24,
      width: "85%",
      maxHeight: "60%",
    },
    iconPickerModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.textPrimary,
      textAlign: "center",
      marginBottom: 20,
    },
    iconGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 12,
    },
    iconOption: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: "#F7FAFC",
      justifyContent: "center",
      alignItems: "center",
    },
    iconOptionSelected: {
      backgroundColor: "#3B82F6",
    },
  });
