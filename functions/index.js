/**
 * PsyMath Cloud Functions — Push Notification Automations
 *
 * Two scheduled functions:
 * 1. sendStreakRiskReminders  — Daily at 20:00 Israel time (UTC+3)
 * 2. sendInactivityReminders  — Daily at 18:00 Israel time (UTC+3)
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { Expo } = require("expo-server-sdk");
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ region: "me-west1" });
// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const expo = new Expo();

/**
 * Helper: Gets today's date as YYYY-MM-DD string in Israel timezone (UTC+3).
 */
function getTodayDateStringIST() {
  const now = new Date();
  // Israel Standard Time is UTC+2, but Israel Daylight Time is UTC+3
  // Using Intl to get the correct local date
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // Returns YYYY-MM-DD
}

/**
 * Helper: Gets a date N days ago as YYYY-MM-DD string in Israel timezone.
 */
function getDateDaysAgoIST(daysAgo) {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/**
 * Helper: Send push notifications via Expo Push API.
 * Returns the number of successfully sent notifications.
 */
async function sendPushNotifications(tokens, title, body, data = {}) {
  const messages = tokens
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: data,
    }));

  if (messages.length === 0) return 0;

  const chunks = expo.chunkPushNotifications(messages);
  let successCount = 0;

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === "ok") successCount++;
      }
    } catch (error) {
      console.error("Error sending push notification chunk:", error);
    }
  }

  return successCount;
}

/**
 * STREAK RISK REMINDERS
 * Runs daily at 20:00 Israel time.
 *
 * Targets users who:
 * - Have an active streak (currentStreak > 0)
 * - Haven't earned today's streak yet (lastStreakDate !== today)
 * - Have a valid push token
 */
exports.sendStreakRiskReminders = onSchedule(
  {
    schedule: "0 20 * * *",
    timeZone: "Asia/Jerusalem",
    retryCount: 1,
  },
  async () => {
    console.log("Running streak risk reminder check...");

    const today = getTodayDateStringIST();
    const tokensToNotify = [];

    try {
      // Query users who have a push token
      const usersSnapshot = await db
        .collection("users")
        .where("expoPushToken", "!=", null)
        .get();

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const streakData = data.streakData;

        if (!streakData) return;

        const currentStreak = streakData.currentStreak || 0;
        const lastStreakDate = streakData.lastStreakDate || "";

        // Only target users with an active streak who haven't earned today
        if (currentStreak > 0 && lastStreakDate !== today) {
          const token = data.expoPushToken;
          if (token && Expo.isExpoPushToken(token)) {
            tokensToNotify.push({
              token,
              streak: currentStreak,
            });
          }
        }
      });

      console.log(`Found ${tokensToNotify.length} users at risk of losing their streak.`);

      if (tokensToNotify.length === 0) return;

      // Send personalized notifications with streak count
      const messages = tokensToNotify.map((user) => ({
        to: user.token,
        sound: "default",
        title: "🔥 הסטריק שלך בסכנה!",
        body: `כנס לתרגל 5 שאלות כדי לשמור על רצף של ${user.streak} ימים.`,
        data: { type: "streak_risk" },
      }));

      const chunks = expo.chunkPushNotifications(messages);
      let successCount = 0;

      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          for (const ticket of tickets) {
            if (ticket.status === "ok") successCount++;
          }
        } catch (error) {
          console.error("Error sending streak risk chunk:", error);
        }
      }

      // Log the notification batch
      await db.collection("notifications").add({
        title: "🔥 הסטריק שלך בסכנה!",
        body: "Streak risk batch reminder",
        sentAt: new Date(),
        targetType: "automated_streak_risk",
        sentCount: successCount,
        targetedCount: tokensToNotify.length,
      });

      console.log(`Streak risk reminders sent: ${successCount}/${tokensToNotify.length}`);
    } catch (error) {
      console.error("Error in sendStreakRiskReminders:", error);
    }
  }
);

/**
 * INACTIVITY REMINDERS
 * Runs daily at 18:00 Israel time.
 *
 * Targets users who:
 * - Haven't practiced for 3+ consecutive days
 * - Have a valid push token
 */
exports.sendInactivityReminders = onSchedule(
  {
    schedule: "0 18 * * *",
    timeZone: "Asia/Jerusalem",
    retryCount: 1,
  },
  async () => {
    console.log("Running inactivity reminder check...");

    const threeDaysAgo = getDateDaysAgoIST(3);
    const tokensToNotify = [];

    try {
      // Query users who have a push token
      const usersSnapshot = await db
        .collection("users")
        .where("expoPushToken", "!=", null)
        .get();

      usersSnapshot.forEach((doc) => {
        const data = doc.data();

        // Check the last activity date from streak data
        let lastActivity = null;

        if (data.streakData && data.streakData.lastActivityDate) {
          lastActivity = data.streakData.lastActivityDate;
        } else if (data.lastQuestionDate) {
          // Fallback: use lastQuestionDate (ISO string → YYYY-MM-DD)
          lastActivity = data.lastQuestionDate.split("T")[0];
        }

        // If no activity found or last activity was 3+ days ago
        if (!lastActivity || lastActivity <= threeDaysAgo) {
          const token = data.expoPushToken;
          if (token && Expo.isExpoPushToken(token)) {
            tokensToNotify.push(token);
          }
        }
      });

      console.log(`Found ${tokensToNotify.length} inactive users (3+ days).`);

      if (tokensToNotify.length === 0) return;

      // Pick a random encouraging message
      const encouragingMessages = [
        {
          title: "📚 בוא נחזור לתרגל!",
          body: "כבר עברו כמה ימים. אפילו 5 שאלות ביום עושות הבדל גדול!",
        },
        {
          title: "💪 המוח שלך מתגעגע!",
          body: "תרגול קצר של כמה דקות יכול לעשות את ההבדל בכמותי.",
        },
        {
          title: "🎯 לא לשכוח את המטרה!",
          body: "הפסיכומטרי מתקרב. בוא נשמור על המומנטום עם כמה שאלות.",
        },
      ];

      const message =
        encouragingMessages[
        Math.floor(Math.random() * encouragingMessages.length)
        ];

      const successCount = await sendPushNotifications(
        tokensToNotify,
        message.title,
        message.body,
        { type: "inactivity_reminder" }
      );

      // Log the notification batch
      await db.collection("notifications").add({
        title: message.title,
        body: message.body,
        sentAt: new Date(),
        targetType: "automated_inactivity",
        sentCount: successCount,
        targetedCount: tokensToNotify.length,
      });

      console.log(`Inactivity reminders sent: ${successCount}/${tokensToNotify.length}`);
    } catch (error) {
      console.error("Error in sendInactivityReminders:", error);
    }
  }
);
