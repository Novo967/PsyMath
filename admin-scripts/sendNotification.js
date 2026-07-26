/**
 * Admin script to send push notifications to PsyMath users.
 *
 * Usage:
 *   node sendNotification.js --uid <USER_UID> --title "..." --body "..."
 *   node sendNotification.js --all --title "..." --body "..."
 *
 * Examples:
 *   node sendNotification.js --all --title "עדכון חדש!" --body "גרסה חדשה זמינה עם תכונות מדהימות."
 *   node sendNotification.js --uid abc123 --title "שלום!" --body "הודעת בדיקה."
 */

const admin = require("firebase-admin");
const { Expo } = require("expo-server-sdk");

// Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Initialize Expo SDK
const expo = new Expo();

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--uid" && args[i + 1]) {
      parsed.uid = args[++i];
    } else if (args[i] === "--all") {
      parsed.all = true;
    } else if (args[i] === "--title" && args[i + 1]) {
      parsed.title = args[++i];
    } else if (args[i] === "--body" && args[i + 1]) {
      parsed.body = args[++i];
    }
  }

  return parsed;
}

async function getTokensForUser(uid) {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    console.error(`User ${uid} not found.`);
    return [];
  }
  const token = userDoc.data().expoPushToken;
  if (!token) {
    console.error(`User ${uid} has no push token registered.`);
    return [];
  }
  return [token];
}

async function getAllTokens() {
  const snapshot = await db
    .collection("users")
    .where("expoPushToken", "!=", null)
    .get();

  const tokens = [];
  snapshot.forEach((doc) => {
    const token = doc.data().expoPushToken;
    if (token && Expo.isExpoPushToken(token)) {
      tokens.push(token);
    }
  });
  return tokens;
}

async function sendNotifications(tokens, title, body) {
  if (tokens.length === 0) {
    console.log("No valid tokens found. No notifications sent.");
    return;
  }

  // Build the messages
  const messages = tokens
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: { type: "admin_message" },
    }));

  if (messages.length === 0) {
    console.log("No valid Expo push tokens. No notifications sent.");
    return;
  }

  // Chunk and send
  const chunks = expo.chunkPushNotifications(messages);
  let successCount = 0;
  let errorCount = 0;

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of ticketChunk) {
        if (ticket.status === "ok") {
          successCount++;
        } else {
          errorCount++;
          console.error("Error ticket:", ticket);
        }
      }
    } catch (error) {
      console.error("Error sending chunk:", error);
      errorCount += chunk.length;
    }
  }

  console.log(
    `\nDone! Sent: ${successCount}, Errors: ${errorCount}, Total: ${messages.length}`
  );

  // Log the notification to Firestore for audit
  try {
    await db.collection("notifications").add({
      title: title,
      body: body,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      targetType: tokens.length === 1 ? "single" : "all",
      sentCount: successCount,
    });
    console.log("Notification logged to Firestore.");
  } catch (error) {
    console.error("Error logging notification:", error);
  }
}

async function main() {
  const args = parseArgs();

  if (!args.title || !args.body) {
    console.error("Error: --title and --body are required.");
    console.log(
      'Usage: node sendNotification.js --all --title "..." --body "..."'
    );
    console.log(
      '       node sendNotification.js --uid <UID> --title "..." --body "..."'
    );
    process.exit(1);
  }

  if (!args.uid && !args.all) {
    console.error("Error: Specify --uid <UID> or --all.");
    process.exit(1);
  }

  let tokens;
  if (args.uid) {
    console.log(`Sending notification to user: ${args.uid}`);
    tokens = await getTokensForUser(args.uid);
  } else {
    console.log("Sending notification to ALL users...");
    tokens = await getAllTokens();
  }

  console.log(`Found ${tokens.length} token(s).`);
  await sendNotifications(tokens, args.title, args.body);

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
