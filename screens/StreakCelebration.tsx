import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text
} from "react-native";

interface StreakCelebrationProps {
  visible: boolean;
  streakCount: number;
  onFinish: () => void;
}

/**
 * A brief celebration overlay that appears when the user earns
 * their daily streak (answered 5 questions in a day).
 * Auto-dismisses after ~2.2 seconds.
 */
export default function StreakCelebration({
  visible,
  streakCount,
  onFinish,
}: StreakCelebrationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const fireScale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible) {
      // Reset
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      fireScale.setValue(0.3);

      // Entrance animation
      Animated.parallel([
        // Backdrop fade in
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        // Card bounce in
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        // Fire icon bounce
        Animated.spring(fireScale, {
          toValue: 1,
          friction: 3,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hold for a moment, then auto-dismiss
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 350,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.8,
              duration: 350,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start(() => {
            onFinish();
          });
        }, 1800);
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.fireEmoji,
              { transform: [{ scale: fireScale }] },
            ]}
          >
            🔥
          </Animated.Text>
          <Text style={styles.title}>הרווחת את ההתקדמות היומית!</Text>
          <Text style={styles.streakNumber}>{streakCount}</Text>
          <Text style={styles.subtitle}>ימים רצופים של תרגול</Text>
          <Text style={styles.encouragement}>כל הכבוד!</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: "center",
    shadowColor: "#FF6B00",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 240,
  },
  fireEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#162C5B",
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: "900",
    color: "#F3902E",
    marginVertical: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7C9D",
    fontWeight: "600",
    marginBottom: 8,
  },
  encouragement: {
    fontSize: 16,
    fontWeight: "700",
    color: "#48BB78",
  },
});
