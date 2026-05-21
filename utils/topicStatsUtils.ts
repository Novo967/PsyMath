import { arrayRemove, arrayUnion, collection, doc, getDocs, increment, limit, query, where, writeBatch } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Question, Subject, TopicStats } from "../types";

/**
 * Utility function that processes the results of a submitted simulation
 * and updates stats per topic in `users/{userId}/topicStats/{topicId}`.
 */
export const processSimulationTopicStats = async (
  userId: string,
  questions: Question[],
  answers: (number | null)[]
) => {
  if (!userId || !questions || questions.length === 0) return;

  try {
    const batch = writeBatch(db);

    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      // We process the stats even if the user didn't answer (it counts as incorrect/attempted)
      // If we only want to track answered questions, we could check if userAnswer !== null
      
      const isCorrect = userAnswer === question.correctAnswerIndex;
      const topicId = question.topic;
      
      if (!topicId) return;

      const topicStatsRef = doc(db, "users", userId, "topicStats", topicId);

      // Using update/set logic: writeBatch with set({ ... }, { merge: true })
      // handles creating the document if it doesn't exist.
      const updates: any = {
        topicId: topicId,
        subject: question.subject,
        totalAttempted: increment(1),
      };

      if (isCorrect) {
        updates.totalCorrect = increment(1);
        updates.wrongQuestionIds = arrayRemove(question.id);
      } else {
        updates.wrongQuestionIds = arrayUnion(question.id);
      }

      batch.set(topicStatsRef, updates, { merge: true });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error processing topic stats:", error);
  }
};

/**
 * Generates a customized practice session for the weakest topics.
 */
export const generateTargetedPracticeSession = async (
  userId: string,
  weakTopics: string[],
  subject: Subject,
  instituteId: string
): Promise<Question[]> => {
  if (!userId || !weakTopics || weakTopics.length === 0) return [];

  try {
    let wrongQuestionIds: string[] = [];

    // Query each weak topic's stats to collect wrongQuestionIds
    for (const topic of weakTopics) {
      const statsRef = doc(db, "users", userId, "topicStats", topic);
      // Wait, we already have topic stats in WeaknessAnalyzerScreen, but just in case:
      // Actually we should just fetch wrongQuestionIds from those documents.
      // But we can just use a `in` query on the `topicStats` subcollection if we wanted, 
      // but we have specific topics, so we just getDocs with `where('topicId', 'in', weakTopics)`.
    }

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

    // Fetch the actual questions for these wrongQuestionIds
    // Note: 'in' query supports up to 10 items. We need to chunk them if > 10.
    if (wrongQuestionIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < wrongQuestionIds.length; i += 10) {
            chunks.push(wrongQuestionIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            const qQuery = query(
                collection(db, "questions"),
                where("instituteId", "==", instituteId),
                where("__name__", "in", chunk) // __name__ corresponds to document ID
            );
            const qSnap = await getDocs(qQuery);
            qSnap.forEach((docSnap) => {
                sessionQuestions.push({ id: docSnap.id, ...docSnap.data() } as Question);
            });
        }
    }

    // Shuffle the wrong questions
    sessionQuestions = sessionQuestions.sort(() => 0.5 - Math.random());

    // If we need more questions to reach 10-15 (let's aim for 12)
    const targetCount = 12;
    if (sessionQuestions.length < targetCount) {
        const remainingNeeded = targetCount - sessionQuestions.length;
        
        // We will fetch more questions from these weak topics that the user hasn't necessarily gotten wrong.
        // Or we can just limit the query.
        const extraQuery = query(
            collection(db, "questions"),
            where("instituteId", "==", instituteId),
            where("subject", "==", subject),
            where("topic", "in", weakTopics),
            limit(30) // Fetch some to shuffle
        );
        
        const extraSnap = await getDocs(extraQuery);
        let extraQuestions: Question[] = [];
        extraSnap.forEach((docSnap) => {
            const q = { id: docSnap.id, ...docSnap.data() } as Question;
            // Exclude already added ones
            if (!sessionQuestions.find(sq => sq.id === q.id)) {
                extraQuestions.push(q);
            }
        });

        extraQuestions = extraQuestions.sort(() => 0.5 - Math.random());
        sessionQuestions = [...sessionQuestions, ...extraQuestions.slice(0, remainingNeeded)];
    }

    // Final shuffle
    return sessionQuestions.sort(() => 0.5 - Math.random());

  } catch (error) {
    console.error("Error generating targeted session:", error);
    return [];
  }
};
