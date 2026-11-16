-- Відео товару (запустити один раз у Supabase → SQL Editor)
alter table products add column if not exists video text;
