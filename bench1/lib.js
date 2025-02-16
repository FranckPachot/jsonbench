const { MongoClient } = require('mongodb');
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { v7: uuidv7 } = require('uuid');
const { performance } = require('perf_hooks');

function getRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateDocument(stringSize, attrCount) {
    const doc = { "_id": uuidv7() };
    for (let i = 1; i <= attrCount; i++) {
        doc[`attr${i}`] = getRandomString(stringSize);
    }
    return doc;
}
async function insertIntoPostgres(count, stringSize, attrCount, pgConfig) {
    const pgClient = new Client(pgConfig);
    let successCount = 0;
    try {
        await pgClient.connect();
        await new Promise(resolve => setTimeout(resolve, 5000));
        const insertQuery = `INSERT INTO jsonbench (id, data) VALUES ($1, $2::jsonb)`;
        const startTime = performance.now();
        for (let i = 0; i < count; i++) {
            const doc = generateDocument(stringSize, attrCount);
            await pgClient.query(insertQuery, [doc._id, JSON.stringify(doc)]);
            successCount++;
            if (successCount % Math.ceil(count / 10) === 0) {
                const currentTime = performance.now();
                const duration = (currentTime - startTime) / 1000;
                const throughput = (successCount / duration).toFixed(2);
                console.log(`[${process.env.HOSTNAME}] PostgreSQL (${((successCount / count) * 100).toFixed(0)}%) - Throughput: ${throughput} docs/sec`);
            }
        }
        console.log(`✅ Inserted ${successCount} records into PostgreSQL`);
    } catch (err) {
        console.error("❌ PostgreSQL Error:", err);
    } finally {
        await pgClient.end();
        console.log("✅ PostgreSQL Connection closed");
    }
}

async function insertIntoMongo(count, stringSize, attrCount, mongoUri) {
    const mongoClient = new MongoClient(mongoUri);
    let successCount = 0;
    try {
        await mongoClient.connect();
        await new Promise(resolve => setTimeout(resolve, 5000));
        const db = mongoClient.db();
        const collection = db.collection('jsonbench');
        console.log("✅ Connected to MongoDB");
        const startTime = performance.now();
        for (let i = 0; i < count; i++) {
            const doc = generateDocument(stringSize, attrCount);
            await collection.insertOne(doc);
            successCount++;
            if (successCount % Math.ceil(count / 10) === 0) {
                const currentTime = performance.now();
                const duration = (currentTime - startTime) / 1000;
                const throughput = (successCount / duration).toFixed(2);
                console.log(`[${process.env.HOSTNAME}] MongoDB (${((successCount / count) * 100).toFixed(0)}%) - Throughput: ${throughput} docs/sec`);
            }
        }
        console.log(`✅ Inserted ${successCount} records into MongoDB`);
    } catch (err) {
        console.error("❌ MongoDB Error:", err);
    } finally {
        await mongoClient.close();
        console.log("✅ MongoDB Connection closed");
    }
}

async function insertData(count, stringSize, attrCount, connectionString) {
    if (connectionString.startsWith('postgres://')) {
        const pgConfig = {
            connectionString: connectionString
        };
        await insertIntoPostgres(count, stringSize, attrCount, pgConfig);
    } else if (connectionString.startsWith('mongodb://')) {
        await insertIntoMongo(count, stringSize, attrCount, connectionString);
    } else {
        console.error("❌ Unsupported protocol in connection string");
    }
}

console.log("📚 lib.js loaded");
(async () => {
    const startTime = performance.now();
    console.log(`[${new Date().toISOString()}] 🚀 Starting data insertion into ${process.env.DB_URI} for ${process.env.BENCH_DOCS} documents of ${process.env.BENCH_BYTES} bytes * ${process.env.BENCH_NUM} fields`);
    
    await insertData(process.env.BENCH_DOCS, process.env.BENCH_BYTES, process.env.BENCH_NUM, process.env.DB_URI);
    
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] 🏁 Data insertion completed in ${duration} seconds`);
})();

