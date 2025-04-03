// Simple MongoDB connection test
import { MongoClient } from 'mongodb';

async function testMongoDBConnection() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Successfully connected to MongoDB');
    
    // List all databases
    const databasesList = await client.db().admin().listDatabases();
    console.log('Databases:');
    databasesList.databases.forEach(db => {
      console.log(` - ${db.name}`);
    });
    
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  } finally {
    // Close the connection
    await client.close();
    console.log('MongoDB connection closed');
  }
}

testMongoDBConnection().catch(console.error);