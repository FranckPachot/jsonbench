drop table if exists jsonbench;
create table if not exists jsonbench (
    id bigint generated always as identity ( cache 100 ) primary key,
    data jsonb not null
);
create index on jsonbench ( (data->>'attr1') );
show shared_buffers;
