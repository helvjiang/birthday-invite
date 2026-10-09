#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从「邀请函-名单.xlsx」生成 seed_invitations.sql（INSERT 语句），供陛下在 Supabase
SQL Editor 一次性灌入名单。空着的邀函文案写作 NULL（前端会自动套默认古风兜底）。

用法：python gen_seed.py
输出：seed_invitations.sql
"""
import openpyxl

def parse(path):
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    header = [(str(h).strip() if h is not None else "") for h in rows[0]]
    def idx(name):
        for i, h in enumerate(header):
            if name in h:
                return i
        return -1
    ci_name = idx("姓名") if idx("姓名") >= 0 else 0
    ci_text = idx("邀请函") if idx("邀请函") >= 0 else 1
    out = []
    for r in rows[1:]:
        name = r[ci_name] if ci_name < len(r) else None
        text = r[ci_text] if ci_text < len(r) else None
        if name is None or str(name).strip() == "":
            continue
        name = str(name).strip()
        text = str(text).strip() if (text is not None and str(text).strip() != "") else None
        out.append((name, text))
    return out

def sql_escape(s):
    return s.replace("\x00", "").replace("'", "''")

def main():
    data = parse("邀请函-名单.xlsx")
    lines = []
    lines.append("-- 生辰邀函 · 名单种子数据（由 gen_seed.py 从 xlsx 生成）")
    lines.append("-- 用法：在 Supabase → SQL Editor 粘贴全部内容运行。")
    lines.append("-- 说明：已写邀函全文者写入原文；空白者写 NULL，前端套默认古风兜底。")
    lines.append("-- ON CONFLICT 保证重跑不会报错；COALESCE 保证不会把已写文案覆盖成空。")
    lines.append("")
    # 逐条 INSERT（每条独立，便于精确定位错误；DO NOTHING 支持重跑且不会覆盖已填文案）
    lines.append("-- 若需重跑：确保 invitations 表已存在且 name 为主键；已存在的名字会被跳过，不会覆盖您后来填写的文案。")
    for name, text in data:
        n = sql_escape(name)
        if text is None:
            lines.append(f"INSERT INTO public.invitations (name, invitation_text) VALUES ('{n}', NULL) ON CONFLICT (name) DO NOTHING;")
        else:
            full = text + '<p class="sign">—— 陈山石 谨邀</p>'
            lines.append(f"INSERT INTO public.invitations (name, invitation_text) VALUES ('{n}', '{sql_escape(full)}') ON CONFLICT (name) DO NOTHING;")
    lines.append("")
    out = "\n".join(lines)
    with open("seed_invitations.sql", "w", encoding="utf-8") as f:
        f.write(out)
    print(f"已生成 seed_invitations.sql，共 {len(data)} 位受邀者。")

if __name__ == "__main__":
    main()
