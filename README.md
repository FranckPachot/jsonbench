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

CPU utilization calculated from the total seconds of CPU divided by yhe elapsed time:
<img width="1498" alt="image" src="https://github.com/user-attachments/assets/729575a9-488f-4ee1-b6f7-bd2398071207" />

Here is the detail of system and user cpu seconds. The run on MongoDB was first, displayed in green, with a usage of 9 minutes of CPU during those two hours of elapsed time. PostgreSQL, displayed in blue, used 15 minutes during an equivalent elapsed time:
<img width="1495" alt="image" src="https://github.com/user-attachments/assets/70e73d64-8c87-4b71-a7f7-faebebe6a4f2" />

