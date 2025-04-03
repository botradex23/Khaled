/**
 * Direct MongoDB Connection Check
 * 
 * This script directly tests the MongoDB connection without going through the Express API.
 * It uses the same connection logic as the application but in a standalone context.
 */

// Use CommonJS import for MongoDB client
let MongoClient;
try {
  MongoClient = require('mongodb').MongoClient;
} catch (err) {
  console.error(`Failed to load mongodb module: ${err.message}`);
  console.error('Please install MongoDB using: npm install mongodb');
  process.exit(1);
}

async function checkMongoDBConnection() {
  // Hardcoded URI for testing (from previous Python output)
  // Note: In production, never hardcode sensitive information
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    console.error('MONGO_URI environment variable not found');
    return;
  }
  
  console.log(`Using MongoDB URI: ${mongoUri.slice(0, 20)}...`);

  let client;
  try {
    // Create a MongoDB client
    client = new MongoClient(mongoUri);
    
    // Connect to the MongoDB server
    await client.connect();
    
    // Check connection by pinging the database
    await client.db('admin').command({ ping: 1 });
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Parse the database name from the URI
    let dbName = 'Saas'; // Default database name
    
    if (mongoUri.includes('mongodb+srv://')) {
      try {
        const parts = mongoUri.split('/');
        if (parts.length >= 4) {
          const dbNameWithParams = parts[3];
          dbName = dbNameWithParams.split('?')[0];
        }
      } catch (error) {
        console.warn(`Warning: Could not parse database name from URI: ${error.message}`);
      }
    }
    
    console.log(`Database name: ${dbName}`);
    
    // Check for available collections
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    if (collections.length > 0) {
      const collectionNames = collections.map(c => c.name).join(', ');
      console.log(`Available collections: ${collectionNames}`);
    } else {
      console.log('No collections found in database');
    }
    
    // Check if required collections exist
    const requiredCollections = ['users', 'bots', 'tradeLogs', 'riskSettings'];
    const missingCollections = requiredCollections.filter(
      name => !collections.some(c => c.name === name)
    );
    
    if (missingCollections.length > 0) {
      console.warn(`⚠️ Missing collections: ${missingCollections.join(', ')}`);
    } else {
      console.log('✅ All required collections exist');
    }
    
    // Check for sample data in collections
    for (const collectionName of requiredCollections) {
      if (collections.some(c => c.name === collectionName)) {
        const count = await db.collection(collectionName).countDocuments();
        console.log(`Collection ${collectionName} has ${count} documents`);
      }
    }
    
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.error(error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the check
checkMongoDBConnection().catch(console.error);