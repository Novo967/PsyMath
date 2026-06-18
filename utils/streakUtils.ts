import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Gets today's date as YYYY-MM-DD string in local timezone.
 */
const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Checks if dateA is exactly one day before dateB.
 * Both dates are YYYY-MM-DD strings.
 */
const isYesterday = (dateA: string, dateB: string): boolean => {
  const a = new Date(dateA + "T00:00:00");
  const b = new Date(dateB + "T00:00:00");
  const diffMs = b.getTime() - a.getTime();
  return diffMs === 24 * 60 * 60 * 1000;
};

/**
 * Checks if two YYYY-MM-DD date strings represent the same day.
 */
const isSameDay = (dateA: string, dateB: string): boolean => {
  return dateA === dateB;
};

export interface StreakData {
  currentStreak: number;
  lastStreakDate: string;
  questionsAnsweredToday: number;
  lastActivityDate: string;
}

export interface StreakUpdateResult {
  currentStreak: number;
  justEarned: boolean;
}

/**
 * Updates the user's learning streak after answering question(s).
 *
 * Logic:
 * - Same day: increments questionsAnsweredToday. If it reaches 5 and streak
 *   hasn't been credited today, increments currentStreak and sets lastStreakDate.
 * - Yesterday: preserves currentStreak, resets questionsAnsweredToday to the
 *   new count. Credits streak if threshold is reached.
 * - Older than yesterday: resets currentStreak to 0, resets questionsAnsweredToday.
 *   Credits streak if threshold is reached.
 *
 * @param userId - Firebase Auth UID
 * @param answeredCount - Number of questions answered in this action (default 1)
 * @returns Object with currentStreak and whether the streak was just earned
 */
export const updateStreak = async (
  userId: string,
  answeredCount: number = 1
): Promise<StreakUpdateResult> => {
  if (!userId) return { currentStreak: 0, justEarned: false };

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return { currentStreak: 0, justEarned: false };

    const data = userSnap.data();
    const today = getTodayDateString();

    // Read existing streak data (with defaults for first-time users)
    const existing: StreakData = {
      currentStreak: data.streakData?.currentStreak ?? 0,
      lastStreakDate: data.streakData?.lastStreakDate ?? "",
      questionsAnsweredToday: data.streakData?.questionsAnsweredToday ?? 0,
      lastActivityDate: data.streakData?.lastActivityDate ?? "",
    };

    let newStreak = existing.currentStreak;
    let newQuestionsToday = existing.questionsAnsweredToday;
    let newLastStreakDate = existing.lastStreakDate;
    const alreadyCreditedToday = isSameDay(existing.lastStreakDate, today);

    if (isSameDay(existing.lastActivityDate, today)) {
      // --- SAME DAY: just add to today's count ---
      newQuestionsToday += answeredCount;
    } else if (isYesterday(existing.lastActivityDate, today)) {
      // --- YESTERDAY: streak is alive, start fresh count for today ---
      newQuestionsToday = answeredCount;
    } else {
      // --- GAP > 1 day (or first ever activity): reset streak ---
      newStreak = 0;
      newQuestionsToday = answeredCount;
      newLastStreakDate = ""; // reset so we can credit today if threshold met
    }

    // Credit the streak if threshold reached and not already credited today
    let justEarned = false;
    if (newQuestionsToday >= 5 && !alreadyCreditedToday) {
      newStreak += 1;
      newLastStreakDate = today;
      justEarned = true;
    }

    // Write back to Firestore
    const updatedStreakData: StreakData = {
      currentStreak: newStreak,
      lastStreakDate: newLastStreakDate,
      questionsAnsweredToday: newQuestionsToday,
      lastActivityDate: today,
    };

    await updateDoc(userRef, {
      "streakData": updatedStreakData,
    });

    return { currentStreak: newStreak, justEarned };
  } catch (error) {
    console.error("Error updating streak:", error);
    return { currentStreak: 0, justEarned: false };
  }
};

/**
 * Fetches the current streak value for display purposes (e.g. on the Home Screen).
 * Also handles resetting a stale streak if last activity was more than 1 day ago.
 *
 * @param userId - Firebase Auth UID
 * @returns The current streak number (possibly reset to 0 if stale)
 */
export const fetchCurrentStreak = async (userId: string): Promise<number> => {
  if (!userId) return 0;

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return 0;

    const data = userSnap.data();
    const streakData = data.streakData;

    if (!streakData) return 0;

    const today = getTodayDateString();
    const lastActivity = streakData.lastActivityDate ?? "";

    // If last activity was today or yesterday, streak is still valid
    if (isSameDay(lastActivity, today) || isYesterday(lastActivity, today)) {
      return streakData.currentStreak ?? 0;
    }

    // Streak is stale — reset it in Firestore and return 0
    await updateDoc(userRef, {
      "streakData.currentStreak": 0,
      "streakData.questionsAnsweredToday": 0,
    });

    return 0;
  } catch (error) {
    console.error("Error fetching streak:", error);
    return 0;
  }
};
