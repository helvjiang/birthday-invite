-- =========================================================================
--  语音祝福 · 增量启用（只需在已建好的 Supabase 项目里跑一次）
--  场景：您之前已执行过 schema.sql / seats_policy_fix.sql，现在要加「语音祝福」。
--  用法：supabase.com → 项目 → SQL Editor 粘贴本文件全部内容 → Run。
-- =========================================================================

-- 1) seats 表加语音字段（已存在则忽略）
alter table public.seats add column if not exists voice_url text;

-- 2) 新建语音存储桶（public）并放开 anon 读写
insert into storage.buckets (id, name, public) values ('seat-voices','seat-voices', true)
  on conflict (id) do nothing;
drop policy if exists "voices_read"  on storage.objects;
drop policy if exists "voices_write" on storage.objects;
create policy "voices_read"  on storage.objects for select using (bucket_id = 'seat-voices');
create policy "voices_write" on storage.objects for insert with check (bucket_id = 'seat-voices');

-- 3) 确认 seats 的更新策略允许写入 voice_url（若之前跑过 seats_policy_fix.sql 则已满足）
drop policy if exists "seats_take" on public.seats;
create policy "seats_take" on public.seats for update using (true) with check (true);
