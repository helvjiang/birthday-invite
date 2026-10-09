# -*- coding: utf-8 -*-
"""
把「邀请函-名单.xlsx」转成前端能直接读取的 invitations.js。
- 已写邀函的人：保留您的原文，统一包成古风卡片（标题+正文+落款）。
- 空着的人：生成默认通用邀函（含名字），保证都能进、不空白。
- 改完 xlsx 后重跑本脚本，再刷新页面即可看到更新。

用法：python build_invitations.py
"""
import openpyxl, json, html, os

HERE = os.path.dirname(os.path.abspath(__file__))
XLSX = os.path.join(HERE, "邀请函-名单.xlsx")
OUT = os.path.join(HERE, "invitations.js")

DEFAULT_TMPL = (
    '<h2 class="inv-title">致 {name}</h2>\n'
    '<p>吾友如晤：</p>\n'
    '<p>十月十一，乃吾降辰。不设繁文，惟备清茶一盏、古琴一曲，待故人落坐。</p>\n'
    '<p>诚邀「{name}」拨冗线上赴宴，盼君前来，共此良夜。</p>\n'
)

def make_text(name, raw):
    if raw:
        return ('<h2 class="inv-title">致 ' + html.escape(name) + '</h2>\n'
                + '<p>' + html.escape(raw) + '</p>\n')
    return DEFAULT_TMPL.format(name=html.escape(name))

def main():
    wb = openpyxl.load_workbook(XLSX)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    data, seen = [], set()
    for r in rows[1:]:  # 跳过表头
        name = (str(r[0]).strip() if r[0] is not None else "")
        raw = (str(r[1]).strip() if len(r) > 1 and r[1] is not None else "")
        if not name or name in seen:
            continue
        seen.add(name)
        data.append({"name": name, "invitation_text": make_text(name, raw), "theme": ""})
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// 由 build_invitations.py 从「邀请函-名单.xlsx」自动生成，请勿手改；改 xlsx 后重跑脚本。\n")
        f.write("window.INVITATIONS = ")
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    filled = sum(1 for r in rows[1:] if r[0] and r[1])
    print(f"共 {len(data)} 人，其中已写邀函约 {filled} 人；生成 -> {OUT}")

if __name__ == "__main__":
    main()
