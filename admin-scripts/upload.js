const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const data = require('./questions9.json');

// אתחול החיבור לפיירבייס
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// פונקציה להעלאת השאלות לקולקשן 'Questions'
async function uploadData() {
  const questions = data.questions;
  let count = 0;

  for (const question of questions) {
    try {
      // יצירת דוקומנט חדש. משתמשים ב-id מה-JSON כשם הדוקומנט (אופציונלי)
      await db.collection('Questions').doc(question.id).set(question);
      count++;
      console.log(`Uploaded question ${question.id}`);
    } catch (error) {
      console.error(`Error uploading ${question.id}: `, error);
    }
  }
  
  console.log(`Successfully uploaded ${count} questions!`);
}

uploadData();