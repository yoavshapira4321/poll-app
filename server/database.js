const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://yoavshapira4321_db_user:D8LbinotlU0PpaKa@cluster0.8k2miyn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

console.log('🔗 MongoDB URI:', uri.replace(/D8LbinotlU0PpaKa/g, '***')); // Hide password in logs

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

let db;
let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    return db;
  }

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    
    // Test the connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");
    
    // Set the database
    db = client.db("pollapp");
    isConnected = true;
    
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
}

function getDatabase() {
  if (!isConnected || !db) {
    throw new Error("Database not connected. Call connectToDatabase first.");
  }
  return db;
}

async function closeConnection() {
  if (isConnected) {
    await client.close();
    isConnected = false;
    console.log('🔌 MongoDB connection closed');
  }
}

module.exports = {
  connectToDatabase,
  getDatabase,
  closeConnection
};