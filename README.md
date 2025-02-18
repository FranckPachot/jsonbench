# JSONBench 

A small benchmark used to run the same workload on MongoDB and PostgreSQL and compare CPU usage and other resource usage metrics.

_This is a work in progress, and the goal is to show how to compare databases on specific workloads, based on facts and knowing the context, and not to give general results. It is called JSONBench because it is a frequent question to compare storing documents in MongoDB, a document database, or in PostgreSQL, a SQL database with a JSONB datatype_

## Example

`runme.sh` contains an example
- bench1: with uuidv7 for the primary key (values are sequential on time)
- bench2: with uuidv4 for the primary key (values are random)
- bench3: with default primary key for ongoDB and a cache s100 sequence for PostgreSQL
- bench4: same as bench2 with non-clusterd index on MongoDB (reduces the impact of random uuid?)

Here are the outcomes of bench1 when inserting 1,000 documents (with 10 attributes, each 1,000 characters) across eight threads. This does not overwhelm the database, with the input being limited by the clients generating and sending documents to the server. By utilizing identical client code, we can maintain the same throughput on both databases, thus enabling an evaluation of the resources used by each. Given that the default settings in PostgreSQL are not optimal, it has been adjusted to match the memory allocations of the MongoDB instance alongside a similar checkpoint frequency: `shared_buffers=4GB -c max_wal_size=2GB --checkpoint_completion_target=0.9`. While MongoDB employs checksums during writes to identify storage failures, this feature is not enabled by default in PostgreSQL. It needs to be configured for data integrity, which was done for this benchmark. MongoDB compresses its WAL using Snappy, but PostgreSQL was not set up for compression as it would further increase CPU usage.

Here are some results and a quick analysis of bench1.

The throughput is similar. This is expected for a workload bound by the small number of clients.

For example, MongoDB [mongodb.out](./bench1/mongodb.out):
```
client-5  | [26d577f8d012] MongoDB (90%) - Throughput: 15.35 docs/sec
client-7  | [76abf301c91d] MongoDB (90%) - Throughput: 15.35 docs/sec
client-8  | [1e5e7488d140] MongoDB (90%) - Throughput: 15.26 docs/sec
client-6  | [7d9788346d2d] MongoDB (90%) - Throughput: 15.25 docs/sec
client-2  | [53771208db56] MongoDB (90%) - Throughput: 15.03 docs/sec
client-1  | [2e35d81af663] MongoDB (90%) - Throughput: 15.02 docs/sec
client-4  | [efcc0d27cde9] MongoDB (90%) - Throughput: 15.02 docs/sec
client-3  | [8239d0aaf0d6] MongoDB (90%) - Throughput: 14.70 docs/sec
```

And PostgreSQL [postgres.out](./bench1/postgres.out):
```
client-7  | [68d07da29cbe] PostgreSQL (90%) - Throughput: 15.66 docs/sec
client-1  | [08198b044908] PostgreSQL (90%) - Throughput: 15.50 docs/sec
client-8  | [d5fa6f6b9cfb] PostgreSQL (90%) - Throughput: 15.39 docs/sec
client-4  | [f5f4f64c98e3] PostgreSQL (90%) - Throughput: 15.36 docs/sec
client-6  | [43ac256c3180] PostgreSQL (90%) - Throughput: 15.33 docs/sec
client-2  | [50133e856dc8] PostgreSQL (90%) - Throughput: 15.32 docs/sec
client-5  | [deb1c3a36d9e] PostgreSQL (90%) - Throughput: 15.31 docs/sec
client-3  | [981e044c8a41] PostgreSQL (90%) - Throughput: 15.00 docs/sec
```

Rather than looking at the response time or throughput, it is more interesting to compare the resources used by those similar workloads.

I've run `perf stat -e instructions:u -G` to get the number of CPU instructions run by both. Here is a summary showing that PostgreSQL uses more 6x more CPU instructions for the same workload:

