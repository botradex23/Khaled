/**
 * MongoDB Atlas Connection Test with Insert Operation
 * 
 * This script tests the MongoDB Atlas connection by inserting a test document.
 * It uses the established Node.js/TypeScript infrastructure from our project.
 */

async function testMongoDBInsert() {
  try {
    // Import the MongoDB module
    const { MongoClient } = require('mongodb');
    
    // Use the MongoDB URI directly (hardcoded for this test)
    const uri = "mongodb+srv://Khaleddd:Khaled123.@cluster0.rh8kusi.mongodb.net/Saas?retryWrites=true&w=majority&appName=Cluster0";
    
    console.log("MongoDB URI:", uri.substring(0, 15) + "..." + uri.substring(uri.indexOf('@')));
    
    try {
      // Create MongoDB client
      const client = new MongoClient(uri, {
        monitorCommands: true,
      });
      
      // Connect to MongoDB
      await client.connect();
      
      // Test connection
      const adminDb = client.db().admin();
      const dbInfo = await adminDb.listDatabases();
      console.log(`Connected to MongoDB Atlas successfully! Found ${dbInfo.databases.length} databases.`);
      
      // Insert test document into 'connection_test' collection in 'saas_data' database
      const db = client.db('saas_data');
      const collection = db.collection('connection_test');
      
      const result = await collection.insertOne({
        test: 'mongodb-atlas-connection',
        timestamp: new Date(),
        source: 'javascript-script'
      });
      
      console.log(`Inserted test document with ID: ${result.insertedId}`);
      
      // Close connection
      await client.close();
      return true;
    } catch (error) {
      console.error(`ERROR: Failed to connect to MongoDB Atlas: ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: Unexpected error: ${error}`);
    return false;
  }
}

// Run the test
testMongoDBInsert()
  .then(success => {
    console.log(`\nMongoDB insert test ${success ? 'succeeded' : 'failed'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during MongoDB insert test:', error);
    process.exit(1);
  });