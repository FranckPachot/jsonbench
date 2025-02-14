drop table if exists jsonbench;
create table if not exists jsonbench (
    id uuid primary key,
    data jsonb not null
);
create index on jsonbench( data->>'attr1' );
create index on jsonbench( data->>'attr2' );
create index on jsonbench( data->>'attr3' );
create index on jsonbench( data->>'attr4' );
create index on jsonbench( data->>'attr5' );