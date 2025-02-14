drop table if exists jsonbench;
create table if not exists jsonbench (
    id uuid primary key,
    data jsonb not null
);
