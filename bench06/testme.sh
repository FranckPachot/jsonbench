
docker info || alias docker=podman

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
 esac