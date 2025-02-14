drop table if exists jsonbench;
create table if not exists jsonbench (
    id uuid primary key,
    data json  not null
);
