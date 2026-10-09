/* =========================================================================
 *  主逻辑 app.js —— 首页报名 / 爱心选座 / 赛博赠礼 / 背景音乐
 * ========================================================================= */
(function () {
  const C = window.CONFIG;
  const S = window.Store;
  const $ = (s) => document.querySelector(s);

  const state = { name: localStorage.getItem("by_name") || null, view: "home" };
  let mySeatId = null;   // 当前用户已占的座位号（用于挪位判断）
  let mySeat = null;     // 当前用户已占的座位对象
  let recordedVoiceBlob = null;  // 录音得到的音频 Blob（落席/编辑时上传）

  /* ---------------- 主题 ---------------- */
  function initTheme() {
    Object.entries(C.THEME).forEach(([k, v]) => document.documentElement.style.setProperty("--" + k, v));
  }
  function applyThemeVars(str) {
    if (!str) return;
    str.split(";").forEach((pair) => {
      const [a, b] = pair.split(":");
      if (a && b) document.documentElement.style.setProperty(a.trim(), b.trim());
    });
  }

  /* ---------------- 通用 ---------------- */
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
  function showConfirm(text, onYes, title) {
    const box = $("#confirm-modal");
    $("#confirm-title").textContent = title || "确认";
    $("#confirm-text").textContent = text;
    box.classList.add("open");
    $("#confirm-yes").onclick = () => { box.classList.remove("open"); if (onYes) onYes(); };
    $("#confirm-no").onclick = () => { box.classList.remove("open"); };
    box.onclick = (e) => { if (e.target === box) box.classList.remove("open"); };
  }
  function showView(v) {
    state.view = v;
    ["home", "seats", "gifts"].forEach((x) => $("#view-" + x).style.display = (x === v ? "block" : "none"));
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
    if (v === "seats") renderSeats();
    if (v === "gifts") renderGifts();
  }

  /* ---------------- 首页：报名 ---------------- */
  async function renderHome() {
    const box = $("#home-card");
    if (!state.name) { box.innerHTML = homePromptHTML(); bindHome(); return; }
    const status = await S.getMyStatus(state.name);
    if (status === "accepted") {
      box.innerHTML = `<p class="welcome">「${esc(state.name)}」已入席 ✦</p>
        <p class="hint">去「选座」挑一个心尖上的位置吧！</p>
        <button class="link-btn" id="btn-switch">重新输入</button>`;
      $("#btn-switch").onclick = () => switchName();
    } else if (status === "rejected") {
      box.innerHTML = `<p class="welcome">「${esc(state.name)}」你的胆子真是肥嘟嘟的！</p>
        <p class="hint">迅速改变主意！</p>
        <div class="inv-actions">
          <button class="btn-accept" id="btn-acc">改主意，欣然赴约</button>
        </div>
        <button class="link-btn" id="btn-switch">重新输入</button>`;
      $("#btn-acc").onclick = async () => {
        await S.respond(state.name, "accepted");
        toast("快去选座吧~");
        renderHome();
      };
      $("#btn-switch").onclick = () => switchName();
    } else { box.innerHTML = homePromptHTML(); bindHome(); }
  }
  function homePromptHTML() {
    return `<p class="welcome">请输入你的名字获取邀请函<br/>（请不要偷看别人的邀请函！！</p>
      <div class="name-row">
        <input id="name-input" class="name-input" placeholder="请输入……" maxlength="20" autocomplete="off"/>
        <button id="name-go" class="btn-go">入</button>
      </div>
      <div id="inv-result"></div>`;
  }
  function bindHome() {
    const go = () => doEnter();
    const btn = $("#name-go");
    btn.onclick = go;
    // 移动端：输入完名字点「入」时，系统会优先把触摸当成「收起软键盘」而吞掉 click，
    // 故在 touchstart 阶段就触发提交，并 preventDefault 阻止合成 click 重复触发。
    btn.ontouchstart = (e) => { e.preventDefault(); go(); };
    $("#name-input").onkeydown = (e) => { if (e.key === "Enter") go(); };
  }
  function switchName() {
    state.name = null;
    localStorage.removeItem("by_name");
    renderHome();
  }
  async function doEnter() {
    const name = $("#name-input").value.trim();
    if (!name) { toast("请先输入你的名字"); return; }
    const inv = await S.getInvitation(name);
    const res = $("#inv-result");
    if (!inv) {
      res.innerHTML = `<div class="not-invited">「${esc(name)}」—— 你没有被邀请！</div>
        <p class="hint">你打错字了吧小乐乐？不可能是我打错字了吧！</p>`;
      return;
    }
    applyThemeVars(inv.theme);
    const invText = (inv.invitation_text && inv.invitation_text.trim())
      ? inv.invitation_text : fallbackInvitation(name);
    res.innerHTML = `<div class="invitation">${renderInvText(invText)}${signSuffix(invText)}</div>
      <div class="inv-actions">
        <button class="btn-accept" id="btn-acc">欣然赴约</button>
        <button class="btn-reject" id="btn-rej">我就不来</button>
      </div>`;
    $("#btn-acc").onclick = async () => {
      await S.respond(name, "accepted");
      state.name = name; localStorage.setItem("by_name", name);
      toast("快去选座吧~");
      renderHome();
    };
    $("#btn-rej").onclick = async () => {
      await S.respond(name, "rejected");
      state.name = name; localStorage.setItem("by_name", name);
      toast("好大的胆子敢拒绝！！！");
      renderHome();
    };
  }

  /* ---------------- 选座：方块堆成爱心 ---------------- */
  function heartSeats() {
    // 心形不等式 (x^2+y^2-1)^3 - x^2*y^3 <= 0；网格填充，每个方块即一个座位，数量 80~100
    const X0 = -1.5, X1 = 1.5, Y0 = -1.5, Y1 = 1.35;
    const span = Math.max(X1 - X0, Y1 - Y0);
    let n = 11, cells = [], unit = 0;
    while (n <= 42) {
      cells = []; unit = span / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = X0 + (i + 0.5) * unit, y = Y0 + (j + 0.5) * unit;
        const v = Math.pow(x * x + y * y - 1, 3) - x * x * Math.pow(y, 3);
        if (v <= 0) cells.push([x, y]);
      }
      if (cells.length >= 80) break;
      n++;
    }
    if (cells.length > 100) { // 座位表最多 100 席，超出则等距抽稀
      const step = cells.length / 100, out = [];
      for (let i = 0; i < 100; i++) out.push(cells[Math.floor(i * step)]);
      cells = out;
    }
    return { cells, unit, span, x0: X0, y0: Y0, y1: Y1 };
  }
  async function renderSeats() {
    const wrap = $("#seat-canvas"); const tip = $("#seat-tip");
    if (!state.name) { tip.innerHTML = `<p class="hint">请先到「首页」报名入席，方可选座。</p>`; wrap.innerHTML = ""; return; }
    const status = await S.getMyStatus(state.name);
    if (status !== "accepted") { tip.innerHTML = `<p class="hint">你尚未接受邀约，请先到「首页」欣然赴约。</p>`; wrap.innerHTML = ""; return; }

    const seats = (await S.getSeats()).slice().sort((a, b) => a.seat_id - b.seat_id);
    const me = seats.find(s => s.occupied_by === state.name);
    mySeatId = me ? me.seat_id : null; mySeat = me;
    tip.innerHTML = me
      ? `<p class="hint">你已落座第 <b>${me.seat_id}</b> 席${me.photo_url ? "（含照片）" : ""}。点其它空座即可换座。</p>`
      : `<p class="hint">轻点空座，入席心形之中。</p>`;

    const m = heartSeats();
    const W = 340, H = 340, pad = 14;
    const scale = (W - 2 * pad) / m.span;
    const sq = m.unit * scale * 0.82;
    const offX = (W - m.span * scale) / 2, offY = (H - m.span * scale) / 2;
    const toX = (x) => offX + (x - m.x0) * scale;
    const toY = (y) => offY + (m.y1 - y) * scale;

    let svg = `<svg viewBox="0 0 ${W} ${H}" class="heart-svg" xmlns="http://www.w3.org/2000/svg">`;
    const K = Math.min(m.cells.length, seats.length);
    for (let i = 0; i < K; i++) {
      const s = seats[i]; const [x, y] = m.cells[i];
      const px = toX(x) - sq / 2, py = toY(y) - sq / 2;
      const occ = !!s.occupied_by;
      const fill = occ ? "var(--red)" : "#4e9d5b";
      const stroke = occ ? "rgba(255,255,255,0.55)" : "rgba(78,157,91,0.7)";
      const label = occ ? esc((s.occupied_by || "客")[0]) : "";
      svg += `<g class="seat" data-idx="${i}">
        <rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${sq.toFixed(1)}" height="${sq.toFixed(1)}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
        <text x="${toX(x).toFixed(1)}" y="${(toY(y) + 4).toFixed(1)}" text-anchor="middle" class="seat-txt" fill="${occ ? "#fff" : "transparent"}">${label}</text>
      </g>`;
    }
    svg += `</svg>`;
    wrap.innerHTML = svg;

    wrap.querySelectorAll(".seat").forEach((g) => {
      const idx = +g.dataset.idx; const s = seats[idx];
      g.onclick = () => {
        if (s.occupied_by === state.name) viewSeat(s, true);     // 点自己座：查看 + 可编辑
        else if (s.occupied_by) viewSeat(s, false);              // 点别人座：查看
        else if (mySeatId != null) showConfirm(`确定从「第 ${mySeatId} 席」换到「第 ${s.seat_id} 席」吗？`, () => moveSeat(s.seat_id), "换座确认");   // 已落座点空座：二次确认后换座
        else openSeatModal(s.seat_id);                           // 未落座点空座：落席（填内容）
      };
    });

    $("#seat-roster").innerHTML = "";   // 不再展示「已落席 X/80 · 空席 Y」名录
  }

  // 点击已占用座位：查看其祝福与照片；canEdit=true 时本人可编辑自己座
  async function viewSeat(s, canEdit) {
    const isMine = state.name === s.occupied_by;
    const canSeePhoto = s.photo_visibility !== "private" || isMine;
    let photo = "";
    if (s.photo_url && canSeePhoto) photo = `<img class="view-photo" src="${esc(s.photo_url)}" alt="照片"/>`;
    else if (s.photo_url) photo = `<div class="view-private">该照片设为私密，仅上传者与主人可见。</div>`;
    const msg = (s.message && s.message.trim())
      ? `<div class="view-msg">${renderInvText(s.message)}</div>`
      : `<div class="view-msg muted">（未题字）</div>`;
    const voice = s.voice_url
      ? `<audio class="view-voice" controls preload="none" src="${esc(s.voice_url)}"></audio>`
      : "";
    const editBtn = (canEdit && isMine) ? `<button class="view-edit" id="view-edit">编辑此座</button>` : "";
    $("#view-body").innerHTML = `<h3>第 ${s.seat_id} 席 · ${esc(s.occupied_by)}</h3>${photo}${msg}${voice}${editBtn}`;
    $("#seat-view-modal").classList.add("open");
    const eb = $("#view-edit");
    if (eb) eb.onclick = () => { closeViewModal(); openSeatModal(s.seat_id, true); };
  }
  function closeViewModal() { $("#seat-view-modal").classList.remove("open"); }

  function openSeatModal(seatId, editSelf) {
    const editing = !!editSelf;                 // 编辑自己座：原地改内容，不换座
    const cur = (editing && mySeat) ? mySeat : null;
    $("#modal-action").textContent = editing ? "编辑" : "落席";
    $("#modal-seat-id").textContent = seatId;
    $("#seat-file").value = "";
    $("#seat-preview").style.display = "none";
    $("#seat-clear-wrap").style.display = editing ? "block" : "none";
    $("#seat-clear").checked = false;
    $("#seat-move-note").style.display = "none";
    // 语音区复位
    recordedVoiceBlob = null;
    $("#voice-file").value = "";
    $("#voice-preview").style.display = "none";
    $("#voice-preview").removeAttribute("src");
    $("#rec-status").textContent = "";
    $("#voice-clear-wrap").style.display = "none";
    $("#voice-clear").checked = false;
    if (cur) {
      $("#seat-msg").value = cur.message || "";
      const pub = cur.photo_visibility !== "private";
      $("#vis-public").checked = pub;
      $("#vis-private").checked = !pub;
      if (cur.photo_url && pub) { $("#seat-preview").src = cur.photo_url; $("#seat-preview").style.display = "block"; }
      if (cur.voice_url) { $("#voice-preview").src = cur.voice_url; $("#voice-preview").style.display = "block"; $("#voice-clear-wrap").style.display = "block"; }
    } else {
      $("#seat-msg").value = "";
      $("#vis-public").checked = true; $("#vis-private").checked = false;
    }
    $("#seat-modal").classList.add("open");
    $("#seat-submit").textContent = editing ? "保 存" : "落 席";
    $("#seat-submit").disabled = false;
  }
  function closeSeatModal() { $("#seat-modal").classList.remove("open"); }

  async function submitSeat() {
    const seatId = +$("#modal-seat-id").textContent;
    const file = $("#seat-file").files[0];
    const voiceFile = $("#voice-file").files[0];
    const msg = $("#seat-msg").value.trim();
    const vis = $("#vis-private").checked ? "private" : "public";
    const editing = (mySeatId != null && seatId === mySeatId);   // 编辑自己座：原地更新
    $("#seat-submit").disabled = true;
    try {
      let url = null;
      if (file) {
        if (file.size > 8 * 1024 * 1024) { toast("图片请小于 8MB"); $("#seat-submit").disabled = false; return; }
        url = await S.uploadPhoto(file);
      } else if (mySeat && mySeat.photo_url && !$("#seat-clear").checked) {
        url = mySeat.photo_url;   // 未换文件：保留原照片
      }
      // 语音：录音优先 > 上传文件 > 编辑时保留原语音（未勾清除）
      let voiceUrl = null;
      if (recordedVoiceBlob) {
        if (recordedVoiceBlob.size > 5 * 1024 * 1024) { toast("语音请小于 5MB"); $("#seat-submit").disabled = false; return; }
        voiceUrl = await S.uploadVoice(new File([recordedVoiceBlob], "rec.webm", { type: recordedVoiceBlob.type || "audio/webm" }));
      } else if (voiceFile) {
        if (voiceFile.size > 5 * 1024 * 1024) { toast("语音请小于 5MB"); $("#seat-submit").disabled = false; return; }
        voiceUrl = await S.uploadVoice(voiceFile);
      } else if (editing && mySeat && mySeat.voice_url && !$("#voice-clear").checked) {
        voiceUrl = mySeat.voice_url;
      } else if (editing) {
        voiceUrl = null;   // 编辑且勾选了清除原语音
      }
      if (editing) {
        await S.updateSeat({ seat_id: seatId, photo_url: url, message: msg, photo_visibility: vis, voice_url: voiceUrl });
      } else {
        await S.occupySeat({ seat_id: seatId, name: state.name, photo_url: url, message: msg, photo_visibility: vis, voice_url: voiceUrl });
      }
      closeSeatModal();
      toast(editing ? "已更新你的席位 ✦" : "落席成功 ✦ 心形之中，添了你一笔");
      renderSeats();
    } catch (e) {
      toast(e.message || "操作失败，请重试");
      $("#seat-submit").disabled = false;
    }
  }

  // 换座：已落座用户点另一个空座 → 静默把旧座（照片+祝福+可见性）整体搬到新座，旧座清空，不弹任何框
  async function moveSeat(newSeatId) {
    const old = mySeat;
    try {
      await S.releaseSeat(state.name);   // 先腾空旧座（保证一人一座）
      await S.occupySeat({
        seat_id: newSeatId, name: state.name,
        photo_url: old ? old.photo_url : null,
        message: old ? (old.message || "") : "",
        photo_visibility: old ? (old.photo_visibility || "public") : "public",
        voice_url: old ? (old.voice_url || null) : null
      });
      toast(`已换到第 ${newSeatId} 席 ✦`);
      renderSeats();
    } catch (e) {
      toast(e.message || "换座失败，请重试");
      renderSeats();
    }
  }

  /* ---------------- 赠礼（花朵） ---------------- */
  async function renderGifts() {
    const grid = $("#gift-grid");
    grid.innerHTML = C.GIFTS.map(g =>
      `<button class="gift-btn" data-key="${g.key}"><img class="gift-img" src="${g.img}" alt="${g.name}"/><span>${g.name}</span></button>`).join("");
    grid.querySelectorAll(".gift-btn").forEach((b) => {
      b.onclick = async () => {
        if (!state.name) { toast("请先到首页报名，留个名再送礼~"); showView("home"); return; }
        await S.addGift({ from_name: state.name, gift_type: b.dataset.key, qty: 1 });
        toast(`${b.querySelector("span").textContent} 已送出 ✦`);
        renderGiftWall();
      };
    });
    renderGiftWall();
  }
  // 贡献榜：按赠礼总数量排序，先标排名再标名字（#1 样式）
  async function renderGiftWall() {
    const gifts = await S.getGifts();
    const byName = {};
    gifts.forEach((g) => {
      const meta = C.GIFTS.find(x => x.key === g.gift_type) || { img: "", name: g.gift_type };
      if (!byName[g.from_name]) byName[g.from_name] = { total: 0, items: {} };
      const entry = byName[g.from_name];
      entry.items[g.gift_type] = entry.items[g.gift_type] || { img: meta.img, name: meta.name, n: 0 };
      entry.items[g.gift_type].n += (g.qty || 1);
      entry.total += (g.qty || 1);
    });
    const ranked = Object.entries(byName).sort((a, b) => b[1].total - a[1].total);
    $("#gift-wall").innerHTML = ranked.length
      ? ranked.map(([nm, info], i) => `<div class="wall-card">
          <div class="wall-head"><span class="wall-rank">#${i + 1}</span><span class="wall-name">${esc(nm)}</span></div>
          <div class="wall-items">` +
          Object.values(info.items).map((it) => {
            const img = it.img ? `<img class="wall-flower" src="${it.img}" alt="${it.name}"/>` : "";
            return `<span class="wall-item">${img}${esc(it.name)}×${it.n}</span>`;
          }).join("") + `</div></div>`).join("")
      : `<p class="hint">贡献榜还空着，快来投第一束花～</p>`;
  }

  /* ---------------- 背景音乐 ---------------- */
  function setupBGM() {
    const audio = $("#bgm"); const btn = $("#bgm-toggle");
    audio.loop = true; audio.preload = "auto"; audio.volume = 0.7; audio.src = C.BGM_FILE;
    let on = false;   // 默认静音（不自动播放）
    btn.onclick = () => {
      if (!on) { audio.play().then(() => { on = true; btn.textContent = "♪ 乐"; btn.classList.add("on"); })
        .catch(() => toast("音乐文件未就绪，部署后会响")); }
      else { audio.pause(); on = false; btn.textContent = "♪ 默"; btn.classList.remove("on"); }
    };
  }

  /* ---------------- 工具 ---------------- */
  function signSuffix(src) {
    const hasSign = (src || "").includes("陈山石 谨邀");
    const hasWait = (src || "").includes("燥候你的到来");
    let s = "";
    if (!hasSign) s += `<p class="sign">—— 陈山石 谨邀</p>`;
    if (!hasWait) s += `<p class="sign-sub">10.11，燥候你的到来！</p>`;
    return s;
  }

  function fallbackInvitation(name) {
    return `<h2 class="inv-title">致 ${esc(name)}</h2>
      <p>吾友如晤：</p>
      <p>十月十一，乃吾降辰。设小宴于屏上，邀君共聚。座中有席，待君落坐；案上有礼，待君相赠。</p>
      <p>君之专属邀函，主人正亲笔撰写，稍候即至。此际先奉一纸素笺，权作见面之礼。</p>`;
  }
  function renderInvText(t) {
    if (/<[a-z][\s\S]*>/i.test(t || "")) return t;          // 含 HTML 标签则原样渲染
    return String(t || "").split(/\n+/).map(p => p.trim() ? `<p>${esc(p)}</p>` : "").join("");
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* ---------------- 启动 ---------------- */
  async function start() {
    initTheme(); setupBGM();
    if (/micromessenger/i.test(navigator.userAgent)) {
      document.body.classList.add("wx");
      const wx = $("#wx-tip");
      if (wx) { wx.style.display = "block"; setTimeout(() => { wx.style.opacity = "0"; }, 6000); setTimeout(() => { wx.style.display = "none"; document.body.classList.remove("wx"); }, 7000); }
    }
    document.querySelectorAll(".nav-btn").forEach((b) => b.onclick = () => showView(b.dataset.view));
    $("#seat-close").onclick = closeSeatModal;
    $("#view-close").onclick = closeViewModal;
    $("#seat-view-modal").onclick = (e) => { if (e.target.id === "seat-view-modal") closeViewModal(); };
    $("#seat-submit").onclick = submitSeat;
    $("#seat-file").onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => { const i = $("#seat-preview"); i.src = r.result; i.style.display = "block"; };
      r.readAsDataURL(f);
    };
    setupVoiceRecorder();
    showView("home");
    await renderHome();
  }

  /* ---------------- 语音祝福录音 ---------------- */
  function setupVoiceRecorder() {
    let mediaRecorder = null, chunks = [], recStream = null;
    const recBtn = $("#rec-btn"), status = $("#rec-status"), vp = $("#voice-preview");
    async function startRec() {
      try {
        recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(recStream);
        chunks = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        mediaRecorder.onstop = () => {
          recordedVoiceBlob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
          vp.src = URL.createObjectURL(recordedVoiceBlob); vp.style.display = "block";
          status.textContent = "已录好，可重录或用文件替换";
          recStream.getTracks().forEach((t) => t.stop());
          recBtn.textContent = "● 录音"; recBtn.classList.remove("recording");
        };
        mediaRecorder.start();
        recBtn.textContent = "■ 停止"; recBtn.classList.add("recording");
        status.textContent = "录音中…说完点停止";
      } catch (e) {
        status.textContent = "无法录音，请改用「上传音频文件」";
      }
    }
    if (recBtn) recBtn.onclick = () => {
      if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
      else startRec();
    };
    const vf = $("#voice-file");
    if (vf) vf.onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      recordedVoiceBlob = null;   // 上传文件优先于录音
      vp.src = URL.createObjectURL(f); vp.style.display = "block";
      status.textContent = "";
    };
  }

  document.addEventListener("DOMContentLoaded", () => { S.init().then(start).catch((e) => console.error(e)); });
})();
