// Simple MongoDB connection test script using require syntax
const { MongoClient } = require('mongodb');

async function testMongoDBConnection() {
  try {
    // Use the MongoDB URI directly
    const uri = "mongodb+srv://Khaleddd:Khaled123.@cluster0.rh8kusi.mongodb.net/Saas?retryWrites=true&w=majority&appName=Cluster0";
    
    console.log("MongoDB URI:", uri.substring(0, 15) + "..." + uri.substring(uri.indexOf('@')));
    
    // Create MongoDB client
    const client = new MongoClient(uri);
    
    // Connect to MongoDB
    await client.connect();
    
    // Test connection by listing databases
    const adminDb = client.db().admin();
    const dbInfo = await adminDb.listDatabases();
    console.log(`Connected to MongoDB Atlas successfully! Found ${dbInfo.databases.length} databases:`);
    
    // List databases
    dbInfo.databases.forEach((db, index) => {
      console.log(`${index + 1}. ${db.name} (${Math.round(db.sizeOnDisk / 1024 / 1024 * 100) / 100} MB)`);
    });
    
    // Insert a test document
    const db = client.db('saas_data');
    const collection = db.collection('connection_test');
    
    const result = await collection.insertOne({
      test: 'mongodb-atlas-direct-connection',
      timestamp: new Date(),
      source: 'direct-js-script'
    });
    
    console.log(`Inserted test document with ID: ${result.insertedId}`);
    
    // Close connection
    await client.close();
    return true;
  } catch (error) {
    console.error(`ERROR: Failed to connect to MongoDB Atlas: ${error}`);
    return false;
  }
}

// Run the test
testMongoDBConnection()
  .then(success => {
    console.log(`\nMongoDB connection test ${success ? 'succeeded' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during MongoDB connection test:', error);
    process.exit(1);
  });