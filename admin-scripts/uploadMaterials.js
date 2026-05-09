const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// נתיב לקובץ מפתח השירות שהורדנו מ-Firebase
const serviceAccount = require("./serviceAccountKey.json");

// אתחול החיבור לפיירבייס כאדמין
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// פונקציה להעלאת הנתונים
async function uploadGeometryData() {
  try {
    console.log("קורא את קובץ הנתונים...");
    const dataPath = path.join(
      path.dirname(process.argv[1]),
      "geometry_data.json",
    );
    const fileContent = fs.readFileSync(dataPath, "utf8");
    const chapterData = JSON.parse(fileContent);

    // אנחנו נשתמש באוסף (Collection) בשם 'study_chapters'
    const docRef = db.collection("study_chapters").doc(chapterData.chapterId);

    console.log(`מעלה נתונים למסמך: ${chapterData.chapterId}...`);

    // מעלה את הנתונים, set עם merge יוודא שזה יערוך מסמך קיים או ייצור חדש
    await docRef.set(chapterData, { merge: true });

    console.log("✅ הנתונים הועלו בהצלחה לפיירבייס!");
    process.exit(0);
  } catch (error) {
    console.error("❌ שגיאה בהעלאת הנתונים:", error);
    process.exit(1);
  }
}

// הפעלת הפונקציה
uploadGeometryData();
