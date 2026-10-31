-- Keep the original explicit identity error before parent lookup/RLS, rather
-- than turning a reparent attempt into a misleading missing-course error.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.guard_instructor_curriculum_write()'::regprocedure);
  if position('begin' in definition)=0 then raise exception 'Unexpected curriculum guard definition'; end if;
  definition := replace(definition, E'begin\n', E'begin\n  if tg_op=''UPDATE'' then\n    if tg_table_name=''modules'' then\n      if new.course_id is distinct from old.course_id then raise exception using errcode=''23514'', message=''Modules cannot be moved between courses''; end if;\n    elsif new.module_id is distinct from old.module_id then\n      raise exception using errcode=''23514'', message=''Lessons cannot be moved between modules'';\n    end if;\n  end if;\n');
  execute definition;
end;
$$;
