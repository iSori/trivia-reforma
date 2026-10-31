import { Q, CATS } from "./preguntas.js";
import { firebaseConfig } from "./firebase-config.js";

const ROUND = 10;
const DUR = 20000;          // tiempo por pregunta en el modo en grupo (ms)
const BOARD_MAX = 40;
const FB_VER = "10.12.2";   // versión del SDK de Firebase

const app = document.getElementById("app");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let best = {};
try { best = JSON.parse(localStorage.getItem("trivia-reforma-best") || "{}"); } catch (e) { best = {}; }
const saveBest = () => { try { localStorage.setItem("trivia-reforma-best", JSON.stringify(best)); } catch (e) {} };

let S = {screen:"home", cat:"all", lvl:"n", round:[], i:0, picked:null, answers:[]};

const LVLS = {n:"Normal", d:"Difícil", a:"Todas"};
const LVL_IN = {n:"en normal", d:"en difícil", a:"con todas las dificultades"};
const inLvl = (q, lvl = S.lvl) => lvl === "a" || q[1] === lvl;
const pool = (cat, lvl = S.lvl) => Q.filter(q => inLvl(q, lvl) && (cat === "all" || q[0] === cat));
const key = () => S.cat + ":" + S.lvl;

// ───────── Modo individual ─────────
function startRound() {
  S.round = shuffle(pool(S.cat)).slice(0, ROUND).map(q => ({cat:q[0], lvl:q[1], year:q[2], text:q[3], right:q[4], opts:shuffle([q[4], ...q[5]]), why:q[6]}));
  S.i = 0; S.picked = null; S.answers = []; S.screen = "quiz"; render();
}

function home() {
  const n = id => pool(id).length;
  return `
  <header style="display:flex;flex-direction:column;gap:10px">
    <div class="eyebrow"><span>Siglos XIV al XVII</span><span>${Q.length} preguntas</span></div>
    <h1>Trivia de la Reforma</h1>
    <p class="lede">Reformadores, precursores y las guerras y concilios que vinieron después. Elige la dificultad y una categoría, y responde diez preguntas.</p>
  </header>
  <div class="seg" role="group" aria-label="Dificultad">${Object.entries(LVLS).map(([k, v]) => `<button data-lvl="${k}" aria-pressed="${S.lvl === k}">${v}<small>${k === "a" ? Q.length : Q.filter(q => q[1] === k).length} preguntas</small></button>`).join("")}</div>
  <div class="cats" role="group" aria-label="Categoría">
    ${CATS.map(c => `<button class="cat" data-cat="${c.id}" aria-pressed="${S.cat === c.id}">
      <b>${c.name}</b><span class="yrs">${c.yrs}</span>
      <span class="sub">${c.sub} · ${n(c.id)} preguntas</span>
      ${best[c.id + ":" + S.lvl] != null ? `<span class="best">Mejor resultado ${LVL_IN[S.lvl]}: ${best[c.id + ":" + S.lvl]} / ${Math.min(ROUND, n(c.id))}</span>` : ""}
    </button>`).join("")}
  </div>
  <button class="btn" id="go">Empezar ronda</button>
  <section class="sheet mp">
    <h2>Jugar en grupo</h2>
    <p class="muted">Una persona crea la partida con la categoría y la dificultad elegidas arriba, y la muestra en una pantalla. Los demás se unen desde su móvil con el código. Puntúa más quien acierta antes.</p>
    ${MP.err ? `<p class="warn">${esc(MP.err)}</p>` : ""}
    <div class="row"><button class="btn" id="mp-host">Crear partida</button><button class="btn ghost" id="mp-join">Unirme con código</button></div>
  </section>
  <footer>Sola scriptura · Sola fide · Sola gratia · Solus Christus · Soli Deo gloria</footer>`;
}

function track() {
  return `<div class="track" aria-hidden="true">${S.round.map((_, k) => {
    const a = S.answers[k]; return `<i class="${a == null ? (k === S.i ? "now" : "") : (a ? "ok" : "bad")}"></i>`;
  }).join("")}</div>`;
}

