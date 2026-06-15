import { arrayRemove, arrayUnion, collection, doc, getDocs, increment, limit, query, where, writeBatch } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type Subject = 'quantitative' | 'verbal' | 'english';

export interface Question {
  id: string;
  instituteId?: string;
  subject: Subject | string;
  topic: string;
  questionText: string;
  imageUrl?: string | null;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  difficulty?: string;
  groupId?: string | null;
  groupOrder?: number;
}

export interface TopicStats {
  topicId: string;
  subject: Subject | string;
  totalAttempted: number;
  totalCorrect: number;
  wrongQuestionIds: string[];
}

/**
 * Utility function that processes the results of a submitted simulation
 * and updates stats per topic in `users/{userId}/topicStats/{topicId}`.
 */
export const processSimulationTopicStats = async (
  userId: string,
  questions: Question[],
  answers: (number | null)[]
) => {
  console.log(`[DEBUG topicStats] Starting processSimulationTopicStats. userId: ${userId}, questions length: ${questions?.length}, answers length: ${answers?.length}`);

  if (!userId || !questions || questions.length === 0) {
    console.log("[DEBUG topicStats] Early exit: Missing userId or empty questions array.");
    return;
  }

  try {
    const batch = writeBatch(db);
    let validUpdatesCount = 0;

    questions.forEach((question, index) => {
      console.log(`[DEBUG topicStats] Processing question at index ${index}.`);
      console.log(`[DEBUG topicStats] Raw question object:`, question);
      
      const userAnswer = answers[index];
      const isCorrect = userAnswer === question.correctAnswerIndex;
      const topicId = question.topic;
      
      console.log(`[DEBUG topicStats] Extracted topicId: "${topicId}"`);

      if (!topicId) {
        console.log(`[DEBUG topicStats] Skipping question ${index} because topicId is falsy.`);
        return;
      }

      const topicStatsRef = doc(db, "users", userId, "topicStats", topicId);

      const updates: any = {
        topicId: topicId,
        subject: "quantitative",
        totalAttempted: increment(1),
      };

      if (isCorrect) {
        updates.totalCorrect = increment(1);
        updates.wrongQuestionIds = arrayRemove(question.id);
      } else {
        updates.wrongQuestionIds = arrayUnion(question.id);
      }

      console.log(`[DEBUG topicStats] Queuing batch set for topic: ${topicId}`);
      batch.set(topicStatsRef, updates, { merge: true });
      validUpdatesCount++;
    });

    if (validUpdatesCount > 0) {
      console.log(`[DEBUG topicStats] Committing batch with ${validUpdatesCount} updates.`);
      await batch.commit();
      console.log("[DEBUG topicStats] Batch commit successful!");
    } else {
      console.log("[DEBUG topicStats] No valid updates to commit (likely all missing topics).");
    }
  } catch (error) {
    console.error("[DEBUG topicStats] Error processing topic stats:", error);
  }
};

/**
 * Generates a customized practice session for the weakest topics.
 * Includes a fallback for when no weak topics are provided (e.g. first session).
 */
export const generateTargetedPracticeSession = async (
  userId: string,
  weakTopics: string[],
  subject: Subject | string,
  instituteId?: string
): Promise<Question[]> => {
  if (!userId) return [];

  try {
    // 1. FALLBACK LOGIC: If user has no weak topics, return random questions
    if (!weakTopics || weakTopics.length === 0) {
      let fallbackQuery = query(
        collection(db, "Questions"),
        limit(50)
      );
      
      const fallbackSnap = await getDocs(fallbackQuery);
      let fallbackQuestions: Question[] = [];
      fallbackSnap.forEach((docSnap) => {
        fallbackQuestions.push({ id: docSnap.id, ...docSnap.data() } as Question);
      });
      
      return fallbackQuestions.sort(() => 0.5 - Math.random()).slice(0, 12);
    }

    // 2. NORMAL TARGETED LOGIC
    let wrongQuestionIds: string[] = [];

    const topicStatsQuery = query(
      collection(db, "users", userId, "topicStats"),
      where("topicId", "in", weakTopics)
    );
    
    const statsSnap = await getDocs(topicStatsQuery);
    statsSnap.forEach((docSnap) => {
      const data = docSnap.data() as TopicStats;
      if (data.wrongQuestionIds && data.wrongQuestionIds.length > 0) {
        wrongQuestionIds = [...wrongQuestionIds, ...data.wrongQuestionIds];
      }
    });

    // Remove duplicates
    wrongQuestionIds = Array.from(new Set(wrongQuestionIds));

    let sessionQuestions: Question[] = [];

    if (wrongQuestionIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < wrongQuestionIds.length; i += 10) {
            chunks.push(wrongQuestionIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            const qQuery = query(
                collection(db, "Questions"),
                where("__name__", "in", chunk) 
            );
            const qSnap = await getDocs(qQuery);
            qSnap.forEach((docSnap) => {
                sessionQuestions.push({ id: docSnap.id, ...docSnap.data() } as Question);
            });
        }
    }

    sessionQuestions = sessionQuestions.sort(() => 0.5 - Math.random());

    const targetCount = 12;
    if (sessionQuestions.length < targetCount) {
        const remainingNeeded = targetCount - sessionQuestions.length;
        
        const extraQuery = query(
            collection(db, "Questions"),
            where("topic", "in", weakTopics),
            limit(30)
        );
        
        const extraSnap = await getDocs(extraQuery);
        let extraQuestions: Question[] = [];
        extraSnap.forEach((docSnap) => {
            const q = { id: docSnap.id, ...docSnap.data() } as Question;
            if (!sessionQuestions.find(sq => sq.id === q.id)) {
                extraQuestions.push(q);
            }
        });

        extraQuestions = extraQuestions.sort(() => 0.5 - Math.random());
        sessionQuestions = [...sessionQuestions, ...extraQuestions.slice(0, remainingNeeded)];
    }

    return sessionQuestions.sort(() => 0.5 - Math.random());

  } catch (error) {
    console.error("Error generating targeted session:", error);
    return [];
  }
};

/**
 * Fetches a limited, randomized set of questions for a specific topic.
 */
export const generateTopicSpecificPracticeSession = async (
  topicId: string,
  subject: Subject | string
): Promise<Question[]> => {
  if (!topicId) return [];
  try {
    const qQuery = query(
      collection(db, "Questions"),
      where("topic", "==", topicId),
      limit(15) // Limit to prevent massive reads
    );
    const qSnap = await getDocs(qQuery);
    let questions: Question[] = [];
    qSnap.forEach((docSnap) => {
      questions.push({ id: docSnap.id, ...docSnap.data() } as Question);
    });
    return questions.sort(() => 0.5 - Math.random());
  } catch (error) {
    console.error("Error fetching topic specific questions:", error);
    return [];
  }
};
