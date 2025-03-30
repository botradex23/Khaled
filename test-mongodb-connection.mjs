// Simple script to test MongoDB connection directly using ESM
import { MongoClient } from 'mongodb';

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Khaleddd:Khaled123.@cluster0.rh8kusi.mongodb.net/Binance_apis?retryWrites=true&w=majority&appName=Cluster0';

// Function to test the connection
async function testConnection() {
  console.log('Attempting to connect to MongoDB...');
  console.log(`Using connection string: ${MONGODB_URI.substring(0, MONGODB_URI.indexOf('@'))}...`);
  
  try {
    // Connect to MongoDB
    const client = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await client.connect();
    console.log('Successfully connected to MongoDB!');
    
    // Get the database name from the connection string or use a default
    const dbName = 'Binance_apis';
    const db = client.db(dbName);
    
    // List all collections to verify access
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections in the database:`);
    collections.forEach((collection, i) => {
      console.log(`${i + 1}. ${collection.name}`);
    });
    
    // Try to read data from a collection
    try {
      console.log('\nTrying to read data from a collection (if any exists)...');
      if (collections.length > 0) {
        const firstCollection = collections[0].name;
        const docs = await db.collection(firstCollection).find({}).limit(3).toArray();
        console.log(`Read ${docs.length} documents from ${firstCollection}`);
        console.log('Sample document structure (keys only):');
        if (docs.length > 0) {
          console.log(Object.keys(docs[0]));
        } else {
          console.log('No documents found in collection');
        }
      }
    } catch (readErr) {
      console.error('Error reading from collection:', readErr);
    }
    
    // Create a test document to verify write access
    try {
      console.log('\nTrying to write a test document...');
      const testCollection = db.collection('connection_tests');
      const result = await testCollection.insertOne({
        test: 'Connection test',
        timestamp: new Date(),
        succeeded: true
      });
      console.log('Write test succeeded:', result.acknowledged);
    } catch (writeErr) {
      console.error('Error writing to database:', writeErr);
    }
    
    // Close the connection
    await client.close();
    console.log('\nMongoDB connection closed');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  }
}

// Run the test
testConnection().catch(console.error);