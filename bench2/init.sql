drop table if exists jsonbench;
create table if not exists jsonbench (
    "_id" bigserial primary key,
    id uuid,
    data jsonb not null
);