function quiz() {
  const q = S.round[S.i], done = S.picked != null, cat = CATS.find(c => c.id === q.cat);
  const letters = "ABCD";
  return `
  <div class="eyebrow"><span>${cat.name} · ${LVLS[q.lvl]}</span><span>Pregunta ${S.i + 1} de ${S.round.length}</span></div>
  ${track()}
  <section class="sheet" aria-live="polite">
    <span class="anno">Anno ${esc(q.year)}</span>
    <h2>${esc(q.text)}</h2>
    <div class="opts">${q.opts.map((o, k) => {
      let cls = ""; if (done) { if (o === q.right) cls = "ok"; else if (o === S.picked) cls = "bad"; }
      return `<button class="opt ${cls}" data-k="${k}" ${done ? "disabled" : ""}><span class="k">${letters[k]}</span><span>${esc(o)}</span></button>`;
    }).join("")}</div>
    ${done ? `<p class="note ${S.picked === q.right ? "ok" : "bad"}"><strong>${S.picked === q.right ? "Correcto" : "Respuesta correcta: " + esc(q.right)}</strong>${esc(q.why)}</p>
    <button class="btn" id="next">${S.i + 1 < S.round.length ? "Siguiente pregunta" : "Ver resultado"}</button>` : ""}
  </section>`;
}

function result() {
  const ok = S.answers.filter(Boolean).length, total = S.round.length;
  const verdict = ok === total ? "Ronda perfecta. Digno de la Academia de Ginebra."
    : ok >= total * .7 ? "Muy bien. Conoces la época a fondo."
    : ok >= total * .4 ? "Buen comienzo. Repasa las explicaciones y vuelve a intentarlo."
    : "Toca volver a las fuentes. Cada ronda trae preguntas nuevas.";
  return `
  <div class="eyebrow"><span>${CATS.find(c => c.id === S.cat).name} · ${S.lvl === "a" ? "Todas las dificultades" : LVLS[S.lvl]}</span><span>Resultado</span></div>
  ${track()}
  <section class="sheet">
    <div class="score"><span class="big">${ok}</span><span>de ${total} correctas</span></div>
    <p style="margin:0">${verdict}</p>
    <div class="row"><button class="btn" id="again">Otra ronda</button><button class="btn ghost" id="menu">Cambiar categoría</button></div>
  </section>
  <section class="sheet">
    <h2>Repaso</h2>
    <ol class="review">${S.round.map((q, k) => `<li><span class="m ${S.answers[k] ? "ok" : "bad"}">${S.answers[k] ? "✓" : "✗"}</span><span>${esc(q.text)}<small>${esc(q.right)} · ${esc(q.year)}</small></span></li>`).join("")}</ol>
  </section>`;
}

// ───────── Firebase (se carga solo al usar el modo en grupo) ─────────
let FB = null;
const configured = () => !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.databaseURL);

async function fb() {
  if (FB) return FB;
  if (!configured()) throw {code:"noconfig"};
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
  const [A, U, D] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-database.js")]);
  const fbApp = A.initializeApp(firebaseConfig);
  const auth = U.getAuth(fbApp);
  const cred = await U.signInAnonymously(auth);
  const db = D.getDatabase(fbApp);
  let offset = 0;
  D.onValue(D.ref(db, ".info/serverTimeOffset"), s => { offset = s.val() || 0; });
  FB = {D, db, uid:cred.user.uid, now:() => Date.now() + offset};
  return FB;
}
const fbError = e => e && e.code === "noconfig"
  ? "El modo en grupo aún no está configurado: falta rellenar js/firebase-config.js (mira la guía)."
  : !navigator.onLine ? "El modo en grupo necesita conexión a internet."
  : "No se pudo conectar con el servidor de partidas. Inténtalo de nuevo.";

// ───────── Modo en grupo ─────────
let MP = {err:"", role:null, code:"", tick:null, off:[]};
let H = null, P = null;

const cleanName = v => String(v || "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "").trim().slice(0, 16);
function mpCode() { const A = "ABCDEFGHJKLMNPQRSTUVWXYZ"; let c = ""; for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)]; return c; }
const gameRef = (code, sub) => FB.D.ref(FB.db, "games/" + code + (sub ? "/" + sub : ""));

function mpStop() {
  clearInterval(MP.tick);
  MP.off.forEach(f => { try { f(); } catch (e) {} });
  MP = {err:MP.err, role:null, code:"", tick:null, off:[]};
}

