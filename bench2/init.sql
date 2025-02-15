drop table if exists jsonbench;
create table if not exists jsonbench (
    id bigserial primary key,
    data json    not null
);
