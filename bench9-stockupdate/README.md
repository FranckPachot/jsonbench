Update a stock counter in a products table/collection:
- PostgreSQL `set stock=stock-1`
- MongoDB `{ $inc: { stock: -1 } `

Stats while running:
CONTAINER ID   NAME                   CPU %     MEM USAGE / LIMIT    MEM %     NET I/O           BLOCK I/O         PIDS
43d7f03ed322   jsonbench-mongodb-1    150.71%   98.71MiB / 9GiB      1.07%     186MB / 96.7MB    5.41MB / 125MB    57                                                                                     
a6ab26e1207e   jsonbench-postgres-1   182.36%   144MiB / 9GiB        1.56%     401MB / 197MB     31.9MB / 3.16GB   14

Thoughput
- MongoDB     throughput:    365 docs/sec
- PostgreSQL  throughput:    443 docs/sec

Network: total send 2GB MongoDB, 3GB PostgreSQL
<img width="1123" alt="image" src="https://github.com/user-attachments/assets/b9f64cfc-85d2-4856-ab77-edafcbf1fba1" />

CPU: similar, more system CPU for PostgreSQL, more user CPU for MongoDB
<img width="1125" alt="image" src="https://github.com/user-attachments/assets/c80486f7-669f-4408-bb43-e8816edf3008" />

RAM: low, 2x for filesystem cache with PostgreSQL
<img width="1116" alt="image" src="https://github.com/user-attachments/assets/7089ffc1-21a0-4ef0-87d2-184a2cac9786" />

DISK: 1.2GB written by MongoDB, 22.6GB written by PostgreSQL
<img width="1111" alt="image" src="https://github.com/user-attachments/assets/044791e4-956c-4582-ac3f-24eb7fc28a95" />