function timerHTML(deadline) {
  const left = Math.max(0, deadline - FB.now());
  return `<div class="timer" id="mp-timer"><i style="width:${left / DUR * 100}%"></i><span>${Math.ceil(left / 1000)}</span></div>`;
}
function paintTimer(deadline) {
  const t = document.getElementById("mp-timer"); if (!t) return;
  const left = Math.max(0, deadline - FB.now());
  t.firstElementChild.style.width = (left / DUR * 100) + "%"; t.lastElementChild.textContent = Math.ceil(left / 1000);
}
function boardHTML(board, me, limit) {
  if (!board.length) return `<p class="muted">Todavía no hay puntuaciones.</p>`;
  return `<ol class="board">${board.slice(0, limit).map((b, i) => `<li class="${b[0] === me ? "me" : ""}"><span class="pos">${i + 1}</span><span>${esc(b[1])}${b[0] === me ? " (tú)" : ""}</span><span class="pts">${b[2]}${b[3] ? `<span class="d">+${b[3]}</span>` : ""}</span></li>`).join("")}</ol>`;
}
const toBoard = scores => Object.entries(scores || {}).map(([id, v]) => [id, v.n, v.s || 0, v.d || 0]).sort((a, b) => b[2] - a[2]).slice(0, BOARD_MAX);

