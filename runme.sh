# Small benchmark to run same workload on MongoDB and PostgreSQL and compare CPU usage

## example to run:

### Run docker stats in one terminal

### Set benchmark parameters in another terminal

export CLIENTS=5
export DIR=./${1:-bench1}
export BENCH_DOCS=100000 # number of documents inserted by each thread
export BENCH_DOCS=10000
export BENCH_NUM=10      # number of attributes in the document
export BENCH_BYTES=1000   # size of each attributes in bytes

docker compose down --remove-orphans
docker compose up -d

sleep 300

### Run on MongoDB whith those parameters

{

export DB_URI=mongodb://mongodb:27017

docker stats --no-stream

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-mongodb-1
) -a docker compose up client --scale client=$CLIENTS 

docker compose run -i --rm mongodb mongosh --host mongodb --eval '
 print("MongoDB count: "+db.jsonbench.countDocuments()+" size: "+db.runCommand({ collStats: "jsonbench" }).size/1024/1025 + " MB")
'

docker stats --no-stream

} 2>&1 | tee $DIR/mongodb.out


sleep 300

### Run on PostgreSQL with those parameters

{

export DB_URI=postgres://postgres:xxx@postgres:5432/postgres

docker stats --no-stream

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-postgres-1
) -a docker compose up client --scale client=$CLIENTS 

docker compose run -i --rm -e PGPASSWORD=xxx postgres psql -h postgres -U postgres -tc "
 select 'PostgreSQL count: ' || count(*) || ' size: ' || pg_size_pretty(pg_table_size('jsonbench'))  from jsonbench
 " 

docker stats --no-stream

} 2>&1 | tee $DIR/postgres.out

sleep 300

# summary

set | grep -E "^(BENCH_.*|DIR|CLIENTS)="
awk '
/instructions:u/{i=$1}
/Throughput:/{sub(/.*]/,"");t=$0}
/seconds time elapsed/{s=$1}
/count:/{printf "%5d secs %16s cpu instr. %50s - %25s %s\n", s, i, t, $0, FILENAME}
' $DIR/*.out


