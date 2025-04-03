import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri!);

async function runTest() {
  try {
    await client.connect();
    const db = client.db('Binance_apis');
    const collection = db.collection('connection_test');

    const result = await collection.insertOne({
      test: 'mongodb-atlas-connection',
      timestamp: new Date(),
    });

    console.log('Inserted test document with ID:', result.insertedId);
  } catch (err) {
    console.error('MongoDB test insert failed:', err);
  } finally {
    await client.close();
  }
}

runTest();