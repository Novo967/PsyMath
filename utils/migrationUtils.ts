import { collection, doc, getDoc, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Phase 1: Migrate a single user document safely.
 * Ensures the user has the basic fields required by the app's statistics.
 * As requested, we skip topicStats sub-collection initialization since it's handled dynamically.
 */
export const migrateSingleUser = async (userId: string) => {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      const updates: any = {};

      // Ensure basic statistic fields exist
      if (data.totalQuestionsPracticed === undefined) {
        updates.totalQuestionsPracticed = 0;
      }
      if (data.totalCorrectAnswers === undefined) {
        updates.totalCorrectAnswers = 0;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
        console.log(`Successfully migrated user ${userId}`);
      } else {
        console.log(`User ${userId} already has all necessary fields.`);
      }
    } else {
      console.log(`User ${userId} not found.`);
    }
  } catch (error) {
    console.error(`Error migrating single user ${userId}:`, error);
  }
};

/**
 * Phase 2: Bulk migration for all users.
 * Uses writeBatch to safely update all user documents that are missing the required fields.
 */
export const migrateAllUsers = async () => {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    
    // Firestore batches have a limit of 500 operations
    const MAX_BATCH_SIZE = 500;
    let batch = writeBatch(db);
    let operationCount = 0;
    let totalMigrated = 0;

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const updates: any = {};

      if (data.totalQuestionsPracticed === undefined) {
        updates.totalQuestionsPracticed = 0;
      }
      if (data.totalCorrectAnswers === undefined) {
        updates.totalCorrectAnswers = 0;
      }

      if (Object.keys(updates).length > 0) {
        batch.update(userDoc.ref, updates);
        operationCount++;
        totalMigrated++;

        // Commit and create a new batch if we hit the limit
        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
          console.log(`Committed a batch of ${MAX_BATCH_SIZE} users...`);
        }
      }
    }

    // Commit any remaining operations in the last batch
    if (operationCount > 0) {
      await batch.commit();
    }

    console.log(`Successfully migrated ${totalMigrated} total users.`);
    return totalMigrated;
  } catch (error) {
    console.error("Error running bulk migration for users:", error);
  }
};
