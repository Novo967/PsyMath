const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function analyzeChurnFactorsFixed() {
    console.log('Fetching users to analyze churn factors...');
    const usersSnapshot = await db.collection('users').get();

    let validUsersForKillerQuestions = 0;
    let validUsersForDuplicates = 0;
    let usersWhoSawDuplicates = 0;

    const lastQuestionTally = {};
    const secondLastQuestionTally = {};

    usersSnapshot.forEach(doc => {
        const data = doc.data();

        if (!data.createdAt || !data.lastQuestionDate) return;

        const createdAt = new Date(data.createdAt);
        const lastActive = new Date(data.lastQuestionDate);
        const userLifetimeDays = Math.floor(Math.abs(lastActive - createdAt) / (1000 * 60 * 60 * 24));

        if (userLifetimeDays === 0) {
            // חילוץ בטוח של מערך השאלות
            let practicedArray = [];
            if (data.practicedQuestions) {
                if (Array.isArray(data.practicedQuestions)) {
                    practicedArray = data.practicedQuestions;
                } else if (typeof data.practicedQuestions === 'object') {
                    // למקרה שפיירבייס שמר את המערך כמפה של אינדקסים
                    practicedArray = Object.values(data.practicedQuestions);
                }
            }

            // חילוץ בטוח של סך כל השאלות (מהשורש או מהסטריק)
            let totalPracticedCount = -1;
            if (data.totalQuestionsPracticed !== undefined) {
                totalPracticedCount = data.totalQuestionsPracticed;
            } else if (data.streakData && data.streakData.totalQuestionsPracticed !== undefined) {
                totalPracticedCount = data.streakData.totalQuestionsPracticed;
            }

            const uniqueQuestionsCount = practicedArray.length;

            // מנתחים רק משתמשים שפתרו לפחות שאלה אחת
            if (uniqueQuestionsCount > 0) {
                validUsersForKillerQuestions++;

                // 1. ניתוח שאלות נטישה (Killer Questions)
                const lastQuestion = practicedArray[uniqueQuestionsCount - 1];
                lastQuestionTally[lastQuestion] = (lastQuestionTally[lastQuestion] || 0) + 1;

                if (uniqueQuestionsCount > 1) {
                    const secondLastQuestion = practicedArray[uniqueQuestionsCount - 2];
                    secondLastQuestionTally[secondLastQuestion] = (secondLastQuestionTally[secondLastQuestion] || 0) + 1;
                }

                // 2. ניתוח כפילויות (רק למי שיש נתון מספרי תקין להשוואה)
                if (totalPracticedCount >= 0) {
                    validUsersForDuplicates++;
                    if (totalPracticedCount > uniqueQuestionsCount) {
                        usersWhoSawDuplicates++;
                    }
                }
            }
        }
    });

    const sortTally = (tallyObject) => {
        return Object.entries(tallyObject)
            .map(([questionId, count]) => ({ questionId, dropCount: count }))
            .sort((a, b) => b.dropCount - a.dropCount)
            .slice(0, 15);
    };

    const percentage = validUsersForDuplicates > 0
        ? ((usersWhoSawDuplicates / validUsersForDuplicates) * 100).toFixed(2) + '%'
        : '0%';

    const report = {
        analyzedUsersCount: validUsersForKillerQuestions,
        duplicateIssues: {
            usersWithDataForDuplicateCheck: validUsersForDuplicates,
            usersWhoSawDuplicates,
            percentage
        },
        topKillerQuestions_Last: sortTally(lastQuestionTally),
        topKillerQuestions_SecondLast: sortTally(secondLastQuestionTally)
    };

    fs.writeFileSync('churn_factors_fixed.json', JSON.stringify(report, null, 2));
    console.log('Analysis fixed and complete! Check churn_factors_fixed.json');
}

analyzeChurnFactorsFixed().catch(console.error);