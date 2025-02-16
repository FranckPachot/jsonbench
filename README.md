# JSONBench 

Small benchmark to run same workload on MongoDB and PostgreSQL and compare CPU usage and other metrics

## example

`runme.sh` contains an example
- bench1: with uuidv4
- bench1: with uuidv7

The thoughput is similar. This is not what I am testing with this workload that is bound by the small number of clients.

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

Rather than looking at the response time or throughput, I am interrested by the resource used by those similar workloads.

I've run `perf stat -e instructions:u -G` to get the number if CPU instructions run by both. Here is a short summary showing that PostgreSQL uses more CPU instructions for the same workload:

```
 6681 secs  141,578,546,171 cpu instr.        MongoDB (100%) - Throughput: 14.99 docs/sec -     MongoDB count: 800000 size: 7761 MB ./bench1/mongodb.out
 6598 secs  864,694,247,096 cpu instr.     PostgreSQL (100%) - Throughput: 15.18 docs/sec -  PostgreSQL count: 800000 size: 9530 MB ./bench1/postgres.out
```

This lab is gathering container statistics via cadvisor / prometheus / grafana

CPU utilization calculated from the total seconds of CPU divided by the elapsed time:
<img width="1498" alt="image" src="https://github.com/user-attachments/assets/729575a9-488f-4ee1-b6f7-bd2398071207" />

Here is the detail of system and user cpu seconds. The run on MongoDB was first, displayed in green, with a usage of 10 minutes of CPU during those two hours of elapsed time. PostgreSQL, displayed in blue, used 15 minutes during an equivalent elapsed time:
<img width="1502" alt="image" src="https://github.com/user-attachments/assets/4911d40b-80f2-43b5-bde0-ba7a41fe85cc" />

The memory usage is all in RSS for MongoDB, 2.9 GB, and a mix of shared memory and RSS for PostgreSQL, 4.3 GB and both use the linux filesystem cache, 6GB for MongoDB and 9GB for MongoDB:
<img width="1500" alt="image" src="https://github.com/user-attachments/assets/6a0eee9a-70c4-4a4f-8820-e5c3883bbdc9" />

During the run, MongoDB has written 22GB while PostgreSQL has written 39GB:
<img width="1495" alt="image" src="https://github.com/user-attachments/assets/619812ad-615b-4450-bf0d-ca7a53762d3a" />

On the network, both have sent nearly 8GB which is the raw size of inserted data:
<img width="1501" alt="image" src="https://github.com/user-attachments/assets/155c852e-64bf-49ac-a405-223b2eb4dc19" />

The script also gathers a `perf record` for 30 seconds, in [mongodb.perf](./bench1/mongodb.perf) and [postgres.perf](./bench1/postgres.perf) that I have loaded into https://profiler.firefox.com/ 

MongoDB [flamegraph](https://share.firefox.dev/3X3PFGM) shows time spend in WiredTiger insert into the B-Tree and commit (with snappy compression on WAL):
<img width="1505" alt="image" src="https://github.com/user-attachments/assets/1b217a06-2b07-4226-b463-52caad0d404e" />

PostgreSQL [flamegraph](https://share.firefox.dev/4hFWMgD) shows time spend in TOAST compression and transaction log:
<img width="1508" alt="image" src="https://github.com/user-attachments/assets/ffe066fb-b970-49bf-8512-26d6f84bbd5d" />



