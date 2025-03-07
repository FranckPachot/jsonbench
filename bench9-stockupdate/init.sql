drop table if exists products;
drop function if exists random;

CREATE OR REPLACE FUNCTION random_string(length INTEGER) RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, CAST(floor(random() * length(chars) + 1) AS INTEGER), 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;


create table if not exists products (
    id          bigint primary key,
    description text not null,
    stock       int not null default 0
);
insert into products select generate_series(1,1000), random_string(30), 10000;
select * from products;

