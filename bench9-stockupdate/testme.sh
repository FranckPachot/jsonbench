
docker info 2>/dev/null || alias docker=podman

export SLEEP=1
export CLIENTS=1
export BENCH_DOCS=${2:-1000}
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
  ;;
 m*|mongo)
  export DB_URI=mongodb://mongodb:27017
  docker compose -p jsonbench run -i --rm client
  ;;
 P*|psql*)
  export DB_URI=postgres://postgres:xxx@postgres:5432/postgres
  shift
  docker compose -p jsonbench run -iT --rm -e PGPASSWORD=xxx postgres psql -h postgres -U postgres $*
  ;;
 M*|mongosh)
  export DB_URI=mongodb://mongodb:27017
  shift
  docker compose -p jsonbench run -iT --rm mongodb mongosh --host mongodb $*
  ;;
 esac
