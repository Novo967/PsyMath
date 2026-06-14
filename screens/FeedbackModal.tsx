import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ visible, onClose }: Props) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback) {
      Alert.alert('שגיאה', 'נא להזין תוכן לפני השליחה.');
      return;
    }

    if (!auth.currentUser) return;

    setIsSubmitting(true);
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const q = query(
        collection(db, 'feature_requests'),
        where('userId', '==', auth.currentUser.uid),
        where('createdAt', '>=', twentyFourHoursAgo)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.size >= 2) {
        Alert.alert(
          'הגבלת שליחה',
          'ניתן לשלוח עד 2 בקשות/משובים ביום. נשמח לשמוע ממך שוב מחר!'
        );
      } else {
        await addDoc(collection(db, 'feature_requests'), {
          userId: auth.currentUser.uid,
          message: trimmedFeedback,
          createdAt: serverTimestamp(),
          status: 'new',
        });

        Alert.alert('תודה!', 'המשוב שלך נשלח בהצלחה.');
        setFeedback('');
        onClose();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בעת שליחת המשוב. אנא נסה שוב מאוחר יותר.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#162C5B" />
                </TouchableOpacity>
                <Text style={styles.title}>נשמח לשמוע ממך </Text>
                <View style={{ width: 24 }} />
              </View>

              <Text style={styles.subtitle}>
                יש לך רעיון לשיפור? מצאת באג? נשמח לשמוע ממך!
              </Text>

              <TextInput
                style={styles.textInput}
                placeholder="מה נוכל לשפר?"
                placeholderTextColor="#A0AEC0"
                multiline
                maxLength={500}
                value={feedback}
                onChangeText={setFeedback}
                textAlignVertical="top"
              />

              <Text style={styles.charCount}>{feedback.length}/500</Text>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>שלח</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 44, 91, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#162C5B',
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'right',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    height: 150,
    fontSize: 16,
    color: '#2D3748',
    textAlign: 'right',
  },
  charCount: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'left',
    marginTop: 4,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
