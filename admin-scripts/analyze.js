const admin = require('firebase-admin');
const fs = require('fs');

// 1. Load your Firebase service account key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function analyzeUserEngagement() {
    console.log('Fetching users from Firebase...');

    // Replace 'users' with your actual collection name if it's different
    const usersSnapshot = await db.collection('users').get();
    const now = new Date();

    // Objects to store our histograms
    const recencyStats = {};   // How many days ago were they active?
    const lifetimeStats = {};  // How many days did they use the app in total?
    let totalUsersAnalyzed = 0;

    usersSnapshot.forEach(doc => {
        const data = doc.data();

        // Skip users missing critical dates
        if (!data.createdAt || !data.lastQuestionDate) return;

        totalUsersAnalyzed++;
        const createdAt = new Date(data.createdAt);
        const lastActive = new Date(data.lastQuestionDate);

        // Calculate Recency (Days since last active)
        const diffTimeRecency = Math.abs(now - lastActive);
        const daysSinceLastActive = Math.floor(diffTimeRecency / (1000 * 60 * 60 * 24));

        // Calculate Lifetime (Days between account creation and last activity)
        const diffTimeLifetime = Math.abs(lastActive - createdAt);
        const userLifetimeDays = Math.floor(diffTimeLifetime / (1000 * 60 * 60 * 24));

        // Aggregate the data
        recencyStats[daysSinceLastActive] = (recencyStats[daysSinceLastActive] || 0) + 1;
        lifetimeStats[userLifetimeDays] = (lifetimeStats[userLifetimeDays] || 0) + 1;
    });

    const report = {
        totalUsersAnalyzed,
        recencyDistribution: recencyStats,
        lifetimeDistribution: lifetimeStats
    };

    fs.writeFileSync('engagement_report.json', JSON.stringify(report, null, 2));
    console.log('Analysis complete! Check engagement_report.json');
}

analyzeUserEngagement().catch(console.error);