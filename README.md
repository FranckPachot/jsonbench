# Small benchmark to run same workload on MongoDB and PostgreSQL and compare CPU usage

## example to run:

### Run docker stats in one terminal

### Set benchmark parameters in another terminal

export CLIENTS=5
export DIR=./bench1
export BENCH_DOCS=1000 # number of documents inserted by each thread
export BENCH_NUM=10      # number of attributes in the document
export BENCH_BYTES=300   # size of each attributes in bytes

docker compose down --remove-orphans
docker compose up -d

### Run on MongoDB whith those parameters

export DB_URI=mongodb://mongodb:27017

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-mongodb-1
) -a docker compose up client --scale client=$CLIENTS

docker compose run -it --rm mongodb mongosh --host mongodb --eval '
 print("MongoDB count: "+db.jsonbench.countDocuments())
'

### Run on PostgreSQL with those parameters
export DB_URI=postgres://postgres:xxx@postgres:5432/postgres

perf stat -e instructions:u -G docker/$(
 docker inspect --format="{{.Id}}"  jsonbench-postgres-1
) -a docker compose up client --scale client=$CLIENTS

docker compose run -it --rm -e PGPASSWORD=xxx postgres psql -h postgres -U postgres -tc "
 select 'PostgreSQL count: ' || count(*) from jsonbench
 " 
