#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把「邀请函-名单.xlsx」批量灌入 Supabase 的 invitations 表（支持 upsert）。
之后陛下在 Supabase 后台 Table Editor 直接写/改每个人的 invitation_text 即可，保存即生效。

用法：
  python import_invitations.py --url https://XXXX.supabase.co --key <service_role_key>

说明：
  --key 必须用 service_role 密钥（Supabase → Project Settings → API → service_role），
  因为 invitations 表只允许读取、不允许公开写入。service_role 会绕过 RLS，务必
  只在本地使用、切勿提交到 GitHub 或泄露给他人。
  --file 默认 ./邀请函-名单.xlsx
"""
import argparse, json, sys, urllib.request, urllib.error
import openpyxl

BATCH = 50

def parse(path):
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
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
        out.append({
            "name": str(name).strip(),
            "invitation_text": (str(text).strip()
                                if text is not None and str(text).strip() != "" else None)
        })
    return out

def upsert(url, key, payload):
    api = f"{url.rstrip('/')}/rest/v1/invitations"
    req = urllib.request.Request(api, data=json.dumps(payload).encode("utf-8"), method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("apikey", key)
    req.add_header("Authorization", "Bearer " + key)
    req.add_header("Prefer", "resolution=merge-duplicates")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "ignore")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True, help="Supabase 项目 URL")
    ap.add_argument("--key", required=True, help="service_role 密钥")
    ap.add_argument("--file", default="邀请函-名单.xlsx")
    args = ap.parse_args()

    data = parse(args.file)
    if not data:
        print("未解析到任何名单，退出。"); sys.exit(1)
    print(f"解析到 {len(data)} 位受邀者，开始导入（每批 {BATCH}）…")

    ok = 0; fail = 0
    for i in range(0, len(data), BATCH):
        batch = data[i:i + BATCH]
        status, body = upsert(args.url, args.key, batch)
        if 200 <= status < 300:
            ok += len(batch)
            print(f"  第 {i + 1}-{i + len(batch)} 批：成功")
        else:
            fail += len(batch)
            print(f"  第 {i + 1}-{i + len(batch)} 批：失败 HTTP {status} -> {body[:300]}")
    print(f"完成。成功 {ok}，失败 {fail}。")
    if fail:
        sys.exit(2)

if __name__ == "__main__":
    main()
