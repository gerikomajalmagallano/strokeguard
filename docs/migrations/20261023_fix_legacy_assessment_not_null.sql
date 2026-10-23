begin;

do $$
declare
  v_column_name text;
begin
  foreach v_column_name in array array['classification', 'classification_reason', 'facial_eye', 'facial_mouth'] loop
    if exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'assessments'
        and c.column_name = v_column_name
        and c.is_nullable = 'NO'
    ) then
      execute format('alter table public.assessments alter column %I drop not null', v_column_name);
    end if;
  end loop;
end
$$;

notify pgrst, 'reload schema';

commit;
