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
  Image,
  KeyboardAvoidingView,
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
import { useImageUpload } from "../../hooks/useImageUpload";
import { Difficulty, Subject } from "../../types";
import MathText from "../../components/MathText";

const SUBJECTS: { key: Subject; label: string }[] = [
  { key: "quantitative", label: "כמותי" },
  { key: "verbal", label: "מילולי" },
  { key: "english", label: "אנגלית" },
];

const DIFFICULTIES: { key: Difficulty; label: string; color: string }[] = [
  { key: "easy", label: "קל", color: "#48BB78" },
  { key: "medium", label: "בינוני", color: "#ED8936" },
  { key: "hard", label: "קשה", color: "#F56565" },
];

export default function QuestionFormScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userProfile } = useAuth();
  const { pickAndUpload, uploading, progress } = useImageUpload();

  const questionId: string | undefined = route.params?.questionId;
  const isEditing = !!questionId;

  // Form state
  const [subject, setSubject] = useState<Subject>("quantitative");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionText, setQuestionText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [groupId, setGroupId] = useState("");

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Load existing question data for editing
  useEffect(() => {
    if (!isEditing) return;
    const loadQuestion = async () => {
      try {
        const docSnap = await getDoc(doc(db, "questions", questionId!));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSubject(data.subject || "quantitative");
          setTopic(data.topic || "");
          setDifficulty(data.difficulty || "medium");
          setQuestionText(data.questionText || "");
          setImageUrl(data.imageUrl || null);
          setOptions(data.options || ["", "", "", ""]);
          setCorrectAnswerIndex(data.correctAnswerIndex ?? 0);
          setExplanation(data.explanation || "");
          setGroupId(data.groupId || "");
        }
      } catch (error) {
        console.error("Error loading question:", error);
        Alert.alert("שגיאה", "לא הצלחנו לטעון את השאלה.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    loadQuestion();
  }, [questionId]);

  const handlePickImage = async () => {
    const instituteId = userProfile?.instituteId || "B2C_PUBLIC";
    const filename = `${Date.now()}_question.jpg`;
    const path = `questions/${instituteId}/${filename}`;
    const url = await pickAndUpload(path);
    if (url) {
      setImageUrl(url);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validate = (): boolean => {
    if (!topic.trim()) {
      Alert.alert("שגיאה", "יש למלא את הנושא.");
      return false;
    }
    if (!questionText.trim()) {
      Alert.alert("שגיאה", "יש למלא את תוכן השאלה.");
      return false;
    }
    const filledOptions = options.filter((o) => o.trim());
    if (filledOptions.length < 2) {
      Alert.alert("שגיאה", "יש למלא לפחות 2 אפשרויות.");
      return false;
    }
    if (!options[correctAnswerIndex]?.trim()) {
      Alert.alert("שגיאה", "התשובה הנכונה שנבחרה ריקה.");
      return false;
    }
    if (!explanation.trim()) {
      Alert.alert("שגיאה", "יש למלא הסבר לפתרון.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    const instituteId = userProfile?.instituteId || "B2C_PUBLIC";

    // Filter out empty options
    const cleanOptions = options.filter((o) => o.trim());

    const questionData = {
      subject,
      topic: topic.trim(),
      difficulty,
      questionText: questionText.trim(),
      imageUrl: imageUrl || null,
      options: cleanOptions,
      correctAnswerIndex,
      explanation: explanation.trim(),
      groupId: groupId.trim() || null,
      groupOrder: null,
      instituteId,
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, "questions", questionId!), questionData);
        Alert.alert("הצלחה", "השאלה עודכנה בהצלחה.");
      } else {
        await addDoc(collection(db, "questions"), {
          ...questionData,
          id: "", // Will be set after creation if needed
        });
        Alert.alert("הצלחה", "השאלה נוצרה בהצלחה.");
      }
      navigation.goBack();
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("שגיאה", "לא הצלחנו לשמור את השאלה.");
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
            {isEditing ? "עריכת שאלה" : "שאלה חדשה"}
          </Text>

          {/* Subject selector */}
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

          {/* Topic */}
          <Text style={styles.label}>נושא משנה</Text>
          <TextInput
            style={styles.input}
            value={topic}
            onChangeText={setTopic}
            placeholder="למשל: אלגברה ואותיות"
            textAlign="right"
            placeholderTextColor={theme.textSecondary + "80"}
          />

          {/* Difficulty */}
          <Text style={styles.label}>רמת קושי</Text>
          <View style={styles.toggleRow}>
            {DIFFICULTIES.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.toggleButton,
                  difficulty === d.key && {
                    backgroundColor: d.color,
                    borderColor: d.color,
                  },
                ]}
                onPress={() => setDifficulty(d.key)}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    difficulty === d.key && { color: "#FFFFFF" },
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Question text */}
          <Text style={styles.label}>תוכן השאלה</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={questionText}
            onChangeText={setQuestionText}
            placeholder="הקלד את תוכן השאלה..."
            textAlign="right"
            multiline
            placeholderTextColor={theme.textSecondary + "80"}
          />
          {questionText.trim() ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>תצוגה מקדימה (LaTeX):</Text>
              <MathText text={questionText} fontSize={15} color={theme.textPrimary} />
            </View>
          ) : null}

          {/* Image upload */}
          <Text style={styles.label}>תמונה (אופציונלי)</Text>
          {imageUrl ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={handleRemoveImage}
              >
                <Ionicons name="close-circle" size={24} color="#F56565" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={handlePickImage}
              disabled={uploading}
            >
              {uploading ? (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator size="small" color={theme.primaryColor} />
                  <Text style={styles.uploadingText}>{progress}%</Text>
                </View>
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={theme.primaryColor}
                  />
                  <Text style={styles.imagePickerText}>הוסף תמונה</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Options */}
          <Text style={styles.label}>אפשרויות תשובה</Text>
          {options.map((opt, index) => (
            <View key={index}>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.radioButton,
                    correctAnswerIndex === index && styles.radioButtonActive,
                  ]}
                  onPress={() => setCorrectAnswerIndex(index)}
                >
                  {correctAnswerIndex === index && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <TextInput
                  style={styles.optionInput}
                  value={opt}
                  onChangeText={(val) => updateOption(index, val)}
                  placeholder={`אפשרות ${index + 1}`}
                  textAlign="right"
                  placeholderTextColor={theme.textSecondary + "60"}
                />
              </View>
              {opt.trim() ? (
                <View style={styles.optionPreviewBox}>
                  <MathText text={opt} fontSize={14} color={theme.textPrimary} />
                </View>
              ) : null}
            </View>
          ))}
          <Text style={styles.hintText}>
            לחץ על העיגול כדי לבחור את התשובה הנכונה
          </Text>

          {/* Explanation */}
          <Text style={styles.label}>הסבר לפתרון</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={explanation}
            onChangeText={setExplanation}
            placeholder="הסבר הפתרון..."
            textAlign="right"
            multiline
            placeholderTextColor={theme.textSecondary + "80"}
          />
          {explanation.trim() ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>תצוגה מקדימה (LaTeX):</Text>
              <MathText text={explanation} fontSize={15} color={theme.textPrimary} />
            </View>
          ) : null}

          {/* Group ID */}
          <Text style={styles.label}>מזהה קבוצה (אופציונלי)</Text>
          <TextInput
            style={styles.input}
            value={groupId}
            onChangeText={setGroupId}
            placeholder="לשיוך שאלות לקטע קריאה משותף"
            textAlign="right"
            placeholderTextColor={theme.textSecondary + "80"}
          />

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving || uploading}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? "עדכן שאלה" : "צור שאלה"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    multilineInput: {
      minHeight: 100,
      textAlignVertical: "top",
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
      backgroundColor: "#8B5CF6",
      borderColor: "#8B5CF6",
    },
    toggleButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    toggleButtonTextActive: {
      color: "#FFFFFF",
    },
    // Image
    imagePickerButton: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
      borderStyle: "dashed",
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    imagePickerText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.primaryColor,
    },
    imagePreviewContainer: {
      position: "relative",
      borderRadius: 12,
      overflow: "hidden",
    },
    imagePreview: {
      width: "100%",
      height: 200,
      borderRadius: 12,
      backgroundColor: "#F7FAFC",
    },
    removeImageButton: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
    },
    uploadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    uploadingText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.primaryColor,
    },
    // Options
    optionRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    radioButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: "#CBD5E0",
      justifyContent: "center",
      alignItems: "center",
    },
    radioButtonActive: {
      backgroundColor: "#48BB78",
      borderColor: "#48BB78",
    },
    optionInput: {
      flex: 1,
      backgroundColor: theme.cardBackground,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.textPrimary,
    },
    previewBox: {
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
      marginBottom: 4,
    },
    previewLabel: {
      fontSize: 12,
      fontWeight: "bold" as const,
      color: "#64748B",
      marginBottom: 6,
      textAlign: "right" as const,
    },
    optionPreviewBox: {
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 8,
      padding: 8,
      marginBottom: 6,
      marginLeft: 38,
    },
    hintText: {
      fontSize: 12,
      color: theme.textLight,
      textAlign: "right",
      opacity: 0.7,
      marginBottom: 8,
    },
    // Save
    saveButton: {
      backgroundColor: "#8B5CF6",
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 24,
      shadowColor: "#8B5CF6",
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
  });