// ── Anfitrión ──
async function hostStart() {
  MP.err = "";
  try { await fb(); } catch (e) { MP.err = fbError(e); render(); return; }
  mpStop();
  const {D} = FB;
  let code = null;
  for (let tries = 0; tries < 5 && !code; tries++) {
    const c = mpCode();
    const res = await D.runTransaction(gameRef(c), cur => cur === null ? {host:FB.uid, created:D.serverTimestamp(), state:{ph:"lobby", qi:-1}} : undefined).catch(() => null);
    if (res && res.committed) code = c;
  }
  if (!code) { MP.err = "No se pudo crear la partida. Inténtalo de nuevo."; render(); return; }
  D.onDisconnect(gameRef(code)).remove();
  MP.role = "host"; MP.code = code;
  const qs = shuffle(pool(S.cat)).slice(0, ROUND).map(q => { const o = shuffle([q[4], ...q[5]]); return {t:q[3], o, r:o.indexOf(q[4]), y:q[2], w:q[6], lv:q[1]}; });
  H = {qs, qi:-1, ph:"lobby", deadline:0, ans:{}, scores:{}, counts:[], players:{}, cat:S.cat, lvl:S.lvl};
  MP.off.push(D.onValue(gameRef(code, "players"), snap => {
    H.players = snap.val() || {};
    for (const [uid, p] of Object.entries(H.players)) {
      const name = cleanName(p.name) || "Jugador";
      if (!H.scores[uid]) H.scores[uid] = {n:name, s:0, d:0}; else H.scores[uid].n = name;
      const a = p.ans;
      if (H.ph === "q" && a && a.q === H.qi && Number.isInteger(a.c) && a.c >= 0 && a.c < 4 && !H.ans[uid] && a.at <= H.deadline + 500)
        H.ans[uid] = {c:a.c, at:a.at};
    }
    const ids = Object.keys(H.players);
    if (H.ph === "q" && ids.length && ids.every(id => H.ans[id])) hostReveal(); else render();
  }));
  MP.tick = setInterval(() => { if (H && H.ph === "q") { paintTimer(H.deadline); if (FB.now() >= H.deadline) hostReveal(); } }, 250);
  S.screen = "mp-host"; render(); scrollTo(0, 0);
}
function hostWrite() {
  const q = H.qs[H.qi];
  const st = {ph:H.ph, qi:H.qi, n:H.qs.length, cat:H.cat};
  if (q && (H.ph === "q" || H.ph === "rev")) st.q = {t:q.t, o:q.o, y:q.y, lv:q.lv};
  if (H.ph === "q") st.deadline = H.deadline;
  if (H.ph === "rev") { st.r = q.r; st.w = q.w; st.cnt = H.counts; }
  return FB.D.update(gameRef(MP.code), {state:st, scores:H.scores}).catch(() => {});
}
function hostNext() {
  if (H.qi + 1 >= H.qs.length) H.ph = "end";
  else { H.qi++; H.ph = "q"; H.ans = {}; H.deadline = FB.now() + DUR; Object.values(H.scores).forEach(v => v.d = 0); }
  hostWrite(); render(); scrollTo(0, 0);
}
function hostReveal() {
  if (H.ph !== "q") return;
  const q = H.qs[H.qi]; H.ph = "rev"; H.counts = [0, 0, 0, 0];
  Object.values(H.scores).forEach(v => v.d = 0);
  for (const [uid, a] of Object.entries(H.ans)) {
    H.counts[a.c]++;
    if (a.c === q.r && H.scores[uid]) {
      const pts = Math.round(500 + 500 * Math.min(1, Math.max(0, (H.deadline - a.at) / DUR)));
      H.scores[uid].s += pts; H.scores[uid].d = pts;
    }
  }
  hostWrite(); render();
}
async function hostEnd() {
  const code = MP.code;
  mpStop(); H = null;
  if (code && FB) { try { await FB.D.onDisconnect(gameRef(code)).cancel(); await FB.D.remove(gameRef(code)); } catch (e) {} }
}
function hostView() {
  const L = "ABCD", q = H.qs[H.qi], cat = CATS.find(c => c.id === H.cat);
  const names = Object.values(H.players).map(p => cleanName(p.name)).filter(Boolean);
  const nAns = Object.keys(H.players).filter(id => H.ans[id]).length;
  const head = `<div class="eyebrow"><span>Partida ${MP.code} · Anfitrión</span><span>${H.ph === "lobby" ? cat.name : H.ph === "end" ? "Final" : `Pregunta ${H.qi + 1} de ${H.qs.length}`}</span></div>`;
  const opts = cls => `<div class="opts">${q.o.map((o, k) => `<div class="opt ${cls(k)}"><span class="k">${L[k]}</span><span>${esc(o)}</span>${H.ph === "rev" ? `<span class="n">${H.counts[k]}</span>` : ""}</div>`).join("")}</div>`;
  if (H.ph === "lobby") return head + `
  <section class="sheet mp">
    <span class="eyebrow">Código de la partida</span>
    <div class="code">${MP.code}</div>
    <p class="muted">Abre este juego en cada móvil (${esc(location.host + location.pathname)}), pulsa «Unirme con código» y escribe el código. ${cat.name} · ${LVLS[H.lvl]} · ${H.qs.length} preguntas de ${DUR / 1000} segundos.</p>
    <h2>${names.length ? `${names.length} ${names.length === 1 ? "jugador" : "jugadores"}` : "Esperando jugadores…"}</h2>
    ${names.length ? `<ul class="chips">${names.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    <div class="row"><button class="btn" id="mp-start" ${names.length ? "" : "disabled"}>Empezar</button><button class="btn ghost" id="mp-quit">Cancelar</button></div>
  </section>`;
  if (H.ph === "q") return head + timerHTML(H.deadline) + `
  <section class="sheet">
    <span class="anno">Anno ${esc(q.y)}</span><h2>${esc(q.t)}</h2>
    ${opts(() => "")}
    <p class="muted">Han respondido ${nAns} de ${names.length}.</p>
    <button class="btn" id="mp-reveal">Mostrar respuesta</button>
  </section>`;
  if (H.ph === "rev") return head + `
  <section class="sheet">
    <span class="anno">Anno ${esc(q.y)}</span><h2>${esc(q.t)}</h2>
    ${opts(k => k === q.r ? "ok" : "")}
    <p class="note ok"><strong>Respuesta correcta: ${esc(q.o[q.r])}</strong>${esc(q.w)}</p>
  </section>
  <section class="sheet mp"><h2>Clasificación</h2>${boardHTML(toBoard(H.scores), null, 10)}
    <button class="btn" id="mp-next">${H.qi + 1 < H.qs.length ? "Siguiente pregunta" : "Ver clasificación final"}</button></section>`;
  const b = toBoard(H.scores);
  return head + `
  <section class="sheet mp">
    ${b.length ? `<span class="eyebrow">Gana</span><div class="code" style="font-size:2.4rem;letter-spacing:.04em">${esc(b[0][1])}</div><p class="muted">con ${b[0][2]} puntos</p>` : ""}
    ${boardHTML(b, null, BOARD_MAX)}
    <div class="row"><button class="btn" id="mp-quit">Terminar y volver al inicio</button></div>
  </section>`;
}

// ── Jugador ──
async function joinStart(code, name) {
  try { await fb(); } catch (e) { P.err = fbError(e); render(); return; }
  mpStop();
  const {D} = FB;
  const exists = await D.get(gameRef(code, "host")).then(s => s.exists()).catch(() => false);
  if (!exists) { P.err = "No hay ninguna partida abierta con ese código."; render(); return; }
  try {
    await D.set(gameRef(code, "players/" + FB.uid), {name});
    D.onDisconnect(gameRef(code, "players/" + FB.uid)).remove();
  } catch (e) { P.err = "No se pudo entrar en la partida. Inténtalo de nuevo."; render(); return; }
  MP.role = "player"; MP.code = code;
  Object.assign(P, {code, name, joined:true, st:null, scores:{}, my:null, myQ:-1, ended:false, err:""});
  MP.off.push(D.onValue(gameRef(code), snap => {
    const g = snap.val();
    if (!g) { P.ended = true; render(); return; }
    const prev = P.st, st = g.state || {ph:"lobby"};
    P.st = st; P.scores = g.scores || {}; P.count = Object.keys(g.players || {}).length;
    if (st.ph === "q" && st.qi !== P.myQ) { P.myQ = st.qi; P.my = null; }
    const changed = !prev || prev.ph !== st.ph || prev.qi !== st.qi;
    render(); if (changed) scrollTo(0, 0);
  }));
  MP.tick = setInterval(() => { if (P && P.st && P.st.ph === "q") paintTimer(P.st.deadline); }, 250);
  render();
}
async function playerLeave() {
  const code = MP.code;
  mpStop();
  if (code && FB) { try { await FB.D.onDisconnect(gameRef(code, "players/" + FB.uid)).cancel(); await FB.D.remove(gameRef(code, "players/" + FB.uid)); } catch (e) {} }
}
function playerView() {
  const L = "ABCD";
  const st = P.st, me = FB && FB.uid;
  const head = `<div class="eyebrow"><span>${P.joined ? `Partida ${P.code} · ${esc(P.name)}` : "Unirse a una partida"}</span><span>${st && st.ph !== "lobby" && st.ph !== "end" ? `Pregunta ${st.qi + 1} de ${st.n}` : ""}</span></div>`;
  if (!P.joined) return head + `
  <form class="sheet mp" id="mp-form">
    <label class="field" for="mp-code">Código de la partida<input id="mp-code" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(P.code)}" placeholder="ABCD"></label>
    <label class="field" for="mp-name">Tu nombre<input id="mp-name" maxlength="16" autocomplete="nickname" value="${esc(P.name)}" placeholder="Cómo te verán los demás"></label>
    ${P.err ? `<p class="warn">${esc(P.err)}</p>` : ""}
    <div class="row"><button class="btn" type="submit" ${P.busy ? "disabled" : ""}>Entrar</button><button class="btn ghost" type="button" id="mp-quit">Volver</button></div>
  </form>`;
  if (P.ended) return head + `
  <section class="sheet mp">
    <h2>La partida ha terminado</h2>
    <p class="muted">El anfitrión ha cerrado la partida.</p>
    <div class="row"><button class="btn" id="mp-quit">Volver al inicio</button></div>
  </section>`;
  if (!st || st.ph === "lobby") return head + `
  <section class="sheet mp">
    <h2>Estás dentro</h2>
    <p class="muted">La partida empezará cuando el anfitrión la inicie. ${P.count ? `Hay ${P.count} ${P.count === 1 ? "jugador" : "jugadores"}.` : ""}</p>
    <div class="row"><button class="btn ghost" id="mp-quit">Salir</button></div>
  </section>`;
  if (st.ph === "q") {
    const late = FB.now() > st.deadline;
    return head + timerHTML(st.deadline) + `
  <section class="sheet">
    <span class="anno">Anno ${esc(st.q.y)}</span><h2>${esc(st.q.t)}</h2>
    <div class="opts">${st.q.o.map((o, k) => `<button class="opt ${P.my === k ? "picked" : ""}" data-pick="${k}" ${P.my != null || late ? "disabled" : ""}><span class="k">${L[k]}</span><span>${esc(o)}</span></button>`).join("")}</div>
    ${P.my != null ? `<p class="muted">Respuesta enviada. Espera a que se acabe el tiempo.</p>` : late ? `<p class="muted">Se acabó el tiempo.</p>` : ""}
  </section>`;
  }
  const board = toBoard(P.scores), mine = board.findIndex(b => b[0] === me), entry = board[mine];
  if (st.ph === "rev") {
    const ok = P.my === st.r;
    return head + `
  <section class="sheet">
    <p class="note ${ok ? "ok" : "bad"}"><strong>${ok ? `Correcto${entry && entry[3] ? ` · +${entry[3]} puntos` : ""}` : P.my == null ? "Sin respuesta" : "Incorrecto"}</strong>${esc(st.q.t)}</p>
    <div class="opts">${st.q.o.map((o, k) => `<div class="opt ${k === st.r ? "ok" : k === P.my ? "bad" : ""}"><span class="k">${L[k]}</span><span>${esc(o)}</span><span class="n">${st.cnt ? st.cnt[k] : ""}</span></div>`).join("")}</div>
    <p class="muted">${esc(st.w)}</p>
  </section>
  <section class="sheet mp"><h2>${entry ? `Vas ${mine + 1}.º con ${entry[2]} puntos` : "Clasificación"}</h2>${boardHTML(board, me, 5)}</section>`;
  }
  return head + `
  <section class="sheet mp">
    <h2>${entry ? `Has quedado ${mine + 1}.º con ${entry[2]} puntos` : "Partida terminada"}</h2>
    ${boardHTML(board, me, BOARD_MAX)}
    <div class="row"><button class="btn" id="mp-quit">Volver al inicio</button></div>
  </section>`;
}

function mpClick(b) {
  if (b.id === "mp-host") { hostStart(); return true; }
  if (b.id === "mp-join") { MP.err = ""; P = {code:"", name:(P && P.name) || "", joined:false, err:""}; S.screen = "mp-player"; render(); scrollTo(0, 0); const i = document.getElementById("mp-code"); if (i) i.focus(); return true; }
  if (b.id === "mp-quit") { (MP.role === "host" ? hostEnd() : playerLeave()); S.screen = "home"; render(); scrollTo(0, 0); return true; }
  if (b.id === "mp-start" && H) { hostNext(); return true; }
  if (b.id === "mp-reveal" && H) { hostReveal(); return true; }
  if (b.id === "mp-next" && H) { hostNext(); return true; }
  if (b.dataset.pick != null && P && P.st && P.st.ph === "q" && P.my == null) {
    P.my = +b.dataset.pick;
    FB.D.update(gameRef(MP.code, "players/" + FB.uid), {ans:{q:P.st.qi, c:P.my, at:FB.D.serverTimestamp()}}).catch(() => {});
    render(); return true;
  }
  return false;
}
app.addEventListener("submit", async e => {
  if (e.target.id !== "mp-form") return;
  e.preventDefault();
  const code = String(document.getElementById("mp-code").value || "").toUpperCase().replace(/[^A-Z]/g, "");
  const name = cleanName(document.getElementById("mp-name").value);
  P.code = code; P.name = name;
  if (code.length !== 4) { P.err = "El código tiene cuatro letras."; render(); return; }
  if (!name) { P.err = "Escribe un nombre para que te reconozcan."; render(); return; }
  P.err = ""; P.busy = true; render();
  await joinStart(code, name);
  P.busy = false; render();
});

// ───────── Render y eventos ─────────
function render() {
  if (S.screen === "mp-host" && !H) S.screen = "home";
  if (S.screen === "mp-player" && !P) S.screen = "home";
  app.innerHTML = S.screen === "home" ? home() : S.screen === "quiz" ? quiz() : S.screen === "mp-host" ? hostView() : S.screen === "mp-player" ? playerView() : result();
  if (S.screen === "quiz") {
    const f = app.querySelector(S.picked != null ? "#next" : ".opt");
    if (f) f.focus({preventScroll: S.picked == null});
  }
}

app.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (mpClick(b)) return;
  if (b.dataset.cat) { S.cat = b.dataset.cat; render(); return; }
  if (b.dataset.lvl) { S.lvl = b.dataset.lvl; render(); return; }
  if (b.id === "go" || b.id === "again") { startRound(); scrollTo(0, 0); return; }
  if (b.id === "menu") { S.screen = "home"; render(); scrollTo(0, 0); return; }
  if (b.classList.contains("opt") && b.dataset.k != null && S.picked == null) {
    const q = S.round[S.i]; S.picked = q.opts[+b.dataset.k]; S.answers[S.i] = S.picked === q.right; render(); return;
  }
  if (b.id === "next") {
    if (S.i + 1 < S.round.length) { S.i++; S.picked = null; }
    else {
      S.screen = "result";
      const ok = S.answers.filter(Boolean).length;
      if (best[key()] == null || ok > best[key()]) { best[key()] = ok; saveBest(); }
    }
    render(); scrollTo(0, 0);
  }
});

// Aviso antes de cerrar la pestaña del anfitrión: cerrar borra la partida
addEventListener("beforeunload", e => { if (MP.role === "host" && H && H.ph !== "end") { e.preventDefault(); e.returnValue = ""; } });

render();

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
