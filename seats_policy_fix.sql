-- =========================================================================
--  换座修复 · 只跑这一个文件即可（无需重跑整库 schema）
--  问题根因：原 seats_take 策略用了 using (occupied_by is null)，
--            只允许更新「空座」。落席(占空座)能成功，但换座时
--            「腾空自己已占的旧座」属于更新一个非空座，被 RLS 拒绝，
--            导致旧座清不掉、换座后旧位仍显示有人。
--  修复：放宽为 using (true)，前端仍用 occupied_by=is.null 条件保证一座一人。
--  用法：supabase.com → 项目 → SQL Editor → 粘贴下面全部 → Run。
-- =========================================================================

drop policy if exists "seats_take" on public.seats;
create policy "seats_take" on public.seats for update
  using (true) with check (true);
