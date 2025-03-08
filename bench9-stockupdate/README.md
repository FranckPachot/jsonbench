Update a stock counter in a products table/collection:
- PostgreSQL `set stock=stock-1`
- MongoDB `{ $inc: { stock: -1 } `

Stats while running:
```
CONTAINER ID   NAME                   CPU %     MEM USAGE / LIMIT    MEM %     NET I/O           BLOCK I/O         PIDS

43d7f03ed322   jsonbench-mongodb-1    150.71%   98.71MiB / 9GiB      1.07%     186MB / 96.7MB    5.41MB / 125MB    57                                                                                     
a6ab26e1207e   jsonbench-postgres-1   182.36%   144MiB / 9GiB        1.56%     401MB / 197MB     31.9MB / 3.16GB   14
```

Throughput (from 8 client threads)
- MongoDB     throughput:    365 docs/sec per thread - 8 x 1 million documents in 45 minutes, 1,235,994,679,533 CPU instructions
- PostgreSQL  throughput:    443 docs/sec per thread - 8 x 1 million documents in 37 minutes, 1,474,150,556,519 CPU instructions

Network: total sent by client 2GB MongoDB, 3GB PostgreSQL
<img width="1123" alt="image" src="https://github.com/user-attachments/assets/b9f64cfc-85d2-4856-ab77-edafcbf1fba1" />

RAM: low, 100MB RSS + 115MB cache for MongoDB, 100MB shared + 336MB cache with PostgreSQL
<img width="1116" alt="image" src="https://github.com/user-attachments/assets/7089ffc1-21a0-4ef0-87d2-184a2cac9786" />

DISK: 1.2GB written by MongoDB, 22.6GB written by PostgreSQL
<img width="1111" alt="image" src="https://github.com/user-attachments/assets/044791e4-956c-4582-ac3f-24eb7fc28a95" />

IOPS: 1260 IOPS for MongoDB, 2530 IOPS for PostgreSQL (to compare to 3000 and 3500 transactions per second)
<img width="1130" alt="image" src="https://github.com/user-attachments/assets/6d751b3a-f99b-4219-bbb9-f99f1cf71486" />

CPU: similar usage, more system CPU for PostgreSQL, more user CPU for MongoDB
<img width="1125" alt="image" src="https://github.com/user-attachments/assets/c80486f7-669f-4408-bb43-e8816edf3008" />

- CPU on the PostgreSQL backend: network, query planning, execute, WAL sync on commit

Note: same throughput with server-side prepared statement ([flamegraph](https://share.firefox.dev/4kAMTCQ))

Note: I don't know why ExecComputeStoredGenerated ([question](https://x.com/FranckPachot/status/1898447300038373654))

<img width="1426" alt="image" src="https://github.com/user-attachments/assets/2c959b41-415a-4fc8-af6d-08ecb7ad3edb" />


- CPU on the MongoDB connection: network + execute update

<img width="1428" alt="image" src="https://github.com/user-attachments/assets/dd7dc6de-31f3-4328-890a-34630ada4f58" />

Quick interpretation: updates in PostgreSQL copy the whole row. Here it is small, so the consequence on CPU and RAM is limited, but it has a huge consequence on Write-Ahead Logging (WAL) generated:
```
postgres=# prepare q(int) as UPDATE products SET stock = stock-1 WHERE id = $1;                                                               
PREPARE

postgres=# explain (analyze, verbose, buffers, wal, costs off) execute q(5);                                                                  
                                            QUERY PLAN                                                                                        
---------------------------------------------------------------------------------------------------                                           
 Update on public.products (actual time=0.051..0.052 rows=0 loops=1)
   Buffers: shared hit=5
   WAL: records=2 bytes=133
   ->  Index Scan using products_pkey on public.products (actual time=0.031..0.033 rows=1 loops=1)                                            
         Output: (stock - 1), ctid
         Index Cond: (products.id = $1)
         Buffers: shared hit=3
         WAL: records=1 bytes=62
 Planning Time: 0.010 ms
 Execution Time: 0.076 ms
```
Two WAL records (while reading because of previous update) generating 133 bytes, or more after a checkpoint:
```
postgres=# checkpoint;
CHECKPOINT
postgres=# explain (analyze, verbose, buffers, wal, costs off)
UPDATE products SET stock = stock-1 WHERE id = 42;
                                            QUERY PLAN                                             
---------------------------------------------------------------------------------------------------
 Update on public.products (actual time=0.099..0.100 rows=0 loops=1)
   Buffers: shared hit=5 dirtied=1
   WAL: records=3 fpi=1 bytes=8146
   ->  Index Scan using products_pkey on public.products (actual time=0.074..0.075 rows=1 loops=1)
         Output: (stock - 1), ctid
         Index Cond: (products.id = 42)
         Buffers: shared hit=3 dirtied=1
         WAL: records=2 fpi=1 bytes=8075
 Planning Time: 0.090 ms
 Execution Time: 0.126 ms
```
