# Small benchmark to run same workload on MongoDB and PostgreSQL and compare CPU usage

## example to run:

### Run docker top in one terminal

### Set benchmark parameters in another terminal

export CLIENTS=10
export DIR=./bench1
export BENCH_DOCS=100000 # number of documents inserted by each thread
export BENCH_NUM=10     # number of attributes in the document
export BENCH_BYTES=300  # size of each attributes in bytes

docker compose down --remove-orphans

### Run on MongoDB whith those parameters

export DB_URI=mongodb://mongodb:27017
docker compose up client --scale client=$CLIENTS
docker compose run -it --rm mongodb mongosh --host mongodb --eval '
 print("MongoDB count: "+db.jsonbench.countDocuments())
'

### Run on PostgreSQL with those parameters
export DB_URI=postgres://postgres:xxx@postgres:5432/postgres
docker compose up client --scale client=$CLIENTS
docker compose run -it --rm -e PGPASSWORD=xxx postgres psql -h postgres -U postgres -tc "
 select 'PostgreSQL count: ' || count(*) from jsonbench
 " 
