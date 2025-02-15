
## example to run:

### Run docker stats in one terminal

### Set benchmark parameters in another terminal

export SLEEP=600 # sleep between execution to see some deferred background activity
export CLIENTS=5
export DIR=./${1:-bench1}
export BENCH_DOCS=100000 # number of documents inserted by each thread
export BENCH_NUM=10      # number of attributes in the document
export BENCH_BYTES=1000   # size of each attributes in bytes

docker compose down --remove-orphans 
docker volume prune -f
docker compose up -d

sleep ${SLEEP}

### Run on MongoDB whith those parameters

{

export DB_URI=mongodb://mongodb:27017

docker stats --no-stream

(
perf record -o - --call-graph fp -F99 -e cpu-cycles -p $(
pgrep -d, "mongod"
) sleep 30 | perf script -F +pid > $DIR/perf.script
) &

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-mongodb-1
) -a docker compose up client --scale client=$CLIENTS 

docker compose run -i --rm mongodb mongosh --host mongodb --eval '
 print("MongoDB count: "+db.runCommand({ collStats: "jsonbench" }).count+" size: "+db.runCommand({ collStats: "jsonbench" }).size/1024/1025 + " MB")
'

docker stats --no-stream

} 2>&1 | tee $DIR/mongodb.out


sleep ${SLEEP}

### Run on PostgreSQL with those parameters

{

export DB_URI=postgres://postgres:xxx@postgres:5432/postgres

docker stats --no-stream

(
perf record -o - --call-graph fp -F99 -e cpu-cycles -p $(
pgrep -d, "postgres"
) sleep 30 | perf script -F +pid > $DIR/perf.script
) &

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-postgres-1
) -a docker compose up client --scale client=$CLIENTS 

docker compose run -i --rm -e PGPASSWORD=xxx postgres psql -h postgres -U postgres -tc "
 select 'PostgreSQL count: ' || count(*) || ' size: ' || pg_size_pretty(pg_table_size('jsonbench'))  from jsonbench
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
' $DIR/*.out