```
 6681 secs  141,578,546,171 cpu instr.        MongoDB (100%) - Throughput: 14.99 docs/sec -     MongoDB count: 800000 size: 7761 MB ./bench1/mongodb.out
 6598 secs  864,694,247,096 cpu instr.     PostgreSQL (100%) - Throughput: 15.18 docs/sec -  PostgreSQL count: 800000 size: 9530 MB ./bench1/postgres.out
```

The number of instructions provides a general idea, but not all instructions are equal. It is better to compare the CPU time, which is gathered by the Linux kernel for the container cgroups.
This lab is gathering those container statistics via cadvisor / prometheus / grafana

CPU utilization is calculated from the total seconds of CPU divided by the elapsed time:
<img width="1498" alt="image" src="https://github.com/user-attachments/assets/729575a9-488f-4ee1-b6f7-bd2398071207" />

Here are the details of the system and user CPU seconds. The run on MongoDB was first displayed in green, with a usage of 10 minutes of CPU during those two hours of elapsed time. PostgreSQL, displayed in blue, used 15 minutes during an equivalent elapsed time:
<img width="1502" alt="image" src="https://github.com/user-attachments/assets/4911d40b-80f2-43b5-bde0-ba7a41fe85cc" />

The memory usage is all in RSS for MongoDB, 2.9 GB, and a mix of shared memory and RSS for PostgreSQL, 4.3 GB, and both use the Linux filesystem cache, 6GB for MongoDB and 9GB for PostgreSQL:
<img width="1500" alt="image" src="https://github.com/user-attachments/assets/6a0eee9a-70c4-4a4f-8820-e5c3883bbdc9" />

During the run, MongoDB wrote 22GB, while PostgreSQL wrote 39GB:
<img width="1495" alt="image" src="https://github.com/user-attachments/assets/619812ad-615b-4450-bf0d-ca7a53762d3a" />

On the network, both have sent nearly 8GB, which is the raw size of inserted data:
<img width="1501" alt="image" src="https://github.com/user-attachments/assets/155c852e-64bf-49ac-a405-223b2eb4dc19" />

The script also gathers a `perf record` for 30 seconds in [mongodb.perf](./bench1/mongodb.perf) and [postgres.perf](./bench1/postgres.perf) that I have loaded into https://profiler.firefox.com/ 

MongoDB [flamegraph](https://share.firefox.dev/3X3PFGM) shows time spend in WiredTiger insert into the B-Tree and commit (with snappy compression on WAL):
<img width="1505" alt="image" src="https://github.com/user-attachments/assets/1b217a06-2b07-4226-b463-52caad0d404e" />

PostgreSQL [flamegraph](https://share.firefox.dev/4hFWMgD) shows time spent in TOAST compression and transaction log:
<img width="1508" alt="image" src="https://github.com/user-attachments/assets/ffe066fb-b970-49bf-8512-26d6f84bbd5d" />

All benchmarks must serve to understand the differences in implementation or configuration. For example, knowing that both databases utilize B-Tree indexes, I've run the same with a primary key generated from uuidv4 instead of uuidv7, which scatters the documents that were inserted together. Here are the figures as above, but now with the two runs (bench1 and bench2).

MongoDB uses more CPU than before:
```
 6681 secs  141,578,546,171 cpu instr.        MongoDB (100%) - Throughput: 14.99 docs/sec -     MongoDB count: 800000 size: 7761 MB ./bench1/mongodb.out
 6986 secs  261,344,461,947 cpu instr.        MongoDB (100%) - Throughput: 14.34 docs/sec -     MongoDB count: 800000 size: 7761 MB ./bench2/mongodb.out                                           
```
<img width="1498" alt="image" src="https://github.com/user-attachments/assets/fd548529-6484-44ff-831b-71bd80026c43" />

Memory is similar, as limited by the cache settings:
<img width="1123" alt="image" src="https://github.com/user-attachments/assets/afdb1e6b-c0a0-4569-b454-9716eb27d0f5" />

There were more reads, probably because of cache hits:
<img width="1503" alt="image" src="https://github.com/user-attachments/assets/d39a47de-f7a4-4e3f-830b-a08caa5c515a" />












