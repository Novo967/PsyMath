/**
 * migrateToMultiTenant.js
 *
 * One-time idempotent migration script to upgrade the Firestore database
 * for the multi-tenant B2B2C architecture.
 *
 * What it does:
 * 1. Adds `role` and `subjectStats` fields to all existing user documents
 *    (defaults to "student", specific UIDs set to "admin").
 *    Renames `instituteId: 'default_institute'` → `'B2C_PUBLIC'`.
 * 2. Copies questions from "Questions" (uppercase) to "questions" (lowercase),
 *    adding `instituteId`, `subject`, `groupId`, and `groupOrder` fields.
 * 3. Adds `instituteId` and `subject` to all `study_chapters` documents.
 * 4. Creates the `institutes/B2C_PUBLIC` document with the default theme.
 *
 * Usage:
 *   node migrateToMultiTenant.js
 *
 * Prerequisites:
 *   - serviceAccountKey.json must be present in the same directory.
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Configuration ──

const ADMIN_UIDS = [
  "N28RJF2qaWYZXIJgnfDngUyQfQ93",
  "B0wFwwhnYpWIFKlRZrll3RgY6Ea2",
];

const DEFAULT_INSTITUTE_ID = "B2C_PUBLIC";

const DEFAULT_THEME = {
  backgroundColor: "#9dbde9",
  cardBackground: "#FFFFFF",
  primaryColor: "#4A90E2",
  secondaryColor: "#3182CE",
  textPrimary: "#2D3748",
  textSecondary: "#4A5568",
  textLight: "#FFFFFF",
  successBackground: "#F0FFF4",
  successBorder: "#48BB78",
  successText: "#276749",
  errorBackground: "#FFF5F5",
  errorBorder: "#F56565",
  errorText: "#9B2C2C",
  tipBackground: "#FEFCBF",
  tipBorder: "#D69E2E",
  ruleBackground: "#FED7D7",
  ruleBorder: "#E53E3E",
};

// ── Migration Functions ──

async function migrateUsers() {
  console.log("\n═══ Step 1: Migrating Users ═══");
  const usersSnap = await db.collection("users").get();
  let updated = 0;
  let skipped = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    // Set role if missing
    if (!data.role) {
      const role = ADMIN_UIDS.includes(doc.id) ? "admin" : "student";
      updates.role = role;
      needsUpdate = true;
    }

    // Rename default_institute → B2C_PUBLIC
    if (data.instituteId === "default_institute" || !data.instituteId) {
      updates.instituteId = DEFAULT_INSTITUTE_ID;
      needsUpdate = true;
    }

    // Backfill subjectStats if missing
    if (!data.subjectStats) {
      updates.subjectStats = {
        quantitative: {
          totalPracticed: data.totalQuestionsPracticed || 0,
          totalCorrect: data.totalCorrectAnswers || 0,
        },
        verbal: { totalPracticed: 0, totalCorrect: 0 },
        english: { totalPracticed: 0, totalCorrect: 0 },
      };
      needsUpdate = true;
    }

    // Ensure stats fields exist
    if (data.totalQuestionsPracticed === undefined) {
      updates.totalQuestionsPracticed = 0;
      needsUpdate = true;
    }
    if (data.totalCorrectAnswers === undefined) {
      updates.totalCorrectAnswers = 0;
      needsUpdate = true;
    }
    if (data.practicedQuestions === undefined) {
      updates.practicedQuestions = [];
      needsUpdate = true;
    }

    if (!needsUpdate) {
      skipped++;
      continue;
    }

    await doc.ref.update(updates);
    updated++;
    console.log(`  ✅ ${doc.id} → updated`);
  }

  console.log(`  Users migrated: ${updated}, already up-to-date: ${skipped}`);
}

async function migrateQuestions() {
  console.log("\n═══ Step 2: Migrating Questions (uppercase → lowercase) ═══");
  const oldCollection = db.collection("Questions");
  const newCollection = db.collection("questions");

  const oldSnap = await oldCollection.get();
  let copied = 0;
  let skipped = 0;

  for (const doc of oldSnap.docs) {
    // Check if already exists in new collection
    const existing = await newCollection.doc(doc.id).get();
    if (existing.exists) {
      skipped++;
      continue;
    }

    const data = doc.data();
    const migratedData = {
      ...data,
      instituteId: data.instituteId || DEFAULT_INSTITUTE_ID,
      subject: data.subject || "quantitative",
      groupId: data.groupId || null,
      groupOrder: data.groupOrder || null,
    };

    await newCollection.doc(doc.id).set(migratedData);
    copied++;
    console.log(`  ✅ Copied question: ${doc.id}`);
  }

  console.log(
    `  Questions copied: ${copied}, already existed: ${skipped}`
  );
  console.log(
    `  ⚠️  The old "Questions" collection has NOT been deleted.`
  );
  console.log(
    `     You can delete it manually from the Firebase Console once verified.`
  );
}

async function migrateStudyChapters() {
  console.log("\n═══ Step 3: Migrating Study Chapters ═══");
  const chaptersSnap = await db.collection("study_chapters").get();
  let updated = 0;
  let skipped = 0;

  for (const doc of chaptersSnap.docs) {
    const data = doc.data();

    // Skip if already has instituteId and subject
    if (data.instituteId && data.subject) {
      skipped++;
      continue;
    }

    const updates = {};
    if (!data.instituteId) {
      updates.instituteId = DEFAULT_INSTITUTE_ID;
    }
    if (!data.subject) {
      updates.subject = "quantitative";
    }

    await doc.ref.update(updates);
    updated++;
    console.log(`  ✅ Updated chapter: ${doc.id}`);
  }

  console.log(
    `  Chapters updated: ${updated}, already up-to-date: ${skipped}`
  );
}

async function createDefaultInstitute() {
  console.log("\n═══ Step 4: Creating Default Institute ═══");
  const instRef = db.collection("institutes").doc(DEFAULT_INSTITUTE_ID);
  const instSnap = await instRef.get();

  if (instSnap.exists) {
    console.log("  ⏭️  Default institute already exists. Skipping.");
    return;
  }

  await instRef.set({
    name: "PsyMath B2C",
    theme: DEFAULT_THEME,
    branding: {
      instituteName: "PsyMath",
      logoUrl: null,
      splashVideoUrl: null,
      appTitle: "הכנה לפסיכומטרי",
      authWelcomeText: "ברוך הבא לכמותי",
      authSubtitleText: "נתחיל להתכונן?",
      loginWelcomeText: "התחברות",
      loginSubtitleText: "טוב לראות אותך שוב!",
      contactUrl: "https://novo967.github.io/Camuty-landing-page/contact.html",
      policyUrl: "https://novo967.github.io/Camuty-landing-page/",
    },
    logoUrl: null,
  });

  console.log("  ✅ Created institutes/B2C_PUBLIC");
}

// ── Main ──

async function main() {
  console.log("🚀 Starting Multi-Tenant Migration...\n");

  try {
    await migrateUsers();
    await migrateQuestions();
    await migrateStudyChapters();
    await createDefaultInstitute();

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
  }

  process.exit(0);
}

main();
