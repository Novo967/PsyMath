import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";
import * as admin from "firebase-admin";
import * as path from "path";

// Initialize Source App (App 1) using Admin SDK to bypass read rules
const serviceAccountPath = path.resolve(__dirname, "./serviceAccountKey.json.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}
const sourceDb = admin.firestore();

// Initialize Target App (App 2)
const targetConfig = {
  apiKey: "AIzaSyA1_pkZw7Y5FGDd60HYJ_vJj6tCwhZjbLc",
  authDomain: "psymathweb.firebaseapp.com",
  projectId: "psymathweb",
  storageBucket: "psymathweb.firebasestorage.app",
  messagingSenderId: "611578804511",
  appId: "1:611578804511:web:0ec0bfd1c79497c319d82a"
};
const targetApp = initializeApp(targetConfig, "TargetApp");
const targetDb = getFirestore(targetApp);

// Mapping difficulty from App 1 (string) to App 2 (number)
const difficultyMap: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  // If there are any edge cases
  "1": 1, "2": 2, "3": 3, "4": 4
};

async function migrate() {
  console.log("Fetching questions from App 1 (Questions collection)...");
  
  const querySnapshot = await sourceDb.collection("Questions").get();
  const docs = querySnapshot.docs;
  
  console.log(`Found ${docs.length} questions to migrate.`);
  if (docs.length === 0) {
    console.log("No questions found. Exiting.");
    process.exit(0);
  }

  // Smart Mapping Logic
  const mapDocument = (data: any) => {
    // Determine isDataInterpretation based on imageUrl presence or topic
    const hasImage = !!data.imageUrl;
    const isChart = data.topic === 'charts' || data.topic === 'הסקה מתרשים';
    const isData = hasImage || isChart;

    return {
      text: data.questionText || "",               // App 1: questionText -> App 2: text
      options: data.options || [],                 // Stays the same
      correctIndex: data.correctAnswerIndex ?? 0,  // App 1: correctAnswerIndex -> App 2: correctIndex
      topic: data.topic || "algebra",              // Stays the same (might need translation if languages differ)
      difficulty: difficultyMap[data.difficulty] || 2, // App 1: string -> App 2: number
      isDataInterpretation: isData,                // App 2 specific boolean field
      imageUrl: hasImage ? data.imageUrl : null,   // Stays the same
      explanation: data.explanation || "",         // Stays the same
      createdAt: new Date(),                       // App 2 requires a createdAt Date
      
      // Preserving extra useful App 1 fields just in case App 2 needs them in the future
      subject: data.subject || "quantitative",
      instituteId: data.instituteId || null,
      groupId: data.groupId || null,
      groupOrder: data.groupOrder || null
    };
  };

  // Preview the first document before proceeding
  const firstDocData = docs[0].data();
  const mappedPreview = mapDocument(firstDocData);
  
  console.log("\n================ SCHEMA PREVIEW ================");
  console.log("--- Original (App 1) ---");
  console.log(JSON.stringify(firstDocData, null, 2));
  console.log("\n--- Mapped (App 2) ---");
  console.log(JSON.stringify(mappedPreview, null, 2));
  console.log("================================================");

  // Use a command line argument to actually execute the write
  if (!process.argv.includes('--execute')) {
    console.log("\nThis was a PREVIEW run. To actually write the data to App 2, run the script with the --execute flag:");
    console.log("npx tsx migrateQuestions.ts --execute");
    process.exit(0);
  }

  console.log("\nStarting batch migration to App 2 ('questions' collection)...");

  let batch = writeBatch(targetDb);
  let count = 0;
  let totalCommitted = 0;

  for (const document of docs) {
    const data = document.data();
    const mappedData = mapDocument(data);
    
    // IMPORTANT: Keep the exact same Document ID from the original collection
    const targetRef = doc(targetDb, "questions", document.id);
    batch.set(targetRef, mappedData);
    count++;

    // Firestore batch limit is 500 operations
    if (count === 500) {
      await batch.commit();
      totalCommitted += count;
      console.log(`Committed ${totalCommitted} documents...`);
      // Start a new batch
      batch = writeBatch(targetDb);
      count = 0;
    }
  }

  // Commit any remaining documents
  if (count > 0) {
    await batch.commit();
    totalCommitted += count;
  }

  console.log(`\nMigration complete! Successfully migrated ${totalCommitted} questions.`);
  process.exit(0);
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
