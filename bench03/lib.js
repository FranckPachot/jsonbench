const { MongoClient } = require('mongodb');
const { Client } = require('pg');
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

async function mainOperation(count, stringSize, attrCount, connectionString, operation) {
    let client, db, collection, pgClient;
    let successCount = 0;
    let docsPerCall = 0;

    try {
        if (connectionString.startsWith('postgres://')) {
            pgClient = new Client({ connectionString });
            await pgClient.connect();
        } else if (connectionString.startsWith('mongodb://')) {
            client = new MongoClient(connectionString);
            await client.connect();
            db = client.db();
            collection = db.collection('jsonbench');
        } else {
            console.error("❌ Unsupported protocol in connection string");
            return successCount;
        }

        const startTime = performance.now();

        for (let i = 0; i < count; i++) {
            if (operation === 'insert') {
                docsPerCall = 1;
                const doc = generateDocument(stringSize, attrCount);
                if (pgClient) {
                    const insertQuery = `INSERT INTO jsonbench (data) VALUES ($1::jsonb) RETURNING *`;
                    const res = await pgClient.query(insertQuery, [JSON.stringify(doc)]);
                    successCount += res.rowCount;
                } else if (collection) {
                    const res = await collection.insertOne(doc);
                    if (res.acknowledged) {
                        successCount += 1;
                    }
                }
            } else if (operation === 'query') {
                docsPerCall = 100;
                const randomString = getRandomString(1);
                if (pgClient) {
                    const query = `SELECT * FROM jsonbench WHERE data->>'attr1' > $1 ORDER BY data->>'attr1' LIMIT $2`;
                    const res = await pgClient.query(query, [randomString, docsPerCall]);
                    successCount += res.rows.length;
                } else if (collection) {
                    const query = { "attr1": { $gt: randomString } };
                    const options = { sort: { "attr1": 1 }, limit: docsPerCall };
                    const res = await collection.find(query, options).toArray();
                    successCount += res.length;
                }
            } else if (operation === 'update') {
                docsPerCall = 1;
                const randomString = getRandomString(1);
                const newString = getRandomString(stringSize);
                if (pgClient) {
                    const selectQuery = `SELECT id FROM jsonbench WHERE data->>'attr1' >= $1 ORDER BY data->>'attr1' LIMIT $2`;
                    const res = await pgClient.query(selectQuery, [randomString, docsPerCall]);
                    const ids = res.rows.map(row => row.id);
                    if (ids.length > 0) {
                        const updateQuery = `UPDATE jsonbench SET data = jsonb_set(data, '{attr2}', $1::jsonb) WHERE id = ANY($2::bigint[])`;
                        const updateRes = await pgClient.query(updateQuery, [JSON.stringify(newString), ids]);
                        successCount += ids.length;
                    }
                } else if (collection) {
                    const query = { "attr1": { $gt: randomString } };
                    const options = { sort: { "attr1": 1 }, limit: docsPerCall, projection: { _id: 1 } };
                    const res = await collection.find(query, options).toArray();
                    const ids = res.map(doc => doc._id);
                    if (ids.length > 0) {
                        const updateQuery = { _id: { $in: ids } };
                        const update = { $set: { "attr2": newString } };
                        const updateRes = await collection.updateMany(updateQuery, update);
                        successCount += updateRes.modifiedCount;
                    }
                }
            } else if (operation === 'delete') {
                docsPerCall = 1;
                const randomString = getRandomString(1);
                if (pgClient) {
                    const selectQuery = `SELECT id FROM jsonbench WHERE data->>'attr1' > $1 ORDER BY data->>'attr1' LIMIT $2`;
                    const res = await pgClient.query(selectQuery, [randomString, docsPerCall]);
                    const ids = res.rows.map(row => row.id);
                    if (ids.length > 0) {
                        const deleteQuery = `DELETE FROM jsonbench WHERE id = ANY($1)`;
                        await pgClient.query(deleteQuery, [ids]);
                        successCount += ids.length;
                    }
                } else if (collection) {
                    const query = { "attr1": { $gt: randomString } };
                    const options = { sort: { "attr1": 1 }, limit: docsPerCall, projection: { _id: 1 } };
                    const res = await collection.find(query, options).toArray();
                    const ids = res.map(doc => doc._id);
                    if (ids.length > 0) {
                        const deleteQuery = { _id: { $in: ids } };
                        const deleteRes = await collection.deleteMany(deleteQuery);
                        successCount += deleteRes.deletedCount;
                    }
                }
            } else {
                console.error(`❌ Unknown operation: ${operation}`);
                break;
            }
            // print progress every 10%
            const progressInterval = Math.ceil(count / 10);
            if (i % progressInterval === 0) {
                const currentTime = performance.now();
                const duration = (currentTime - startTime) / 1000;
                const throughput = (successCount / duration).toFixed(2);
                console.log(`[${process.env.HOSTNAME}] ${pgClient ? 'PostgreSQL' : 'MongoDB'} (${((i / count) * 100).toFixed(0).padStart(3, ' ')}%) - ${operation} throughput: ${Math.round(throughput).toString().padStart(6, ' ')} docs/sec - ${successCount} documents`);
            }
        }

    } catch (err) {
        console.error(`❌ ${pgClient ? 'PostgreSQL' : 'MongoDB'} Error:`, err);
    } finally {
        if (pgClient) {
            await pgClient.end();
        } else if (client) {
            await client.close();
        }
    }

    return successCount;
}

(async () => {
    console.log('Environment Variables:');
    console.log(`BENCH_DOCS: ${process.env.BENCH_DOCS}`);
    console.log(`DB_URI: ${process.env.DB_URI}`);
    const startTime = performance.now();
    const totalCallst = parseInt(process.env.BENCH_DOCS, 10);
    const operations = ['update'];

    for (const operation of operations) {
        console.log(`[${new Date().toISOString()}] 🚀 Starting ${operation} from ${process.env.DB_URI} for ${totalCallst} calls`);
        const successCount = await mainOperation(totalCallst, 10, 5, process.env.DB_URI, operation);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`[${new Date().toISOString()}] 🏁 ${operation} workload completed in ${duration} seconds (${successCount} documents)`);
        // wait 1 second for 100 document workloads
        await new Promise(resolve => setTimeout(resolve, totalCallst * 1));
    }
})();
