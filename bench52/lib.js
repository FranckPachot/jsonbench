
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
    const doc = { };
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
        const insertQuery = `INSERT INTO jsonbench (data) VALUES ($1::jsonb)`;
        const startTime = performance.now();
        for (let i = 0; i < count; i++) {
            const doc = generateDocument(stringSize, attrCount);
            await pgClient.query(insertQuery, [JSON.stringify(doc)]);
            successCount++;
            if (successCount % Math.ceil(count / 10) === 0) {
                const currentTime = performance.now();
                const duration = (currentTime - startTime) / 1000;
                const throughput = (successCount / duration).toFixed(2);
                console.log(`[${process.env.HOSTNAME}] PostgreSQL (${((successCount / count) * 100).toFixed(0)}%) - insert throughput: ${throughput} docs/sec`);
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
                console.log(`[${process.env.HOSTNAME}] MongoDB (${((successCount / count) * 100).toFixed(0)}%) - insert throughput: ${throughput} docs/sec`);
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

async function queryPostgres(totalCount, pgConfig) {
    const pgClient = new Client(pgConfig);
    let successCount = 0;
    try {
        await pgClient.connect();
        const startTime = performance.now();
        while (successCount < totalCount) {
            const remaining = totalCount - successCount;
            const batchSize = Math.min(50, remaining);
            const randomString = getRandomString(1);
            const query = `SELECT * FROM jsonbench WHERE data->>'attr1' > $1 ORDER BY data->>'attr1' LIMIT $2`;
            const res = await pgClient.query(query, [randomString, batchSize]);
            successCount += res.rows.length;
            if (successCount % Math.ceil(totalCount / 10) === 0) {
                const currentTime = performance.now();
                const duration = (currentTime - startTime) / 1000;
                const throughput = (successCount / duration).toFixed(2);
                console.log(`[${process.env.HOSTNAME}] PostgreSQL (${((successCount / totalCount) * 100).toFixed(0)}%) - query throughput: ${throughput} docs/sec`);
            }
        }
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const throughput = (totalCount / duration).toFixed(2);
        console.log(`🏁 PostgreSQL queries completed in ${duration} seconds at ${throughput} documents/second`);
    } catch (err) {
        console.error("❌ PostgreSQL Query Error:", err);
    } finally {
        await pgClient.end();
        console.log("✅ PostgreSQL Connection closed");
    }
}

async function queryMongo(totalCount, mongoUri) {
    const mongoClient = new MongoClient(mongoUri);
    let successCount = 0;
    try {
        await mongoClient.connect();
        const db = mongoClient.db();
        const collection = db.collection('jsonbench');
        const startTime = performance.now();
        while (successCount < totalCount) {
            const remaining = totalCount - successCount;
            const batchSize = Math.min(50, remaining);
            const randomString = getRandomString(1);
            const query = { "attr1": { $gt: randomString } };
            const options = { sort: { "attr1": 1 }, limit: batchSize };
            const res = await collection.find(query, options).toArray();
            successCount += res.length;
            if (successCount % Math.ceil(totalCount / 10) === 0) {
                const currentTime = performance.now();
                const duration = (currentTime - startTime) / 1000;
                const throughput = (successCount / duration).toFixed(2);
                console.log(`[${process.env.HOSTNAME}] MongoDB (${((successCount / totalCount) * 100).toFixed(0)}%) - query throughput: ${throughput} docs/sec`);
            }
        }
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const throughput = (totalCount / duration).toFixed(2);
        console.log(`🏁 MongoDB queries completed in ${duration} seconds at ${throughput} documents/second`);
    } catch (err) {
        console.error("❌ MongoDB Query Error:", err);
    } finally {
        await mongoClient.close();
        console.log("✅ MongoDB Connection closed");
    }
}

async function queryData(count, connectionString) {
    if (connectionString.startsWith('postgres://')) {
        const pgConfig = {
            connectionString: connectionString
        };
        await queryPostgres(count, pgConfig);
    } else if (connectionString.startsWith('mongodb://')) {
        await queryMongo(count, connectionString);
    } else {
        console.error("❌ Unsupported protocol in connection string");
    }
}
console.log("📚 lib.js loaded");


(async () => {
    const startTime = performance.now();
    const totalDocuments = parseInt(process.env.BENCH_DOCS, 10);
    console.log(`[${new Date().toISOString()}] 🚀 Starting query from ${process.env.DB_URI} for ${totalDocuments} documents`);
    await queryData(totalDocuments, process.env.DB_URI);
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] 🏁 Query workload completed in ${duration} seconds`);

})();
