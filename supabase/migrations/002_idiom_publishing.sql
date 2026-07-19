-- Add an explicit publication state for vocabulary entries.
alter table public.idioms add column if not exists status text not null default 'draft';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'idioms_status_check') then
    alter table public.idioms add constraint idioms_status_check check (status in ('published', 'draft', 'offline'));
  end if;
end;
$$;

create index if not exists idioms_status_idx on public.idioms (status);

drop policy if exists "idioms authenticated read" on public.idioms;
create policy "published idioms read" on public.idioms
  for select to authenticated
  using (status = 'published' or public.is_admin());

