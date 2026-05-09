const admin = require("firebase-admin");

// ייבוא קובץ המפתחות הסודיים (ודא שהשם והנתיב נכונים)
const serviceAccount = require("./serviceAccountKey.json");

// אתחול החיבור לפיירבייס
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ייבוא השאלות המתוקנות
const newQuestionsData = require("./fixed_questions.json");

async function updateBadQuestions() {
  const collectionRef = db.collection("Questions");
  const questions = newQuestionsData.questions;

  console.log(`Starting to update ${questions.length} questions...`);

  for (const q of questions) {
    try {
      // הפקודה set תחליף את המסמך הקיים לחלוטין אם הוא קיים (מבוסס על ה-ID)
      // ותיצור אותו אם הוא לא קיים.
      const docRef = collectionRef.doc(q.id);
      await docRef.set(q);
      console.log(`Successfully updated question ID: ${q.id}`);
    } catch (error) {
      console.error(`Error updating question ID: ${q.id}`, error);
    }
  }

  console.log("All bad questions have been successfully replaced!");
  process.exit(0);
}

// הרצת הפונקציה
updateBadQuestions();
