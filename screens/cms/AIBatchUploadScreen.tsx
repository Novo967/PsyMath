import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
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
import { addDoc, collection } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContexts";
import { db } from "../../firebaseConfig";
import { useImageUpload } from "../../hooks/useImageUpload";
import { Difficulty, Subject } from "../../types";
import MathText from "../../components/MathText";

// ─── Constants ───

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

const API_URL = "http://192.168.0.101:3000/api/parse-questions"; // Android emulator → localhost

// ─── Extracted question shape from backend ───

export interface ParsedQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  imageUrl?: string | null;
}

// ─── Component ───

export default function AIBatchUploadScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();

  // Role guard
  const isAllowed =
    userProfile?.role === "editor" || userProfile?.role === "admin";

  // Form state
  const [subject, setSubject] = useState<Subject>("quantitative");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");

  // File state
  const [questionsFile, setQuestionsFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [explanationsFile, setExplanationsFile] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Network state
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Results state
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Diagram upload state
  const { pickAndUpload } = useImageUpload();
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // ─── File picker ───

  const handlePickQuestionsFile = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setQuestionsFile(result.assets[0]);
      // Clear previous results when a new file is picked
      setParsedQuestions([]);
    }
  };

  const handlePickExplanationsFile = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setExplanationsFile(result.assets[0]);
      // Clear previous results when a new file is picked
      setParsedQuestions([]);
    }
  };

  // ─── Upload & parse ───

  const handleUpload = async () => {
    if (!questionsFile || !explanationsFile) {
      Alert.alert("שגיאה", "יש לבחור קובץ שאלות וקובץ פתרונות תואם.");
      return;
    }
    if (!topic.trim()) {
      Alert.alert("שגיאה", "יש למלא את שדה הנושא.");
      return;
    }

    setIsUploading(true);
    setParsedQuestions([]);

    try {
      const formData = new FormData();

      // Append questions file
      const qUri = questionsFile.uri;
      const qFilename = qUri.split("/").pop() || "questions.jpg";
      const qMatch = /\.(\w+)$/.exec(qFilename);
      const qType = qMatch ? `image/${qMatch[1]}` : "image/jpeg";
      formData.append("questionsFile", {
        uri: qUri,
        name: qFilename,
        type: qType,
      } as any);

      // Append explanations file
      const eUri = explanationsFile.uri;
      const eFilename = eUri.split("/").pop() || "explanations.jpg";
      const eMatch = /\.(\w+)$/.exec(eFilename);
      const eType = eMatch ? `image/${eMatch[1]}` : "image/jpeg";
      formData.append("explanationsFile", {
        uri: eUri,
        name: eFilename,
        type: eType,
      } as any);

      formData.append("subject", subject);
      formData.append("topic", topic.trim());
      formData.append("difficulty", difficulty);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
        // Let fetch set the Content-Type with boundary automatically
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || `Server error ${response.status}`);
      }

      const data: ParsedQuestion[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        Alert.alert("תוצאה", "ה-AI לא הצליח לחלץ שאלות מהקובץ. נסה קובץ אחר.");
        return;
      }

      setParsedQuestions(data);
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("שגיאה", error.message || "אירעה שגיאה בשליחת הקובץ לשרת.");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // ─── Editing helpers ───

  const updateQuestionField = (index: number, field: keyof ParsedQuestion, value: string) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateOptionField = (qIndex: number, optIndex: number, value: string) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      const newOptions = [...updated[qIndex].options];
      newOptions[optIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: newOptions };
      return updated;
    });
  };

  const updateCorrectAnswer = (qIndex: number, optIndex: number) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], correctAnswerIndex: optIndex };
      return updated;
    });
  };

  const handleAttachDiagram = async (index: number) => {
    setUploadingIndex(index);
    const instituteId = userProfile?.instituteId || "B2C_PUBLIC";
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
    const path = `question_diagrams/${instituteId}/${filename}`;
    
    const url = await pickAndUpload(path);
    if (url) {
      setParsedQuestions((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], imageUrl: url };
        return updated;
      });
    }
    setUploadingIndex(null);
  };

  const handleRemoveDiagram = (index: number) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], imageUrl: null };
      return updated;
    });
  };

  // ─── Save to Firestore ───

  const handleSaveToFirestore = async () => {
    if (parsedQuestions.length === 0) return;

    const instituteId = userProfile?.instituteId || "B2C_PUBLIC";

    // Basic validation
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      if (!q.questionText.trim()) {
        Alert.alert("שגיאה", `שאלה ${i + 1}: חסר תוכן שאלה.`);
        return;
      }
      const filledOptions = q.options.filter((o) => o.trim());
      if (filledOptions.length < 2) {
        Alert.alert("שגיאה", `שאלה ${i + 1}: חסרות לפחות 2 אפשרויות.`);
        return;
      }
    }

    setIsSaving(true);

    try {
      for (const q of parsedQuestions) {
        const cleanOptions = q.options.filter((o) => o.trim());
        await addDoc(collection(db, "questions"), {
          subject,
          topic: topic.trim(),
          difficulty,
          questionText: q.questionText.trim(),
          imageUrl: q.imageUrl || null,
          options: cleanOptions,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation.trim(),
          groupId: null,
          groupOrder: null,
          instituteId,
        });
      }

      Alert.alert("הצלחה", `${parsedQuestions.length} שאלות נשמרו בהצלחה למאגר!`);

      // Reset form
      setParsedQuestions([]);
      setQuestionsFile(null);
      setExplanationsFile(null);
      setTopic("");
      setExpandedIndex(null);
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("שגיאה", "לא הצלחנו לשמור את השאלות. אנא נסה שוב.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Access denied ───

  if (!isAllowed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color={theme.errorBorder} />
          <Text style={styles.accessDeniedTitle}>אין גישה</Text>
          <Text style={styles.accessDeniedText}>
            מסך זה זמין רק לעורכים ומנהלים.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>חזרה</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ───

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
          {/* Header */}
          <Text style={styles.screenTitle}>העלאת שאלות עם AI</Text>

          <View style={styles.instructionBox}>
            <Ionicons
              name="sparkles"
              size={20}
              color="#8B5CF6"
              style={{ marginLeft: 10 }}
            />
            <Text style={styles.instructionText}>
              הנחיות להזנת AI: יש לבחור קובץ/תמונה של השאלות וקובץ/תמונה של הפתרונות המלאים התואמים (עד 10 שאלות בכל פעם). המערכת תבצע הצלבה אוטומטית ותחלץ את המידע המלא למאגר.
            </Text>
          </View>

          {/* ─── Form ─── */}

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

          {/* ─── File Pickers ─── */}

          <Text style={styles.label}>קובץ שאלות (תמונה)</Text>

          {questionsFile ? (
            <View style={styles.selectedFileRow}>
              <TouchableOpacity onPress={() => setQuestionsFile(null)}>
                <Ionicons name="close-circle" size={22} color="#F56565" />
              </TouchableOpacity>
              <View style={styles.selectedFileInfo}>
                <Ionicons
                  name="document-attach-outline"
                  size={20}
                  color={theme.primaryColor}
                />
                <Text style={styles.selectedFileName} numberOfLines={1}>
                  {questionsFile.uri.split("/").pop()}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.filePickerButton}
              onPress={handlePickQuestionsFile}
            >
              <Ionicons
                name="images-outline"
                size={28}
                color={theme.primaryColor}
              />
              <Text style={styles.filePickerText}>בחר קובץ שאלות</Text>
              <Text style={styles.filePickerHint}>
                JPG, PNG
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>קובץ פתרונות תואם (תמונה)</Text>

          {explanationsFile ? (
            <View style={styles.selectedFileRow}>
              <TouchableOpacity onPress={() => setExplanationsFile(null)}>
                <Ionicons name="close-circle" size={22} color="#F56565" />
              </TouchableOpacity>
              <View style={styles.selectedFileInfo}>
                <Ionicons
                  name="document-attach-outline"
                  size={20}
                  color={theme.primaryColor}
                />
                <Text style={styles.selectedFileName} numberOfLines={1}>
                  {explanationsFile.uri.split("/").pop()}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.filePickerButton}
              onPress={handlePickExplanationsFile}
            >
              <Ionicons
                name="document-text-outline"
                size={28}
                color={theme.primaryColor}
              />
              <Text style={styles.filePickerText}>בחר קובץ פתרונות תואם</Text>
              <Text style={styles.filePickerHint}>
                JPG, PNG
              </Text>
            </TouchableOpacity>
          )}

          {/* ─── Upload button ─── */}

          <TouchableOpacity
            style={[
              styles.uploadButton,
              (!questionsFile || !explanationsFile || isUploading) && { opacity: 0.5 },
            ]}
            onPress={handleUpload}
            disabled={!questionsFile || !explanationsFile || isUploading}
            activeOpacity={0.8}
          >
            {isUploading ? (
              <View style={styles.uploadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.uploadButtonText}>
                  ה-AI מעבד את הקובץ...
                </Text>
              </View>
            ) : (
              <View style={styles.uploadingRow}>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>שלח ל-AI</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ─── Results ─── */}

          {parsedQuestions.length > 0 && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsSectionHeader}>
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={24}
                  color={theme.successBorder}
                />
                <Text style={styles.resultsSectionTitle}>
                  {parsedQuestions.length} שאלות חולצו בהצלחה
                </Text>
              </View>

              {parsedQuestions.map((q, index) => (
                <View key={index} style={styles.resultCard}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleExpand(index)}
                  >
                    <View style={styles.resultCardHeader}>
                      <Ionicons
                        name={
                          expandedIndex === index
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={20}
                        color={theme.textSecondary}
                      />
                      <View style={styles.resultCardTitleRow}>
                        <Text style={styles.resultCardTitle}>
                          שאלה {index + 1}
                        </Text>
                        <View style={styles.resultBadge}>
                          <Text style={styles.resultBadgeText}>
                            {q.options?.length || 0} אפשרויות
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Question text — editable */}
                  <Text style={styles.editFieldLabel}>תוכן השאלה</Text>
                  {expandedIndex === index && q.questionText ? (
                    <View style={styles.previewBox}>
                      <Text style={styles.previewLabel}>תצוגה מקדימה (LaTeX):</Text>
                      <MathText text={q.questionText} fontSize={15} color={theme.textPrimary} />
                    </View>
                  ) : null}
                  <TextInput
                    style={[
                      styles.editableInput,
                      expandedIndex !== index && { maxHeight: 60 },
                    ]}
                    value={q.questionText}
                    onChangeText={(val) => updateQuestionField(index, "questionText", val)}
                    multiline
                    textAlign="right"
                    onFocus={() => setExpandedIndex(index)}
                  />

                  {/* Expanded details */}
                  {expandedIndex === index && (
                    <View style={styles.expandedContent}>
                      {/* Options — editable */}
                      <Text style={styles.editFieldLabel}>אפשרויות תשובה</Text>
                      {q.options?.map((opt, oi) => (
                        <View key={oi}>
                          <View style={styles.editOptionRow}>
                            <TouchableOpacity
                              style={[
                                styles.correctRadio,
                                oi === q.correctAnswerIndex && styles.correctRadioActive,
                              ]}
                              onPress={() => updateCorrectAnswer(index, oi)}
                            >
                              {oi === q.correctAnswerIndex && (
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                              )}
                            </TouchableOpacity>
                            <TextInput
                              style={styles.editOptionInput}
                              value={opt}
                              onChangeText={(val) => updateOptionField(index, oi, val)}
                              textAlign="right"
                            />
                          </View>
                          {opt.trim() ? (
                            <View style={styles.optionPreviewBox}>
                              <MathText text={opt} fontSize={14} color={theme.textPrimary} />
                            </View>
                          ) : null}
                        </View>
                      ))}
                      <Text style={styles.editHint}>
                        לחץ על העיגול כדי לבחור את התשובה הנכונה
                      </Text>

                      {/* Diagram Section */}
                      <View style={styles.diagramSection}>
                        <Text style={styles.editFieldLabel}>תרשים (אופציונלי)</Text>
                        {q.imageUrl ? (
                          <View style={styles.diagramPreviewContainer}>
                            <Image source={{ uri: q.imageUrl }} style={styles.diagramThumbnail} />
                            <TouchableOpacity 
                              style={styles.removeDiagramBtn} 
                              onPress={() => handleRemoveDiagram(index)}
                            >
                              <Ionicons name="trash-outline" size={18} color="#F56565" />
                              <Text style={styles.removeDiagramText}>הסר תרשים</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={styles.attachDiagramBtn}
                            onPress={() => handleAttachDiagram(index)}
                            disabled={uploadingIndex !== null}
                          >
                            {uploadingIndex === index ? (
                              <ActivityIndicator size="small" color={theme.primaryColor} />
                            ) : (
                              <Ionicons name="image-outline" size={20} color={theme.primaryColor} />
                            )}
                            <Text style={styles.attachDiagramText}>
                              {uploadingIndex === index ? "מעלה תרשים..." : "צרף תרשים"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Explanation — editable */}
                      <Text style={styles.editFieldLabel}>הסבר</Text>
                      {q.explanation ? (
                        <View style={styles.previewBox}>
                          <Text style={styles.previewLabel}>תצוגה מקדימה (LaTeX):</Text>
                          <MathText text={q.explanation} fontSize={15} color={theme.textPrimary} />
                        </View>
                      ) : null}
                      <TextInput
                        style={[styles.editableInput, styles.explanationInput]}
                        value={q.explanation}
                        onChangeText={(val) => updateQuestionField(index, "explanation", val)}
                        multiline
                        textAlign="right"
                      />
                    </View>
                  )}
                </View>
              ))}

              {/* ─── Save to Database ─── */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving && { opacity: 0.6 },
                ]}
                onPress={handleSaveToFirestore}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <View style={styles.uploadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.saveButtonText}>שומר למאגר...</Text>
                  </View>
                ) : (
                  <View style={styles.uploadingRow}>
                    <Ionicons name="cloud-done-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>שמור למאגר</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.backgroundColor },
    container: {
      paddingHorizontal: 20,
      paddingTop: 50,
      paddingBottom: 60,
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.textLight,
      textAlign: "right",
      marginBottom: 16,
    },
    instructionBox: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      backgroundColor: "#F5F3FF",
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: "#DDD6FE",
    },
    instructionText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 22,
      color: "#5B21B6",
      textAlign: "right",
    },

    // Form
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

    // File picker
    filePickerButton: {
      backgroundColor: theme.cardBackground,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
      borderStyle: "dashed",
      paddingVertical: 28,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    filePickerText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.primaryColor,
    },
    filePickerHint: {
      fontSize: 12,
      color: theme.textSecondary,
      opacity: 0.7,
    },
    selectedFileRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    selectedFileInfo: {
      flex: 1,
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
    },
    selectedFileName: {
      flex: 1,
      fontSize: 14,
      color: theme.textPrimary,
      textAlign: "right",
    },

    // Upload button
    uploadButton: {
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
    uploadButtonText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "700",
    },
    uploadingRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },

    // Results
    resultsSection: {
      marginTop: 30,
    },
    resultsSectionHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
    },
    resultsSectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.textLight,
    },
    resultCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 14,
      padding: 18,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    resultCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    resultCardTitleRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },
    resultCardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.textPrimary,
    },
    resultBadge: {
      backgroundColor: "#EDE9FE",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    resultBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#8B5CF6",
    },
    resultQuestionText: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: "right",
      lineHeight: 23,
    },
    expandedContent: {
      marginTop: 14,
      borderTopWidth: 1,
      borderTopColor: "#EDF2F7",
      paddingTop: 14,
    },
    resultOptionRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    optionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#CBD5E0",
    },
    resultOptionText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "right",
      flex: 1,
    },
    explanationBox: {
      backgroundColor: "#F0FFF4",
      borderRadius: 10,
      padding: 14,
      marginTop: 10,
      borderWidth: 1,
      borderColor: "#C6F6D5",
    },
    explanationLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: "#276749",
      textAlign: "right",
      marginBottom: 6,
    },
    explanationText: {
      fontSize: 14,
      color: "#2F855A",
      textAlign: "right",
      lineHeight: 22,
    },

    // Editable fields
    editFieldLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.textSecondary,
      textAlign: "right",
      marginBottom: 6,
      marginTop: 10,
    },
    editableInput: {
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: theme.textPrimary,
      textAlign: "right",
    },
    previewBox: {
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
    },
    previewLabel: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#64748B",
      marginBottom: 6,
      textAlign: "right",
    },
    explanationInput: {
      minHeight: 80,
      backgroundColor: "#F0FFF4",
      borderColor: "#C6F6D5",
    },
    editOptionRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    correctRadio: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: "#CBD5E0",
      justifyContent: "center",
      alignItems: "center",
    },
    correctRadioActive: {
      backgroundColor: "#48BB78",
      borderColor: "#48BB78",
    },
    editOptionInput: {
      flex: 1,
      backgroundColor: '#F7FAFC',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.textPrimary,
    },
    optionPreviewBox: {
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 8,
      padding: 8,
      marginBottom: 6,
      marginLeft: 38,
    },
    editHint: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: "right",
      opacity: 0.7,
      marginBottom: 8,
    },

    // Diagram
    diagramSection: {
      marginTop: 10,
      marginBottom: 10,
    },
    attachDiagramBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F7FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderStyle: 'dashed',
      borderRadius: 10,
      paddingVertical: 12,
      gap: 8,
    },
    attachDiagramText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primaryColor,
    },
    diagramPreviewContainer: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 10,
      padding: 10,
      gap: 15,
    },
    diagramThumbnail: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: '#EDF2F7',
      resizeMode: 'cover',
    },
    removeDiagramBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 4,
      padding: 8,
      backgroundColor: '#FFF5F5',
      borderRadius: 8,
    },
    removeDiagramText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#F56565',
    },

    // Save button
    saveButton: {
      backgroundColor: "#48BB78",
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 20,
      shadowColor: "#48BB78",
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

    // Access denied
    accessDenied: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    accessDeniedTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    accessDeniedText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    backButton: {
      backgroundColor: theme.primaryColor,
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 12,
    },
    backButtonText: {
      color: theme.textLight,
      fontSize: 16,
      fontWeight: "700",
    },
  });
