
docker info || alias docker=podman

export SLEEP=1
export CLIENTS=1
export BENCH_OPERATION=${2:-insert}
export BENCH_DOCS=${3:-200}
export BENCH_NUM=10
export BENCH_BYTES=1000
export DIR=$PWD

case $1 in
 i*|init)
  docker compose -p jsonbench down --remove-orphans --volumes
  docker compose -p jsonbench up -d
  ;;
 p*|postgres*)
  export DB_URI=postgres://postgres:xxx@postgres:5432/postgres
  docker compose -p jsonbench run -i --rm client
  docker compose -p jsonbench run -i --rm -e PGPASSWORD=xxx postgres psql -h postgres -U postgres -tAc "
    vacuum analyze jsonbench;
    " -c " 
    select 'PostgreSQL count: ' || reltuples || ' size: ' || pg_size_pretty(pg_table_size('jsonbench')) || ' index: ' || pg_size_pretty(pg_indexes_size('jsonbench')) from pg_class where relname='jsonbench';
    " -c " 
    select id from jsonbench limit 2;
    select * from pg_stats where tablename='jsonbench' and attname='id';
    " 
  ;;
 m*|mongo)
  export DB_URI=mongodb://mongodb:27017
  docker compose -p jsonbench run -i --rm client
  docker compose -p jsonbench run -i --rm mongodb mongosh --host mongodb --eval '
        print("MongoDB count: "+db.runCommand({ collStats: "jsonbench" }).count+" size: "+Math.round(db.runCommand({ collStats: "jsonbench" }).size/1024/1024) + " MB")
        db.jsonbench.find({},{"_id":1}).limit(2);
    '
  ;;
 esac