const { MongoClient } = require('mongodb');
const { Client } = require('pg');
const { performance } = require('perf_hooks');

async function mainOperation(count, connectionString) {
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
        } else {
            console.error("❌ Unsupported protocol in connection string");
            return successCount;
        }

        const startTime = performance.now();

        for (let i = 0; i < count; i++) {
                let id=Math.floor(Math.random() * 10000) + 1;
                if (pgClient) {
                        const updateQuery = `UPDATE products SET stock = stock-1 WHERE id = $1`;
                        const updateRes = await pgClient.query(updateQuery, [id]);
                        successCount += 1
                } else if (client) {
                        let updateRes = await client.db().collection("products").updateOne( { _id: id } , { $inc: { stock: -1 } });
                        successCount += updateRes.modifiedCount;
                }
            // print progress every 10%
            const progressInterval = Math.ceil(count / 10);
            if (i % progressInterval === 0) {
                const currentTime = performance.now();
                const duration = (currentTime - startTime) / 1000;
                const throughput = (successCount / duration).toFixed(2);
                console.log(`[${process.env.HOSTNAME}] ${pgClient ? 'PostgreSQL' : 'MongoDB'} (${((i / count) * 100).toFixed(0).padStart(3, ' ')}%) throughput: ${Math.round(throughput).toString().padStart(6, ' ')} docs/sec - ${successCount} documents`);
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
    console.log(`DB_URI: ${process.env.DB_URI}`);
    const startTime = performance.now();
        console.log(`[${new Date().toISOString()}] 🚀 Starting from ${process.env.DB_URI}`);
        const successCount = await mainOperation(parseInt(process.env.BENCH_DOCS, 10), process.env.DB_URI);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`[${new Date().toISOString()}] 🏁 workload completed in ${duration} seconds (${successCount} documents)`);
})();
