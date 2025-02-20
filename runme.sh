
## example to run:

### Run docker stats in one terminal

### Set benchmark parameters in another terminal

export SLEEP=600 # sleep between execution to see some deferred background activity
export CLIENTS=8
export BENCH_DOCS=100000 # number of documents inserted by each thread
export BENCH_NUM=10      # number of attributes in the document
export BENCH_BYTES=100   # size of each attributes in bytes

# for quick tests
 # export SLEEP=1
 # export BENCH_DOCS=100

# reset all
docker compose -p jsonbench down --remove-orphans --volumes

for dir in ${*:-bench*}

do # run for each bench, cleaning the databases but not the statistics

export DIR=./$dir
# reset databases but keep prometheus data
docker compose -p jsonbench down mongodb postgres --volumes
docker compose -p jsonbench up -d

date
docker ps -a
docker volume ls

sleep ${SLEEP}

### Run on MongoDB whith those parameters

{

export DB_URI=mongodb://mongodb:27017

docker stats --no-stream
docker compose -p jsonbench logs mongodb-init

(
sleep 120 ; perf record -o - --call-graph fp -F99 -e cpu-cycles -p $(
pgrep -d, "mongod"
) sleep 120 | perf script -F +pid > $DIR/mongodb.perf ; sleep 120 ; docker stats --no-stream
) &

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-mongodb-1
) -a docker compose -p jsonbench up client --scale client=$CLIENTS 

docker compose -p jsonbench run -i --rm mongodb mongosh --host mongodb --eval '
 print("MongoDB count: "+db.runCommand({ collStats: "jsonbench" }).count+" size: "+Math.round(db.runCommand({ collStats: "jsonbench" }).size/1024/1024) + " MB")
 db.jsonbench.find({},{"_id":1}).limit(10);
'

docker stats --no-stream

} 2>&1 | tee $DIR/mongodb.out


sleep ${SLEEP}

### Run on PostgreSQL with those parameters

{

export DB_URI=postgres://postgres:xxx@postgres:5432/postgres

docker stats --no-stream
docker compose -p jsonbench logs postgres-init

(
sleep 120 ; perf record -o - --call-graph fp -F99 -e cpu-cycles -p $(
pgrep -d, "postgres"
) sleep 120 | perf script -F +pid > $DIR/postgres.perf ; sleep 120 ; docker stats --no-stream
) &

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-postgres-1
) -a docker compose -p jsonbench up client --scale client=$CLIENTS 

docker compose -p jsonbench run -i --rm -e PGPASSWORD=xxx postgres psql -h postgres -U postgres -tAc "
 vacuum analyze jsonbench;
 " -c " 
 select 'PostgreSQL count: ' || reltuples || ' size: ' || pg_size_pretty(pg_table_size('jsonbench'))  from pg_class where relname='jsonbench';
 " -c " 
 select id from jsonbench limit 10;
 select * from pg_stats where tablename='jsonbench' and attname='id';
 " 

docker stats --no-stream

} 2>&1 | tee $DIR/postgres.out

sleep ${SLEEP}

# summary

set | grep -E "^(BENCH_.*|DIR|CLIENTS)="
awk '
/instructions:u/{i=$1}
/Throughput:/{sub(/.*]/,"");t=$0}
/seconds time elapsed/{s=$1}
/count:/{printf "%5d secs %16s cpu instr. %50s - %25s %s\n", s, i, t, $0, FILENAME}
' $( ls -rt ./bench*/*.out )

done # when run with multiple bench directories

