const admin = require("firebase-admin");

// ייבוא קובץ ההרשאות שהורדנו הרגע
const serviceAccount = require("./serviceAccountKey.json");

// אתחול החיבור לפיירבייס עם ההרשאות
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// תחליף את המחרוזת הזו ב-UID של המשתמש הפיקטיבי שיצרת
// (אפשר להעתיק את ה-UID מלשונית ה-Authentication בקונסול)
const uid = "qN6AfqVeYzgvHnmOQihh4uZHmRq1";

// פקודת העדכון
admin
  .auth()
  .updateUser(uid, {
    emailVerified: true,
  })
  .then((userRecord) => {
    console.log(
      "✅ המשתמש עודכן בהצלחה! סטטוס אימות:",
      userRecord.emailVerified,
    );
    process.exit(); // סיום ריצת הסקריפט
  })
  .catch((error) => {
    console.log("❌ שגיאה בעדכון המשתמש:", error);
    process.exit(1);
  });
