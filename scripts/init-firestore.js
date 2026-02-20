// Script to initialize Firestore collections
// Run: node scripts/init-firestore.js

const admin = require('firebase-admin');

// const serviceAccount = {
//   projectId: process.env.FIREBASE_PROJECT_ID || 'interview-970c8',
//   clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@interview-970c8.iam.gserviceaccount.com',
//   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
// };

const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function initializeCollections() {
  console.log('🚀 Initializing Firestore collections...\n');

  const collections = [
    { name: 'users', description: 'User profiles (jobseekers & recruiters)' },
    { name: 'companies', description: 'Company information' },
    { name: 'jobs', description: 'Job postings with tech stack' },
    { name: 'applications', description: 'Job applications linked to interviews' },
    { name: 'interviews', description: 'AI-generated interview sessions' },
    { name: 'feedbacks', description: 'AI analysis of interview performance' },
  ];

  try {
    for (const collection of collections) {
      console.log(`📁 Creating collection: ${collection.name}`);
      console.log(`   Description: ${collection.description}`);
      
      // Create a dummy document to initialize the collection
      const docRef = db.collection(collection.name).doc('_init');
      await docRef.set({
        _initialized: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        description: collection.description,
      });
      
      console.log(`   ✅ Collection ${collection.name} initialized\n`);
    }

    console.log('🎉 All collections initialized successfully!');
    console.log('\n📝 Note: You can delete the _init documents from Firebase Console');
    console.log('   or they will be automatically ignored by the app.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing collections:', error);
    process.exit(1);
  }
}

initializeCollections();
