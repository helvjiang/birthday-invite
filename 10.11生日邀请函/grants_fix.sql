-- =========================================================================
--  补授权（上线前必跑一次）
--  背景：supabase.sql 里是用纯 SQL 建的表，Supabase 不会自动把权限授予
--        匿名访客(anon)。前端用 anon key 直连，若缺此授权，线上会
--        permission denied：读不到邀函、选座/赠礼写不进去。
--  用法：supabase.com → 项目 → SQL Editor → 粘贴本文件全部内容 → Run。
--        （只授权、不动数据，可放心重跑）
-- =========================================================================

-- 邀请函：访客只读（填写由您用后台/service_role 操作，不受此限）
grant select                      on public.invitations to anon, authenticated;

-- 报名状态：可读、可写（接受/婉拒）
grant select, insert, update     on public.guests      to anon, authenticated;

-- 座位：可读、可占用（只 UPDATE 空座，INSERT 用于预置空座已由建表脚本完成）
grant select, update             on public.seats       to anon, authenticated;

-- 赠礼：可读、可写
grant select, insert             on public.gifts       to anon, authenticated;
grant usage                      on sequence public.gifts_id_seq to anon, authenticated;
