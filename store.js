/* =========================================================================
 *  数据层 Store —— 统一接口，演示(localStorage) / 真实(Supabase) 两套实现
 *  上层 app.js 只调这里的接口，不关心底层是 demo 还是 supabase。
 *  真实模式用原生 fetch 直连 Supabase REST/Storage，无需任何外部 CDN 依赖。
 * ========================================================================= */
window.Store = (function () {
  const C = window.CONFIG;
  const LS = { inv: "by_inv", guests: "by_guests", seats: "by_seats", gifts: "by_gifts" };
  const BASE = () => C.SUPABASE_URL.replace(/\/+$/, "");

  /* ---------------------- 演示数据（陛下上线前用，可随便玩） ---------------------- */
  const SEED_INV = [
    { name: "珂霖", invitation_text:
      "<h2 class=\"inv-title\">致 珂霖</h2>" +
      "<p>吾友如晤：</p>" +
      "<p>十月十一，乃吾降辰。不欲张灯结彩，惟设薄宴于云端，备清茶一盏、古琴一曲，待故人落坐。</p>" +
      "<p>君素喜墨色，座中有空席一方，留与君题字作画。愿君拨冗，共此良夜。</p>" +
      "<p class=\"sign\">—— 陈山石 谨邀</p>" },
    { name: "菡竹", invitation_text:
      "<h2 class=\"inv-title\">致 菡竹</h2>" +
      "<p>竹君如面：</p>" +
      "<p>风过庭前，便想起与君谈诗的光景。生辰将至，聊备小酌，不敢称宴，但求一叙。</p>" +
      "<p>席间有莲一盏、清酒一壶，皆君所爱。盼来，莫负此约。</p>" +
      "<p class=\"sign\">—— 陈山石 谨邀</p>" },
    { name: "小满", invitation_text:
      "<h2 class=\"inv-title\">致 小满</h2>" +
      "<p>小满吾友：</p>" +
      "<p>名字讨喜，人亦讨喜。生辰这一日，想把最好的位置留给最闹腾的你——坐下了不许安静。</p>" +
      "<p>蛋糕管够，笑谈随意。来否？速答。</p>" +
      "<p class=\"sign\">—— 陈山石 谨邀</p>" },
    { name: "阿杰", invitation_text:
      "<h2 class=\"inv-title\">致 阿杰</h2>" +
      "<p>阿杰兄：</p>" +
      "<p>江湖路远，幸得君伴。值此生辰，不设关节，只摆棋盘一局、浊酒两樽，与君手谈至夜深。</p>" +
      "<p>座次已留，落子无悔。</p>" +
      "<p class=\"sign\">—— 陈山石 谨邀</p>" },
    { name: "青禾", invitation_text:
      "<h2 class=\"inv-title\">致 青禾</h2>" +
      "<p>青禾如晤：</p>" +
      "<p>春种一粒，秋收万颗。感念一年相伴，生辰之日，愿与君共坐暖席，听风铃数声。</p>" +
      "<p>君若来，满座生辉。</p>" +
      "<p class=\"sign\">—— 陈山石 谨邀</p>" }
  ];

  function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function lsSet(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  function initDemo() {
    if (!localStorage.getItem(LS.seats)) {
      const seats = [];
      for (let i = 1; i <= C.SEAT_COUNT; i++)
        seats.push({ seat_id: i, occupied_by: null, photo_url: null, message: null, photo_visibility: "public", created_at: null });
      lsSet(LS.seats, seats);
    }
    // 邀函名单不再缓存到 localStorage，每次刷新直接读 invitations.js / SEED_INV，改名单后刷新即生效
    if (!localStorage.getItem(LS.guests)) lsSet(LS.guests, []);
    if (!localStorage.getItem(LS.gifts)) lsSet(LS.gifts, []);
  }

  /* ---------------------- Supabase REST 辅助（原生 fetch，零依赖） ---------------------- */
  async function rest(path, opts) {
    opts = opts || {};
    const headers = {
      "apikey": C.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + C.SUPABASE_ANON_KEY
    };
    if (opts.json) headers["Content-Type"] = "application/json";
    Object.assign(headers, opts.headers || {});
    const res = await fetch(BASE() + "/rest/v1" + path, {
      method: opts.method || "GET",
      headers,
      body: opts.body
    });
    if (!res.ok) {
      let msg = "请求失败(" + res.status + ")";
      try { const e = await res.json(); if (e && e.message) msg = e.message; } catch (e) {}
      throw new Error(msg);
    }
    const txt = await res.text();
    return txt ? JSON.parse(txt) : [];
  }

  async function uploadStorage(bucket, path, file) {
    const res = await fetch(BASE() + "/storage/v1/object/" + bucket + "/" + path, {
      method: "POST",
      headers: {
        "apikey": C.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + C.SUPABASE_ANON_KEY,
        "x-upsert": "true",
        "Content-Type": file.type || "application/octet-stream"
      },
      body: file
    });
    if (!res.ok) throw new Error("上传失败(" + res.status + ")");
    return BASE() + "/storage/v1/object/public/" + bucket + "/" + path;
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  /* ---------------------- 初始化 ---------------------- */
  async function init() {
    if (C.DEMO) { initDemo(); return; }
    if (C.SUPABASE_URL.startsWith("https://YOUR") || C.SUPABASE_ANON_KEY.startsWith("YOUR")) {
      alert("请先在 config.js 填好 SUPABASE_URL 与 SUPABASE_ANON_KEY，或将 DEMO 设为 true 预览。");
      throw new Error("Supabase not configured");
    }
  }

  /* ---------------------- 邀请函 / 报名 ---------------------- */
  // DEMO 模式优先用 invitations.js（由 xlsx 生成），否则回退内置示例
  function demoInv() {
    return (Array.isArray(window.INVITATIONS) && window.INVITATIONS.length) ? window.INVITATIONS : SEED_INV;
  }
  async function getInvitation(name) {
    // 优先读随站点部署的 invitations.js（由 xlsx 生成，改名单刷新即生效，无需灌库）。
    // 线上(DEMO:false)同样先读它，Supabase invitations 表仅作为兜底补充。
    const inv = demoInv();
    const hit = inv.find(x => x.name === name);
    if (hit) return hit;
    if (C.DEMO) return null;
    try {
      const rows = await rest(`/invitations?select=name,invitation_text,theme&name=eq.${encodeURIComponent(name)}`);
      if (rows[0]) return rows[0];
    } catch (e) { /* 忽略，交给下面的兜底 */ }
    return null;
  }

  async function respond(name, status) {
    if (C.DEMO) {
      const g = lsGet(LS.guests, []);
      let r = g.find(x => x.name === name);
      if (r) r.status = status; else g.push({ name, status, seat_id: null, updated_at: Date.now() });
      lsSet(LS.guests, g); return;
    }
    await rest("/guests", {
      method: "POST", json: true,
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ name, status, updated_at: new Date().toISOString() })
    });
  }

  async function getMyStatus(name) {
    if (C.DEMO) { const g = lsGet(LS.guests, []); const r = g.find(x => x.name === name); return r ? r.status : null; }
    const rows = await rest(`/guests?select=status&name=eq.${encodeURIComponent(name)}`);
    return rows[0] ? rows[0].status : null;
  }

  /* ---------------------- 座位 ---------------------- */
  async function getSeats() {
    if (C.DEMO) return lsGet(LS.seats, []);
    return await rest("/seats?select=*&order=seat_id.asc");
  }

  async function getMySeat(name) {
    const seats = await getSeats();
    return seats.find(s => s.occupied_by === name) || null;
  }

  // 上传照片：demo 返回压缩后的 base64；prod 传到 Supabase Storage 返回公开 URL
  async function uploadPhoto(file) {
    if (C.DEMO) return await compressImage(file, 900);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = "seat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return await uploadStorage("seat-photos", path, file);
  }

  async function uploadVoice(file) {
    if (C.DEMO) return await fileToDataURL(file);   // 本地模式：转 base64 存 localStorage
    const ext = (file.name.split(".").pop() || "webm").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = "voice_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return await uploadStorage("seat-voices", path, file);
  }

  async function occupySeat({ seat_id, name, photo_url, message, photo_visibility, voice_url }) {
    if (C.DEMO) {
      const seats = lsGet(LS.seats, []);
      const s = seats.find(x => x.seat_id === seat_id);
      if (!s || s.occupied_by) throw new Error("该座已被占，换一个吧~");
      const g = lsGet(LS.guests, []);
      if (g.find(x => x.name === name && x.seat_id)) throw new Error("你已经在座了，一座只容一人。");
      s.occupied_by = name; s.photo_url = photo_url; s.message = message;
      s.photo_visibility = photo_visibility; s.voice_url = voice_url || null; s.created_at = Date.now();
      seats[seats.indexOf(s)] = s; lsSet(LS.seats, seats);
      const gg = lsGet(LS.guests, []);
      let r = gg.find(x => x.name === name);
      if (!r) { r = { name, status: "accepted", seat_id: null }; gg.push(r); }
      r.seat_id = seat_id; lsSet(LS.guests, gg);
      return s;
    }
    // prod：原子占用（occupied_by 为 null 才成功，保证一座一人）
    const rows = await rest(`/seats?seat_id=eq.${seat_id}&occupied_by=is.null`, {
      method: "PATCH", json: true,
      headers: { "Prefer": "return=representation" },
      body: JSON.stringify({ occupied_by: name, photo_url, message, photo_visibility, voice_url: voice_url || null, created_at: new Date().toISOString() })
    });
    if (!rows || !rows.length) throw new Error("该座已被占，换一个吧~");
    await rest("/guests", {
      method: "POST", json: true,
      headers: { "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ name, status: "accepted", seat_id, updated_at: new Date().toISOString() })
    });
    return rows[0];
  }

  // 腾空某人当前所坐的座位（换座时先调，保证一人一座）
  async function releaseSeat(name) {
    if (C.DEMO) {
      const seats = lsGet(LS.seats, []);
      const s = seats.find(x => x.occupied_by === name);
      if (s) {
        s.occupied_by = null; s.photo_url = null; s.message = null;
        s.photo_visibility = "public"; s.created_at = null;
        lsSet(LS.seats, seats);
      }
      const gg = lsGet(LS.guests, []);
      const r = gg.find(x => x.name === name);
      if (r) { r.seat_id = null; lsSet(LS.guests, gg); }
      return;
    }
    await rest(`/seats?occupied_by=eq.${encodeURIComponent(name)}`, {
      method: "PATCH", json: true,
      body: JSON.stringify({ occupied_by: null, photo_url: null, message: null, photo_visibility: "public", voice_url: null, created_at: null })
    });
  }

  // 原地更新某座内容（编辑自己的座，不换座、不释放），照片/祝福/可见性都改
  async function updateSeat({ seat_id, photo_url, message, photo_visibility, voice_url }) {
    if (C.DEMO) {
      const seats = lsGet(LS.seats, []);
      const s = seats.find(x => x.seat_id === seat_id);
      if (!s) throw new Error("座位不存在");
      s.photo_url = photo_url; s.message = message; s.photo_visibility = photo_visibility;
      s.voice_url = (voice_url === undefined) ? s.voice_url : (voice_url || null);
      lsSet(LS.seats, seats); return s;
    }
    const rows = await rest(`/seats?seat_id=eq.${seat_id}`, {
      method: "PATCH", json: true,
      headers: { "Prefer": "return=representation" },
      body: JSON.stringify({ photo_url, message, photo_visibility, voice_url: (voice_url === undefined ? null : voice_url) })
    });
    if (!rows || !rows.length) throw new Error("更新失败，请重试");
    return rows[0];
  }

  /* ---------------------- 赠礼 ---------------------- */
  async function addGift({ from_name, gift_type, qty }) {
    if (C.DEMO) {
      const g = lsGet(LS.gifts, []);
      const t = new Date().toISOString();
      for (let i = 0; i < qty; i++) g.push({ id: Date.now() + "_" + i, from_name, gift_type, qty: 1, created_at: t });
      lsSet(LS.gifts, g); return;
    }
    const rows = [];
    const t = new Date().toISOString();
    for (let i = 0; i < qty; i++) rows.push({ from_name, gift_type, qty: 1, created_at: t });
    await rest("/gifts", { method: "POST", json: true, body: JSON.stringify(rows) });
  }

  async function getGifts() {
    if (C.DEMO) return lsGet(LS.gifts, []);
    return await rest("/gifts?select=*&order=created_at.asc");
  }

  /* ---------------------- 陛下后台汇总 ---------------------- */
  async function adminSummary() {
    if (C.DEMO) {
      return { guests: lsGet(LS.guests, []), seats: lsGet(LS.seats, []), gifts: lsGet(LS.gifts, []) };
    }
    const [gg, ss, gi] = await Promise.all([
      rest("/guests?select=*"),
      rest("/seats?select=*&order=seat_id.asc"),
      rest("/gifts?select=*&order=created_at.asc")
    ]);
    return { guests: gg, seats: ss, gifts: gi };
  }

  /* ---------------------- 全量受邀名单（后台算"未入座"用） ---------------------- */
  async function getInvitationsAll() {
    if (C.DEMO) return demoInv();
    // 线上优先读随站点部署的 invitations.js（改名单刷新即生效），兜底 Supabase invitations 表
    if (Array.isArray(window.INVITATIONS) && window.INVITATIONS.length) return window.INVITATIONS;
    try {
      const rows = await rest("/invitations?select=name&order=name.asc");
      return rows.map(r => ({ name: r.name }));
    } catch (e) { return []; }
  }

  /* ---------------------- 图片压缩（demo 用，避免 localStorage 爆满） ---------------------- */
  function compressImage(file, maxDim) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) { height = height * maxDim / width; width = maxDim; }
          else if (height > maxDim) { width = width * maxDim / height; height = maxDim; }
          const cv = document.createElement("canvas");
          cv.width = width; cv.height = height;
          cv.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(cv.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return { init, getInvitation, getInvitationsAll, respond, getMyStatus, getSeats, getMySeat, uploadPhoto, uploadVoice, occupySeat, releaseSeat, updateSeat, addGift, getGifts, adminSummary };
})();
