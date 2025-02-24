show shared_buffers;
explain select * from jsonbench where data->>'attr1' > 'M' order by data->>'attr1' limit 20;
