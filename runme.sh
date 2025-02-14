# Small benchmark to run same workload on MongoDB and PostgreSQL and compare CPU usage

## example to run:

### Run docker stats in one terminal

### Set benchmark parameters in another terminal

export CLIENTS=10
export DIR=./bench1
export BENCH_DOCS=10000 # number of documents inserted by each thread
export BENCH_NUM=10      # number of attributes in the document
export BENCH_BYTES=300   # size of each attributes in bytes

docker compose down --remove-orphans
docker compose up -d

### Run on MongoDB whith those parameters

{

export DB_URI=mongodb://mongodb:27017

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-mongodb-1
) -a docker compose up client --scale client=$CLIENTS 

docker compose run -i --rm mongodb mongosh --host mongodb --eval '
 print("MongoDB count: "+db.jsonbench.countDocuments())
'

} 2>&1 | tee $DIR/mongodb.out

### Run on PostgreSQL with those parameters

{

export DB_URI=postgres://postgres:xxx@postgres:5432/postgres

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-postgres-1
) -a docker compose up client --scale client=$CLIENTS 

docker compose run -i --rm -e PGPASSWORD=xxx postgres psql -h postgres -U postgres -tc "
 select 'PostgreSQL count: ' || count(*) from jsonbench
 " 

} 2>&1 | tee $DIR/postgres.out

set | grep -E "^(BENCH_.*|DIR|CLIENTS)="
awk '
/instructions:u/{i=$1}
/Throughput:/{sub(/.*]/,"");t=$0}
/seconds time elapsed/{s=$1}
/count:/{printf "%f5.1 secs %16s cpu instr. %50s - %25s\n", s, i, t, $0}
' bench1/*.out


