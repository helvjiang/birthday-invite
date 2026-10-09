-- =========================================================================
--  生辰邀函 · Supabase 建表与策略
--  用法：在 supabase.com → 项目 → SQL Editor 粘贴本文件全部内容运行。
--  说明：以下为「轻防护」策略，适合朋友间生日场景；如要更严，参见 README。
-- =========================================================================

-- 1) 邀请函（名字 → 专属全文）。前端只读；写入请用后台或 service role。
create table if not exists public.invitations (
  name             text primary key,
  invitation_text  text,                     -- 可为空：未填写时前端套默认古风兜底文案
  theme            text                      -- 可选：CSS 变量串，如 "--bg:#1a1410;--red:#e8b04b;"
);
alter table public.invitations enable row level security;
create policy "inv_read" on public.invitations for select using (true);

-- 2) 报名状态
create table if not exists public.guests (
  name      text primary key,
  status    text not null default 'pending',   -- accepted / rejected / pending
  seat_id   int,
  updated_at timestamptz default now()
);
alter table public.guests enable row level security;
create policy "guests_read"   on public.guests for select using (true);
create policy "guests_write"  on public.guests for insert with check (true);
create policy "guests_update" on public.guests for update using (true) with check (true);

-- 3) 爱心座位（100 个）
create table if not exists public.seats (
  seat_id          int primary key check (seat_id between 1 and 100),
  occupied_by      text,
  photo_url        text,
  message          text,                        -- 无字数上限
  photo_visibility text not null default 'public',  -- public / private
  voice_url        text,                       -- 语音祝福音频地址（公开播放）
  created_at       timestamptz
);
-- 预置 100 个空座
insert into public.seats (seat_id)
select generate_series(1, 100)
on conflict (seat_id) do nothing;
alter table public.seats enable row level security;
-- 所有人可看谁坐了哪、写了什么
create policy "seats_read" on public.seats for select using (true);
-- 允许占用空座、也允许腾空/编辑自己已占的座（前端用 occupied_by=is.null 条件保证「一座一人」）
create policy "seats_take" on public.seats for update
  using (true) with check (true);

-- 4) 赛博赠礼
create table if not exists public.gifts (
  id         bigserial primary key,
  from_name  text not null,
  gift_type  text not null,
  qty        int  not null default 1,
  created_at timestamptz default now()
);
alter table public.gifts enable row level security;
create policy "gifts_read"  on public.gifts for select using (true);
create policy "gifts_write" on public.gifts for insert with check (true);

-- 5) 图片存储桶（在 Storage 页面手动建同名 public 桶，或执行下面两行）
insert into storage.buckets (id, name, public) values ('seat-photos','seat-photos', true)
  on conflict (id) do nothing;
create policy "photos_read"  on storage.objects for select using (bucket_id = 'seat-photos');
create policy "photos_write" on storage.objects for insert with check (bucket_id = 'seat-photos');

-- 5.1) 语音存储桶（落席语音祝福）
insert into storage.buckets (id, name, public) values ('seat-voices','seat-voices', true)
  on conflict (id) do nothing;
create policy "voices_read"  on storage.objects for select using (bucket_id = 'seat-voices');
create policy "voices_write" on storage.objects for insert with check (bucket_id = 'seat-voices');

-- 6) 名单导入：不要在此手写。请用项目里的 import_invitations.py 从「邀请函-名单.xlsx」
--    一次性批量灌入（支持 upsert：已有则更新，无则插入）。之后陛下在 Supabase
--    后台的 Table Editor 里直接写/改每个人的 invitation_text，保存即生效。
--    未填写 invitation_text 的行留空（NULL），前端会自动套默认古风兜底文案。
