#!/usr/bin/env node
/*
  NEL JACKPOT · Classe v2 — jeu de groupe (serveur sans dépendance)

  Lancer :  node nel-groupe.js

  Variables d'environnement :
    PORT            port du serveur (Render le fournit tout seul)
    PIN             code animateur (change-le !)
    MAX             plage de numéros au départ (défaut 100) ; elle grandit toute seule
    RESEND_API_KEY  clé API Resend pour envoyer les tickets par email (facultatif)
    MAIL_FROM       expéditeur (défaut : NEL JACKPOT <onboarding@resend.dev>)
*/
const http = require('http'), https = require('https'), fs = require('fs'), os = require('os'),
  path = require('path'), crypto = require('crypto');

const HTML = "<!doctype html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1\">\n<title>NEL JACKPOT · Classe</title>\n<style>\n:root{--gold:#d4af37;--gold2:#f6e27a;--line:#3a2f12;--txt:#f3ead0;--mut:#9b9072;--green:#2ecc71}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\nbody{margin:0;background:radial-gradient(ellipse at top,#241a04 0,#070707 60%) fixed;color:var(--txt);font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;min-height:100vh;padding-bottom:40px}\nbutton,input,textarea,select{font:inherit}\nheader{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--line);background:rgba(7,7,7,.9);gap:8px}\n.logo{font-weight:900;letter-spacing:2px;font-size:17px;background:linear-gradient(90deg,var(--gold),var(--gold2),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}\n.pill{border:1px solid var(--gold);border-radius:999px;padding:5px 12px;font-weight:800;color:var(--gold2);font-size:12px;background:#150f02;white-space:nowrap}\nmain{max-width:520px;margin:0 auto;padding:14px}\n.card{background:linear-gradient(180deg,#171309,#0f0f0f);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px}\nh2{margin:4px 0 10px;color:var(--gold2);font-size:20px}\n.muted{color:var(--mut);font-size:13px}\n.view{display:none}.view.on{display:block;animation:fade .25s ease}\n@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}\ninput,textarea,select{width:100%;padding:12px;border-radius:12px;border:1px solid var(--gold);background:#0d0b04;color:var(--gold2);font-size:16px;margin:6px 0;outline:none}\ninput.c{text-align:center;font-size:17px;padding:14px}\ntextarea{min-height:130px;resize:vertical;line-height:1.5}\nlabel{display:block;font-size:12px;color:var(--mut);margin-top:10px}\n.btn{background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1300;border:0;border-radius:12px;padding:14px 18px;font-weight:900;letter-spacing:.5px;box-shadow:0 4px 0 #7d6718,0 0 18px rgba(212,175,55,.3);width:100%;cursor:pointer}\n.btn:active{transform:translateY(3px);box-shadow:0 1px 0 #7d6718}\n.btn:disabled{filter:grayscale(1) brightness(.6);cursor:not-allowed}\n.btn.ghost{background:transparent;color:var(--gold2);border:1px solid var(--gold);box-shadow:none;margin-top:8px}\n.choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:8px;margin:12px 0}\n.ch{border-radius:14px;border:2px solid var(--line);background:#120e03;padding:10px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;transition:.15s;font-size:34px;line-height:1;min-width:0}\n.ch small{font-size:11px;color:var(--mut);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}\n.ch.on{border-color:var(--gold2);background:radial-gradient(circle,#3a2d08,#120e03);box-shadow:0 0 16px rgba(246,226,122,.5);transform:translateY(-3px)}\n.ch.on small{color:var(--gold2)}\n.counter{display:flex;align-items:center;justify-content:center;gap:12px;font-size:clamp(34px,11vw,64px);font-weight:900;font-family:ui-monospace,Consolas,monospace;color:var(--gold2);background:#0a0802;border:3px solid var(--gold);border-radius:18px;padding:18px 10px;margin:10px 0;box-shadow:inset 0 0 30px rgba(0,0,0,.8),0 0 26px rgba(212,175,55,.25);min-height:116px;overflow:hidden;white-space:nowrap}\n.counter.land{animation:land .5s ease}\n@keyframes land{0%{transform:scale(.85)}60%{transform:scale(1.08)}100%{transform:scale(1)}}\n.counter.run{filter:blur(.6px)}\n.msg{min-height:22px;text-align:center;font-weight:800;margin:6px 0;color:var(--gold2)}\n.err{color:#e07a6e}\n.ok{color:var(--green)}\n.board div{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #1d1a10;font-size:14px;gap:8px}\n.board b{color:var(--gold2);white-space:nowrap}\n.board .nm{overflow:hidden;text-overflow:ellipsis}\ncanvas#ticket{width:100%;max-width:340px;display:block;margin:0 auto 12px;border-radius:12px;box-shadow:0 0 30px rgba(212,175,55,.3)}\n.disc{font-size:11px;color:var(--mut);text-align:center;margin-top:12px;line-height:1.4}\na.adm{color:var(--mut);font-size:12px;text-decoration:underline;cursor:pointer}\n.row{display:flex;gap:8px}.row>*{flex:1}\n.chk{display:flex;align-items:center;gap:10px;margin:12px 0;color:var(--txt);font-size:14px}\n.chk input{width:22px;height:22px;margin:0;accent-color:var(--gold)}\n.mini{background:transparent;color:var(--gold2);border:1px solid var(--gold);border-radius:8px;padding:5px 8px;font-size:12px;cursor:pointer;white-space:nowrap}\n.board .iv{flex-wrap:wrap;align-items:center}\n.board .iv .ac{display:flex;gap:6px;flex-wrap:wrap}\n.note{background:#1a1300;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12px;color:var(--mut);margin-top:10px;line-height:1.4}\n#toast{position:fixed;top:62px;left:50%;transform:translateX(-50%) translateY(-20px);background:#1a1300;border:1px solid var(--gold);color:var(--gold2);padding:10px 16px;border-radius:12px;font-weight:700;opacity:0;pointer-events:none;transition:.3s;z-index:60;max-width:90%;text-align:center}\n#toast.on{opacity:1;transform:translateX(-50%)}\n</style>\n</head>\n<body>\n<header><div class=\"logo\">NEL JACKPOT · CLASSE</div><div class=\"pill\" id=\"stat\">…</div></header>\n<main>\n\n<section class=\"view\" id=\"v-join\">\n  <div class=\"card\" style=\"text-align:center\">\n    <h2 id=\"joinTitle\">Bienvenue dans la classe</h2>\n    <div id=\"joinForm\">\n      <div class=\"muted\" id=\"joinSub\">Inscris-toi pour recevoir ton numéro de participation.</div>\n      <input class=\"c\" id=\"nameIn\" maxlength=\"20\" placeholder=\"Ton prénom ou pseudo\" autocomplete=\"off\">\n      <button class=\"btn\" id=\"joinBtn\">M'INSCRIRE</button>\n      <div class=\"msg err\" id=\"joinErr\"></div>\n      <div class=\"note\" id=\"mailNote\" style=\"display:none\">✉️ Ton ticket sera aussi transmis à l'animateur de la partie.</div>\n    </div>\n    <div id=\"joinBlocked\" style=\"display:none\">\n      <div style=\"font-size:48px;margin:6px 0\">🔒</div>\n      <div id=\"blockedMsg\" style=\"font-weight:700;line-height:1.5\"></div>\n      <div class=\"note\">Les liens sont personnels : chacun ne marche que pour une seule personne. Va voir l'animateur pour recevoir le tien.</div>\n    </div>\n  </div>\n</section>\n\n<section class=\"view\" id=\"v-play\">\n  <div class=\"card\" style=\"text-align:center\">\n    <div class=\"muted\">Ton numéro de participation</div>\n    <div style=\"font-size:34px;font-weight:900;color:var(--gold2);letter-spacing:2px\" id=\"myPid\"></div>\n    <div class=\"muted\" id=\"myName\"></div>\n  </div>\n  <div class=\"card\">\n    <h2 style=\"text-align:center\" id=\"playTitle\">Fais ton choix</h2>\n    <div class=\"choices\" id=\"choices\"></div>\n    <div class=\"counter\" id=\"counter\">🎲 ??</div>\n    <div class=\"msg\" id=\"playMsg\"></div>\n    <button class=\"btn\" id=\"startBtn\" disabled>DÉMARRER</button>\n  </div>\n</section>\n\n<section class=\"view\" id=\"v-result\">\n  <div class=\"card\">\n    <h2 style=\"text-align:center\">Ton résultat</h2>\n    <div class=\"counter land\" id=\"resCounter\"></div>\n    <canvas id=\"ticket\" width=\"680\" height=\"1000\"></canvas>\n    <button class=\"btn\" id=\"saveBtn\">ENREGISTRER LE TICKET</button>\n    <button class=\"btn ghost\" id=\"shareBtn\" style=\"display:none\">PARTAGER</button>\n    <div class=\"msg ok\" id=\"sentMsg\"></div>\n  </div>\n</section>\n\n<div class=\"card\" id=\"boardCard\" style=\"display:none\">\n  <h2 style=\"font-size:16px\">Derniers résultats du groupe</h2>\n  <div class=\"board\" id=\"board\"></div>\n</div>\n\n<div class=\"card\" id=\"admCard\" style=\"display:none\">\n  <h2 style=\"font-size:16px\">Animateur</h2>\n  <input id=\"pin\" type=\"password\" placeholder=\"Code animateur\" autocomplete=\"off\">\n  <button class=\"btn\" id=\"admUnlock\">DÉVERROUILLER</button>\n  <div id=\"admForm\" style=\"display:none\">\n    <div class=\"note\" id=\"admInfo\"></div>\n    <label>Titre de la partie</label>\n    <input id=\"admTitle\" maxlength=\"40\" placeholder=\"Ex. Classe de L1 · Fruits\">\n    <label>Modèle de choix</label>\n    <select id=\"admPreset\">\n      <option value=\"\">— Choisir un modèle —</option>\n      <option value=\"fruits\">Fruits</option>\n      <option value=\"animaux\">Animaux</option>\n      <option value=\"sports\">Sports</option>\n      <option value=\"couleurs\">Couleurs</option>\n      <option value=\"boissons\">Boissons</option>\n    </select>\n    <label>Les choix (un par ligne : emoji puis nom, 2 à 12 choix)</label>\n    <textarea id=\"admItems\" spellcheck=\"false\"></textarea>\n    <label>Email de l'animateur (reçoit tous les tickets)</label>\n    <input id=\"admEmail\" type=\"email\" inputmode=\"email\" placeholder=\"animateur@exemple.com\">\n    <div class=\"row\">\n      <div><label>Limite de participants (0 = illimité)</label><input id=\"admLimit\" type=\"number\" min=\"0\" placeholder=\"0\"></div>\n      <div><label>Numéros de 1 à… (au départ)</label><input id=\"admBase\" type=\"number\" min=\"10\" placeholder=\"100\"></div>\n    </div>\n    <label class=\"chk\"><input type=\"checkbox\" id=\"admInvite\"> Partie sur invitation (liens personnels : chaque lien ne marche que pour une personne)</label>\n    <label class=\"chk\"><input type=\"checkbox\" id=\"admNew\"> Nouvelle partie (efface les inscrits, les résultats et les liens)</label>\n    <button class=\"btn\" id=\"admSave\">ENREGISTRER</button>\n    <h2 style=\"font-size:15px;margin-top:18px\">Liens personnels</h2>\n    <div class=\"muted\">Crée un lien par personne et envoie-le-lui. Le premier appareil qui l'ouvre le verrouille : copié à quelqu'un d'autre, il ne marche plus.</div>\n    <label>Noms (un par ligne) : un lien par nom, le nom est verrouillé sur le ticket</label>\n    <textarea id=\"invNames\" spellcheck=\"false\" style=\"min-height:90px\" placeholder=\"Kossi&#10;Awa&#10;Ibrahim\"></textarea>\n    <label>…ou nombre de liens anonymes (le joueur écrit son prénom)</label>\n    <input id=\"invCount\" type=\"number\" min=\"0\" max=\"500\" placeholder=\"0\">\n    <button class=\"btn\" id=\"invCreate\">CRÉER LES LIENS</button>\n    <button class=\"btn ghost\" id=\"invCopyAll\">COPIER TOUS LES LIENS</button>\n    <div class=\"board\" id=\"invList\" style=\"margin-top:8px\"></div>\n    <button class=\"btn ghost\" id=\"admListBtn\">VOIR LES INSCRITS</button>\n    <button class=\"btn ghost\" id=\"admCsv\">TÉLÉCHARGER LA LISTE (CSV)</button>\n    <button class=\"btn ghost\" id=\"admResend\">RENVOYER LES EMAILS NON ENVOYÉS</button>\n    <div class=\"msg\" id=\"admMsg\"></div>\n    <div class=\"board\" id=\"admList\" style=\"margin-top:8px\"></div>\n  </div>\n</div>\n<div style=\"text-align:center\"><a class=\"adm\" id=\"admLink\">Animateur</a></div>\n<div class=\"disc\">Jeu gratuit entre amis. Aucun argent, aucun gain réel.</div>\n</main>\n<div id=\"toast\"></div>\n\n<script>\nconst $=s=>document.querySelector(s);\nconst esc=t=>String(t).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\nconst pidTxt=n=>'P-'+String(n).padStart(3,'0');\nconst fmt=n=>Number(n).toLocaleString('fr-FR');\nlet ME=null,ST=null,sel=null,playing=false,lastView='',itemsKey='',uploaded='';\nlet INV='';try{INV=(new URLSearchParams(location.search).get('i')||'').replace(/[^A-Za-z0-9]/g,'').slice(0,20)}catch(e){}\ntry{ME=JSON.parse(localStorage.getItem('nelg'))}catch(e){}\nfunction saveMe(){try{if(ME)localStorage.setItem('nelg',JSON.stringify(ME));else localStorage.removeItem('nelg')}catch(e){}}\nlet tt;function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),2800)}\n\n/* audio */\nlet AC=null;\nfunction tone(f,d=.06,v=.05){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.02)}catch(e){}}\nfunction fanfare(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.2,.08),i*110))}\n\nasync function api(path,body){\n  const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);\n  const j=await r.json().catch(()=>({}));\n  if(!r.ok)throw new Error(j.error||'Erreur réseau');\n  return j;\n}\nfunction show(v){\n  document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));\n  lastView=v;\n}\n\n/* ---------- état ---------- */\nasync function poll(){\n  if(playing)return;\n  try{\n    ST=await api('/api/state?token='+encodeURIComponent(ME?ME.token:'')+'&i='+encodeURIComponent(INV));\n    if(ME&&!ST.me){ME=null;saveMe()}\n    if(!ME&&ST.me){ME={token:ST.me.token,name:ST.me.name,pid:ST.me.pid};saveMe()}\n    render();\n  }catch(e){$('#stat').textContent='hors ligne'}\n}\nfunction render(){\n  $('#stat').textContent=fmt(ST.players)+' inscrit'+(ST.players>1?'s':'')+' · '+fmt(ST.drawn)+' tiré'+(ST.drawn>1?'s':'');\n  $('#mailNote').style.display=ST.mail?'block':'none';\n  $('#joinTitle').textContent=ST.title||'Bienvenue dans la classe';\n  if(!ST.me){\n    if(lastView!=='join')show('join');\n    const iv=ST.invite||{status:'none'};\n    let blocked='';\n    if(iv.status==='taken')blocked='Ce lien a déjà été utilisé sur un autre appareil.';\n    else if(iv.status==='invalid')blocked='Ce lien n\\'est pas valide.';\n    else if(ST.inviteMode&&iv.status==='none')blocked='Cette partie est sur invitation : il te faut ton lien personnel.';\n    $('#joinBlocked').style.display=blocked?'block':'none';$('#joinForm').style.display=blocked?'none':'block';\n    if(blocked)$('#blockedMsg').textContent=blocked;\n    else if(iv.status==='free'&&iv.label){\n      const n=$('#nameIn');if(n.value!==iv.label)n.value=iv.label;n.readOnly=true;\n      $('#joinSub').textContent='Bonjour '+iv.label+' ! Appuie pour entrer dans la partie.';$('#joinBtn').textContent='ENTRER';\n    }\n  }\n  else if(ST.me.result){\n    if(lastView!=='result'){show('result');drawTicket();$('#resCounter').textContent=ST.me.result.emoji+' '+ST.me.result.number;uploadTicket()}\n  }else{\n    const key=JSON.stringify(ST.items);\n    if(lastView!=='play'){show('play');buildChoices();itemsKey=key}\n    else if(key!==itemsKey){buildChoices();itemsKey=key}\n    $('#playTitle').textContent=ST.title||'Fais ton choix';\n    $('#myPid').textContent=pidTxt(ST.me.pid);$('#myName').textContent=ST.me.name;\n  }\n  const b=$('#board');\n  if(ST.board.length){\n    $('#boardCard').style.display='block';\n    b.innerHTML=ST.board.map(x=>`<div><span class=\"nm\">${esc(x.name)} <span class=\"muted\">${pidTxt(x.pid)}</span></span><b>${esc(x.emoji)} ${x.number}</b></div>`).join('');\n  }else $('#boardCard').style.display='none';\n}\n\n/* ---------- inscription ---------- */\n$('#joinBtn').onclick=async()=>{\n  const n=$('#nameIn').value.trim();$('#joinErr').textContent='';\n  if(n.length<2){$('#joinErr').textContent='Écris ton prénom (2 lettres minimum).';return}\n  try{const j=await api('/api/join',{name:n,invite:INV});ME={token:j.token,name:j.name,pid:j.pid};saveMe();tone(660);await poll()}\n  catch(e){$('#joinErr').textContent=e.message}\n};\n$('#nameIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('#joinBtn').click()});\n\n/* ---------- choix + tirage ---------- */\nfunction buildChoices(){\n  sel=null;$('#startBtn').disabled=true;$('#counter').textContent='🎲 ??';$('#playMsg').textContent='';\n  $('#choices').innerHTML=ST.items.map(c=>`<div class=\"ch\" data-k=\"${esc(c.id)}\">${esc(c.e)}<small>${esc(c.n)}</small></div>`).join('');\n  document.querySelectorAll('.ch').forEach(el=>el.onclick=()=>{\n    if(playing)return;sel=el.dataset.k;tone(700,.05);\n    document.querySelectorAll('.ch').forEach(x=>x.classList.toggle('on',x===el));\n    const it=ST.items.find(x=>x.id===sel);\n    $('#startBtn').disabled=false;$('#counter').textContent=(it?it.e:'')+' ??';\n  });\n}\n$('#startBtn').onclick=async()=>{\n  if(!sel||playing)return;\n  playing=true;$('#startBtn').disabled=true;$('#playMsg').className='msg';$('#playMsg').textContent='';\n  let res;\n  try{res=await api('/api/play',{token:ME.token,choice:sel})}\n  catch(e){playing=false;$('#startBtn').disabled=false;$('#playMsg').className='msg err';$('#playMsg').textContent=e.message;poll();return}\n  const c=$('#counter'),e=res.emoji,mx=ST?ST.range:100;\n  c.classList.add('run');\n  const t0=performance.now(),dur=3600;let last=0,gap=50;\n  (function step(now){\n    const el=now-t0;\n    if(el>=dur){\n      c.classList.remove('run');c.textContent=e+' '+res.number;c.classList.remove('land');void c.offsetWidth;c.classList.add('land');\n      fanfare();\n      setTimeout(async()=>{playing=false;await poll();toast('Ticket prêt !')},1300);\n      return;\n    }\n    if(now-last>=gap){last=now;c.textContent=e+' '+(1+Math.floor(Math.random()*mx));tone(500+Math.random()*500,.03,.03);gap=45+(el/dur)*220}\n    requestAnimationFrame(step);\n  })(t0);\n};\n\n/* ---------- ticket ---------- */\nfunction rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}\nfunction drawTicket(){\n  if(!ST||!ST.me||!ST.me.result)return;\n  const cv=$('#ticket'),c=cv.getContext('2d'),W=680,H=1000,me=ST.me,r=me.result;\n  c.clearRect(0,0,W,H);\n  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1d1504');g.addColorStop(1,'#0a0a0a');\n  rr(c,10,10,W-20,H-20,34);c.fillStyle=g;c.fill();c.lineWidth=6;c.strokeStyle='#d4af37';c.stroke();\n  c.setLineDash([14,10]);c.lineWidth=2;c.strokeStyle='rgba(246,226,122,.5)';rr(c,34,34,W-68,H-68,22);c.stroke();c.setLineDash([]);\n  c.textAlign='center';\n  const lg=c.createLinearGradient(100,0,580,0);lg.addColorStop(0,'#d4af37');lg.addColorStop(.5,'#f6e27a');lg.addColorStop(1,'#d4af37');\n  c.fillStyle=lg;c.font='900 54px system-ui,sans-serif';c.fillText('NEL JACKPOT',W/2,120);\n  c.fillStyle='#9b9072';c.font='700 24px system-ui,sans-serif';c.fillText((ST.title||'TICKET DE PARTICIPATION').toUpperCase(),W/2,160,540);\n  c.fillStyle='#d4af37';c.fillRect(90,190,W-180,3);\n  c.fillStyle='#9b9072';c.font='600 24px system-ui,sans-serif';c.fillText('JOUEUR',W/2,250);\n  c.fillStyle='#f3ead0';c.font='800 46px system-ui,sans-serif';c.fillText(me.name,W/2,305,520);\n  c.fillStyle='#9b9072';c.font='600 24px system-ui,sans-serif';c.fillText('N° DE PARTICIPATION',W/2,370);\n  c.fillStyle='#f6e27a';c.font='900 56px ui-monospace,Consolas,monospace';c.fillText(pidTxt(me.pid),W/2,435);\n  c.fillStyle='#070707';c.beginPath();c.arc(10,490,24,0,Math.PI*2);c.fill();c.beginPath();c.arc(W-10,490,24,0,Math.PI*2);c.fill();\n  c.setLineDash([12,10]);c.strokeStyle='rgba(212,175,55,.6)';c.lineWidth=3;c.beginPath();c.moveTo(50,490);c.lineTo(W-50,490);c.stroke();c.setLineDash([]);\n  c.fillStyle='#9b9072';c.font='600 24px system-ui,sans-serif';c.fillText('MON CHOIX : '+String(r.name).toUpperCase(),W/2,550,540);\n  rr(c,70,575,W-140,190,24);c.fillStyle='#0a0802';c.fill();c.lineWidth=4;c.strokeStyle='#d4af37';c.stroke();\n  const txt=r.emoji+' '+r.number,fs=txt.length>9?84:txt.length>7?100:120;\n  c.fillStyle='#f6e27a';c.font='900 '+fs+'px system-ui,\"Apple Color Emoji\",\"Segoe UI Emoji\",sans-serif';\n  c.fillText(txt,W/2,575+95+fs*0.35,W-180);\n  let seed=(me.pid*977+r.number*131+ST.gameId*17)>>>0;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};\n  c.fillStyle='#f3ead0';let x=110;while(x<W-110){const w=2+Math.floor(rnd()*6);c.fillRect(x,810,w,70);x+=w+2+Math.floor(rnd()*4)}\n  c.fillStyle='#9b9072';c.font='600 22px ui-monospace,Consolas,monospace';\n  c.fillText('PARTIE #'+ST.gameId+'  ·  '+pidTxt(me.pid)+'-'+r.number,W/2,915,560);\n  const d=new Date(r.at||Date.now());\n  c.font='600 22px system-ui,sans-serif';c.fillText(d.toLocaleDateString('fr-FR')+' · '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),W/2,950);\n}\nasync function uploadTicket(){\n  if(!ST||!ST.mail||!ST.me||!ST.me.result)return;\n  const k=ST.gameId+':'+ST.me.pid;if(uploaded===k)return;uploaded=k;\n  try{await api('/api/ticket',{token:ME.token,png:$('#ticket').toDataURL('image/png')});$('#sentMsg').textContent='✉️ Ticket transmis à l\\'animateur'}catch(e){}\n}\nfunction ticketBlob(){return new Promise(res=>$('#ticket').toBlob(res,'image/png'))}\n$('#saveBtn').onclick=async()=>{\n  const b=await ticketBlob(),a=document.createElement('a');\n  a.href=URL.createObjectURL(b);a.download='ticket-nel-'+pidTxt(ST.me.pid)+'.png';document.body.appendChild(a);a.click();a.remove();\n  setTimeout(()=>URL.revokeObjectURL(a.href),3000);toast('Ticket enregistré');\n};\nif(navigator.canShare&&navigator.share)$('#shareBtn').style.display='block';\n$('#shareBtn').onclick=async()=>{\n  try{const b=await ticketBlob(),f=new File([b],'ticket-nel.png',{type:'image/png'});\n    if(navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'Mon ticket NEL JACKPOT'});else toast('Partage indisponible, utilise Enregistrer.')}catch(e){}\n};\n\n/* ---------- animateur ---------- */\nconst PRESETS={\n  fruits:['🍎 Pomme','🍌 Banane','🍇 Raisin','🍊 Orange','🍓 Fraise'],\n  animaux:['🦁 Lion','🐘 Éléphant','🐢 Tortue','🦅 Aigle','🐬 Dauphin','🐍 Serpent'],\n  sports:['⚽ Football','🏀 Basket','🎾 Tennis','🏐 Volley','🥊 Boxe'],\n  couleurs:['🔴 Rouge','🔵 Bleu','🟢 Vert','🟡 Jaune','🟣 Violet'],\n  boissons:['🥤 Soda','🧃 Jus','💧 Eau','☕ Café','🥛 Lait']\n};\nconst PN={fruits:'Fruits',animaux:'Animaux',sports:'Sports',couleurs:'Couleurs',boissons:'Boissons'};\nconst pinV=()=>$('#pin').value;\nfunction admMsg(t,ok){const m=$('#admMsg');m.className='msg '+(ok?'ok':'err');m.textContent=t}\nfunction counts(c){\n  const p=[];if(c.sent)p.push(c.sent+' envoyé'+(c.sent>1?'s':''));if(c.queued+c.waiting)p.push((c.queued+c.waiting)+' en cours');if(c.failed)p.push(c.failed+' en échec');if(c.off)p.push(c.off+' non envoyé'+(c.off>1?'s':''));\n  return p.length?p.join(' · '):'aucun ticket pour le moment';\n}\n$('#admLink').onclick=()=>{const c=$('#admCard');c.style.display=c.style.display==='none'?'block':'none'};\n$('#admPreset').onchange=e=>{const k=e.target.value;if(!k)return;$('#admItems').value=PRESETS[k].join('\\n');if(!$('#admTitle').value.trim()||/^Partie /.test($('#admTitle').value))$('#admTitle').value='Partie '+PN[k]};\n$('#admUnlock').onclick=async()=>{\n  try{\n    const j=await api('/api/admin/config',{pin:pinV()});\n    $('#admTitle').value=j.title;$('#admItems').value=j.itemsText;$('#admEmail').value=j.email;\n    $('#admLimit').value=j.limit||'';$('#admBase').value=j.base;$('#admNew').checked=false;$('#admInvite').checked=!!j.invite;\n    $('#admForm').style.display='block';$('#admUnlock').style.display='none';$('#admMsg').textContent='';loadInvites();\n    $('#admInfo').innerHTML='Partie #'+j.gameId+' · '+fmt(j.players)+' inscrit(s) · '+fmt(j.drawn)+' numéro(s) tiré(s)<br>Emails : '+counts(j.counts)+(j.mailKey?'':'<br>⚠️ Envoi d\\'email non configuré sur le serveur (clé RESEND_API_KEY manquante).');\n  }catch(e){toast(e.message)}\n};\n$('#admSave').onclick=async()=>{\n  const nw=$('#admNew').checked;\n  if(nw&&!confirm('Lancer une nouvelle partie ? Les inscrits et résultats actuels seront effacés.'))return;\n  try{\n    await api('/api/admin/save',{pin:pinV(),title:$('#admTitle').value,items:$('#admItems').value.split('\\n'),email:$('#admEmail').value.trim(),limit:$('#admLimit').value,base:$('#admBase').value,invite:$('#admInvite').checked,newGame:nw});\n    admMsg(nw?'Nouvelle partie lancée.':'Réglages enregistrés.',true);\n    if(nw){ME=null;saveMe();lastView='';uploaded='';$('#admList').innerHTML='';$('#invList').innerHTML='';$('#admNew').checked=false}\n    poll();$('#admForm').style.display='none';$('#admUnlock').style.display='block';\n  }catch(e){admMsg(e.message,false)}\n};\nconst MS={sent:'envoyé',queued:'en cours',waiting:'en cours',failed:'échec',off:'—','':'—'};\n$('#admListBtn').onclick=async()=>{\n  try{const j=await api('/api/admin/list',{pin:pinV()});\n    $('#admMsg').className='msg';$('#admMsg').textContent='Emails : '+counts(j.counts);\n    $('#admList').innerHTML=j.players.length?j.players.map(p=>`<div><span class=\"nm\">${esc(p.name)} <span class=\"muted\">${pidTxt(p.pid)} · ${MS[p.mail]||'—'}</span></span><b>${p.result?esc(p.result.emoji)+' '+p.result.number:'…'}</b></div>`).join(''):'<span class=\"muted\">Personne pour le moment.</span>'}\n  catch(e){admMsg(e.message,false)}\n};\n$('#admCsv').onclick=async()=>{\n  try{const j=await api('/api/admin/list',{pin:pinV()});\n    const q=v=>'\"'+String(v).replace(/\"/g,'\"\"')+'\"';\n    const rows=[['Participation','Nom','Choix','Numéro','Email']].concat(j.players.map(p=>[pidTxt(p.pid),p.name,p.result?p.result.emoji+' '+p.result.name:'',p.result?p.result.number:'',MS[p.mail]||'']));\n    const blob=new Blob(['﻿'+rows.map(r=>r.map(q).join(';')).join('\\n')],{type:'text/csv;charset=utf-8'});\n    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='resultats-nel.csv';document.body.appendChild(a);a.click();a.remove();\n    setTimeout(()=>URL.revokeObjectURL(a.href),3000);admMsg('Liste téléchargée.',true)}\n  catch(e){admMsg(e.message,false)}\n};\n$('#admResend').onclick=async()=>{\n  try{const j=await api('/api/admin/resend',{pin:pinV()});admMsg(j.queued+' email(s) remis en envoi.',true)}\n  catch(e){admMsg(e.message,false)}\n};\n\n/* ---------- liens personnels ---------- */\nlet INVS=[];\nconst linkOf=code=>location.href.split(/[?#]/)[0]+'?i='+code;\nasync function copyText(t,msg){\n  try{await navigator.clipboard.writeText(t);toast(msg||'Copié')}\n  catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast(msg||'Copié')}catch(x){toast('Copie impossible')}a.remove()}\n}\nfunction renderInvites(){\n  $('#invList').innerHTML=INVS.length?INVS.map((v,i)=>{\n    const st=v.claimed?(v.played?'a joué':'utilisé'):'libre';\n    const who=v.label||v.player||'Lien anonyme';\n    const ac=['<button class=\"mini\" data-a=\"copy\" data-i=\"'+i+'\">Copier</button>','<button class=\"mini\" data-a=\"wa\" data-i=\"'+i+'\">WhatsApp</button>'];\n    if(v.claimed||v.player)ac.push('<button class=\"mini\" data-a=\"rel\" data-i=\"'+i+'\">Libérer</button>');else ac.push('<button class=\"mini\" data-a=\"del\" data-i=\"'+i+'\">✕</button>');\n    return '<div class=\"iv\"><span class=\"nm\">'+esc(who)+(v.label&&v.player&&v.player!==v.label?' · '+esc(v.player):'')+' <span class=\"muted\">· '+st+'</span></span><span class=\"ac\">'+ac.join('')+'</span></div>';\n  }).join(''):'<span class=\"muted\">Aucun lien créé pour le moment.</span>';\n}\nasync function loadInvites(){try{const j=await api('/api/admin/invites',{pin:pinV()});INVS=j.invites;renderInvites()}catch(e){}}\nsetInterval(()=>{if($('#admForm').style.display==='block')loadInvites()},4000);\n$('#invCreate').onclick=async()=>{\n  const names=$('#invNames').value.split('\\n').map(s=>s.trim()).filter(Boolean),count=parseInt($('#invCount').value,10)||0;\n  if(!names.length&&!count){admMsg('Écris des noms ou un nombre de liens.',false);return}\n  try{const j=await api('/api/admin/invites',{pin:pinV(),names,count});INVS=j.invites;renderInvites();$('#invNames').value='';$('#invCount').value='';admMsg('Liens créés. Envoie chaque lien à la bonne personne.',true)}\n  catch(e){admMsg(e.message,false)}\n};\n$('#invList').onclick=async e=>{\n  const b=e.target.closest('button');if(!b)return;const v=INVS[+b.dataset.i];if(!v)return;\n  if(b.dataset.a==='copy')copyText(linkOf(v.code),'Lien copié');\n  else if(b.dataset.a==='wa'){const t=(v.label?'Bonjour '+v.label+', v':'V')+'oici ton lien personnel pour NEL JACKPOT : '+linkOf(v.code)+'\\n(Ce lien ne marche que pour toi, ne le transfère pas.)';window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank')}\n  else if(b.dataset.a==='rel'){\n    if(!confirm('Libérer ce lien ? L\\'appareil actuel perd l\\'accès, et le prochain appareil qui ouvre le lien retrouve ce joueur et son résultat.'))return;\n    try{await api('/api/admin/release',{pin:pinV(),code:v.code});loadInvites();admMsg('Lien libéré.',true)}catch(x){admMsg(x.message,false)}\n  }else if(b.dataset.a==='del'){\n    try{await api('/api/admin/invite-delete',{pin:pinV(),code:v.code});loadInvites()}catch(x){admMsg(x.message,false)}\n  }\n};\n$('#invCopyAll').onclick=()=>{\n  if(!INVS.length){admMsg('Aucun lien à copier.',false);return}\n  copyText(INVS.map((v,i)=>(v.label||'Lien '+(i+1))+' : '+linkOf(v.code)).join('\\n'),INVS.length+' liens copiés');\n};\n\npoll();setInterval(poll,3000);\n</script>\n</body>\n</html>\n";
const PORT = +process.env.PORT || 3000;
const BASE = Math.max(10, +process.env.MAX || 100);
const PIN = String(process.env.PIN || '1234');
const FILE = path.join(process.cwd(), 'nel-groupe-data.json');
const MAIL_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.MAIL_FROM || 'NEL JACKPOT <onboarding@resend.dev>';
const MAIL_URL = process.env.MAIL_API_URL || 'https://api.resend.com/emails';
const MAIL_GAP = +process.env.MAIL_GAP_MS || 700;
const WAIT_MS = +process.env.TICKET_WAIT_MS || 90000;
const TZ = process.env.TZ_NAME || 'Africa/Porto-Novo';
const HARD_LIMIT = 1000000;

const DEFAULT_ITEMS = [['🍎', 'Pomme'], ['🍌', 'Banane'], ['🍇', 'Raisin'], ['🍊', 'Orange'], ['🍓', 'Fraise']]
  .map(([e, n], i) => ({ id: 'c' + i, e, n }));
const LEGACY = { pomme: '🍎', banane: '🍌', raisin: '🍇', orange: '🍊', fraise: '🍓' };

const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, n = 20) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const pidTxt = n => 'P-' + String(n).padStart(3, '0');
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;

/* ---------- choix (emoji + nom) ---------- */
function parseItems(src) {
  const lines = (Array.isArray(src) ? src : String(src || '').split('\n'))
    .map(s => String(s).replace(/[\u0000-\u001f<>]/g, '').trim()).filter(Boolean);
  const isEmoji = t => t.length <= 12 && !/\p{L}/u.test(t) && (/\p{Extended_Pictographic}|⃣/u.test(t) || !/\p{N}/u.test(t));
  const out = [];
  for (const l of lines) {
    const m = l.match(/^(\S+)\s+(.+)$/);
    let e = '🔹', n = l;
    if (m && isEmoji(m[1])) { e = m[1]; n = m[2]; }
    else if (isEmoji(l)) { e = l; n = l; }
    out.push({ id: 'c' + out.length, e, n: n.slice(0, 24) });
    if (out.length >= 12) break;
  }
  return out;
}

/* ---------- état ---------- */
let G, USED, TOK, RECENT, WAITING;

function blank(id) {
  return { gameId: id, base: BASE, limit: 0, title: 'Classe NEL', items: DEFAULT_ITEMS.map(x => ({ ...x })), email: '', invite: false, invites: [], players: [], seq: 0 };
}
let INV;
function index() {
  TOK = new Map(); RECENT = []; WAITING = new Set(); INV = new Map();
  if (!Array.isArray(G.invites)) G.invites = [];
  for (const v of G.invites) INV.set(v.code, v);
  const played = [];
  for (const p of G.players) {
    TOK.set(p.token, p);
    if (p.result) {
      if (!p.result.emoji) { p.result.emoji = LEGACY[p.result.choice] || '🔹'; p.result.name = p.result.name || p.result.choice; }
      played.push(p);
      if (p.mail === 'queued') p.mail = 'waiting';
      if (p.mail === 'waiting') WAITING.add(p);
    }
  }
  played.sort((a, b) => a.result.at - b.result.at);
  RECENT = played.slice(-60);
}
function init(g) {
  G = Object.assign(blank(1), g || {});
  G.base = G.base || G.max || BASE;
  if (!Array.isArray(G.items) || G.items.length < 2) G.items = DEFAULT_ITEMS.map(x => ({ ...x }));
  delete G.max; delete G.pool;
  USED = new Set(Array.isArray(g && g.used) ? g.used : G.players.filter(p => p.result).map(p => p.result.number));
  delete G.used;
  index();
}
function load() {
  try { const g = JSON.parse(fs.readFileSync(FILE, 'utf8')); if (g && Array.isArray(g.players)) return g; } catch (e) {}
  return null;
}
let saveT = null;
function saveNow() {
  try { fs.writeFileSync(FILE + '.tmp', JSON.stringify({ ...G, used: [...USED] })); fs.renameSync(FILE + '.tmp', FILE); } catch (e) {}
}
function saveSoon() { if (saveT) return; saveT = setTimeout(() => { saveT = null; saveNow(); }, 400); }
process.on('SIGTERM', () => { saveNow(); process.exit(0); });
init(load());

/* ---------- numéros uniques, sans limite ---------- */
function range() { let r = G.base; while (USED.size * 3 >= r && r < 1e13) r *= 10; return r; }
function draw() {
  let r = range();
  for (;;) {
    for (let i = 0; i < 60; i++) {
      const n = crypto.randomInt(1, r + 1);
      if (!USED.has(n)) { USED.add(n); return n; }
    }
    r = Math.min(r * 10, 1e13);
  }
}

/* ---------- email ---------- */
const mailOn = () => !!(MAIL_KEY && G.email);
function postJson(urlStr, headers, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr), lib = u.protocol === 'http:' ? http : https, data = JSON.stringify(payload);
    const req = lib.request({
      hostname: u.hostname, port: u.port || (u.protocol === 'http:' ? 80 : 443), path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }, timeout: 20000
    }, res => {
      let b = ''; res.on('data', c => { if (b.length < 2000) b += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(b);
        const e = new Error('Email refusé (' + res.statusCode + ') ' + b.slice(0, 100)); e.retry = res.statusCode === 429 || res.statusCode >= 500; reject(e);
      });
    });
    req.on('timeout', () => req.destroy(new Error('Délai dépassé')));
    req.on('error', e => { e.retry = true; reject(e); });
    req.write(data); req.end();
  });
}
function ticketHtml(p) {
  const r = p.result, d = new Date(r.at).toLocaleString('fr-FR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });
  const row = (k, v) => `<tr><td style="padding:6px 0;color:#9b9072;font-size:13px">${k}</td><td style="padding:6px 0;text-align:right;color:#f3ead0;font-weight:700">${v}</td></tr>`;
  return `<div style="background:#0a0a0a;padding:24px;font-family:system-ui,Arial,sans-serif"><div style="max-width:400px;margin:auto;border:2px solid #d4af37;border-radius:16px;background:#14100a;padding:24px;text-align:center">
<div style="color:#f6e27a;font-size:24px;font-weight:900;letter-spacing:2px">NEL JACKPOT</div>
<div style="color:#9b9072;font-size:12px;margin-bottom:14px">${esc(G.title)} · Partie #${G.gameId}</div>
<div style="font-size:54px;font-weight:900;color:#f6e27a;background:#0a0802;border:2px solid #d4af37;border-radius:14px;padding:12px">${esc(r.emoji)} ${r.number}</div>
<table style="width:100%;margin-top:14px;border-collapse:collapse">${row('Joueur', esc(p.name))}${row('N° de participation', pidTxt(p.pid))}${row('Choix', esc(r.emoji + ' ' + r.name))}${row('Numéro tiré', r.number)}${row('Date', esc(d))}</table></div></div>`;
}
async function sendTicket(p, png) {
  const r = p.result;
  const payload = {
    from: MAIL_FROM, to: [G.email],
    subject: `Ticket NEL · ${p.name} · ${pidTxt(p.pid)} · ${r.emoji} ${r.number}`,
    html: ticketHtml(p),
    text: `Ticket NEL JACKPOT\nJoueur : ${p.name}\nParticipation : ${pidTxt(p.pid)}\nChoix : ${r.emoji} ${r.name}\nNuméro tiré : ${r.number}\nPartie #${G.gameId} · ${G.title}`
  };
  if (png) payload.attachments = [{ filename: 'ticket-' + pidTxt(p.pid) + '.png', content: png.toString('base64') }];
  await postJson(MAIL_URL, { Authorization: 'Bearer ' + MAIL_KEY }, payload);
}
const Q = []; let pumping = false;
function enqueue(p, png) {
  WAITING.delete(p); p.mail = 'queued'; delete p.mailErr; Q.push({ p, png, tries: 0 }); pump();
}
async function pump() {
  if (pumping) return; pumping = true;
  while (Q.length) {
    const j = Q.shift();
    try { await sendTicket(j.p, j.png); j.p.mail = 'sent'; }
    catch (e) {
      if (e.retry && ++j.tries < 3) { await sleep(2000 * j.tries); Q.unshift(j); continue; }
      j.p.mail = 'failed'; j.p.mailErr = String(e.message).slice(0, 120);
    }
    saveSoon(); await sleep(MAIL_GAP);
  }
  pumping = false;
}
setInterval(() => {
  const now = Date.now();
  for (const p of [...WAITING]) if (now - p.result.at > WAIT_MS) { if (mailOn()) enqueue(p, null); else { WAITING.delete(p); p.mail = 'off'; } }
}, 15000).unref();

/* ---------- HTTP ---------- */
const send = (res, code, obj, extra) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(extra || {}) });
  res.end(JSON.stringify(obj));
};
function body(req, max = 10000) {
  return new Promise(resolve => {
    let d = '', over = false;
    req.on('data', c => { if (over) return; d += c; if (d.length > max) { over = true; d = ''; } });
    req.on('end', () => { if (over) return resolve(null); try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
const fails = [];
function pinCheck(pin) {
  const now = Date.now();
  while (fails.length && now - fails[0] > 60000) fails.shift();
  if (fails.length >= 10) return 'locked';
  const h = s => crypto.createHash('sha256').update(String(s)).digest();
  if (crypto.timingSafeEqual(h(pin), h(PIN))) return true;
  fails.push(now); return false;
}
/* ---------- liens personnels (usage unique) ---------- */
const cookieTok = req => { const m = String(req.headers.cookie || '').match(/(?:^|;\s*)nel_t=([a-f0-9]{32})/); return m ? m[1] : ''; };
const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = crypto.randomBytes(12); let s = ''; for (let i = 0; i < 12; i++) s += A[b[i] % A.length]; return s; };
function inviteInfo(code, me) {
  if (!code) return { status: 'none' };
  const v = INV.get(code);
  if (!v) return { status: 'invalid' };
  const pl = v.pid ? G.players.find(p => p.pid === v.pid) : null;
  const label = v.label || (pl ? pl.name : '');
  if (v.claimed) return { status: me && me.inv === code ? 'mine' : 'taken', label };
  return { status: 'free', label };
}
function state(token, code) {
  const me = TOK.get(token);
  return {
    gameId: G.gameId, title: G.title, items: G.items, range: range(),
    players: G.players.length, drawn: USED.size, limit: G.limit, mail: mailOn(),
    inviteMode: !!G.invite, invite: inviteInfo(code, me),
    me: me ? { token: me.token, pid: me.pid, name: me.name, result: me.result } : null,
    board: (me || !G.invite ? RECENT.slice().reverse() : []).map(p => ({ name: p.name, pid: p.pid, emoji: p.result.emoji, number: p.result.number }))
  };
}
function counts() {
  const c = { sent: 0, failed: 0, waiting: 0, queued: 0, off: 0 };
  for (const p of G.players) if (p.result && c[p.mail] !== undefined) c[p.mail]++;
  return c;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), P = url.pathname;
  try {
    if (req.method === 'GET' && (P === '/' || P === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(HTML);
    }
    if (req.method === 'GET' && P === '/healthz') return send(res, 200, { ok: true });
    if (req.method === 'GET' && P === '/api/state') {
      const tk = url.searchParams.get('token') || '';
      return send(res, 200, state(TOK.has(tk) ? tk : cookieTok(req), String(url.searchParams.get('i') || '').slice(0, 20)));
    }

    if (req.method === 'POST' && P === '/api/join') {
      const b = await body(req); if (!b) return send(res, 413, { error: 'Trop volumineux.' });
      const code = String(b.invite || '').slice(0, 20), v = code ? INV.get(code) : null;
      if (G.invite && !v) return send(res, 403, { error: 'Cette partie est sur invitation : demande ton lien personnel à l\'animateur.' });
      if (code && !v) return send(res, 403, { error: 'Lien invalide : demande un nouveau lien à l\'animateur.' });
      if (v && v.claimed) return send(res, 409, { error: 'Ce lien est déjà utilisé sur un autre appareil : demande ton lien personnel à l\'animateur.' });
      let p;
      if (v && v.pid && (p = G.players.find(x => x.pid === v.pid))) {
        v.claimed = true; // lien libéré par l'animateur : on rattache le nouvel appareil au même joueur
      } else {
        const name = clean(v && v.label ? v.label : b.name);
        if (name.length < 2) return send(res, 400, { error: 'Écris ton prénom (2 lettres minimum).' });
        if ((G.limit && G.players.length >= G.limit) || G.players.length >= HARD_LIMIT) return send(res, 409, { error: 'La partie est complète.' });
        p = { token: crypto.randomBytes(16).toString('hex'), pid: ++G.seq, name, result: null, joinedAt: Date.now() };
        G.players.push(p); TOK.set(p.token, p);
        if (v) { v.claimed = true; v.pid = p.pid; p.inv = code; }
      }
      if (v) p.inv = code;
      saveSoon();
      const secure = String(req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
      return send(res, 200, { token: p.token, pid: p.pid, name: p.name },
        { 'Set-Cookie': 'nel_t=' + p.token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000' + secure });
    }
    if (req.method === 'POST' && P === '/api/play') {
      const b = await body(req); if (!b) return send(res, 413, { error: 'Trop volumineux.' });
      const p = TOK.get(b.token);
      if (!p) return send(res, 401, { error: 'Inscription introuvable, recharge la page.' });
      if (p.result) return send(res, 409, { error: 'Tu as déjà joué.' });
      const it = G.items.find(x => x.id === b.choice);
      if (!it) return send(res, 400, { error: 'Choix invalide, recharge la page.' });
      p.result = { choice: it.id, emoji: it.e, name: it.n, number: draw(), at: Date.now() };
      RECENT.push(p); if (RECENT.length > 60) RECENT.shift();
      if (mailOn()) { p.mail = 'waiting'; WAITING.add(p); } else p.mail = 'off';
      saveSoon();
      return send(res, 200, p.result);
    }
    if (req.method === 'POST' && P === '/api/ticket') {
      const b = await body(req, 2000000); if (!b) return send(res, 413, { error: 'Ticket trop volumineux.' });
      const p = TOK.get(b.token);
      if (!p || !p.result) return send(res, 401, { error: 'Inscription introuvable.' });
      if (p.mail !== 'waiting' || !mailOn()) return send(res, 200, { ok: true, mail: p.mail });
      let png = null;
      const m = String(b.png || '').match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
      if (m) { const buf = Buffer.from(m[1], 'base64'); if (buf.length > 8 && buf.slice(0, 4).toString('hex') === '89504e47') png = buf; }
      enqueue(p, png);
      return send(res, 200, { ok: true, mail: 'queued' });
    }

    /* ----- animateur ----- */
    if (req.method === 'POST' && P.startsWith('/api/admin/')) {
      const b = await body(req, 20000); if (!b) return send(res, 413, { error: 'Trop volumineux.' });
      const ok = pinCheck(b.pin);
      if (ok !== true) return send(res, ok === 'locked' ? 429 : 403, { error: ok === 'locked' ? 'Trop d\'essais, patiente 1 minute.' : 'Code animateur incorrect.' });

      if (P === '/api/admin/config') {
        return send(res, 200, {
          gameId: G.gameId, title: G.title, itemsText: G.items.map(i => i.e + ' ' + i.n).join('\n'),
          email: G.email, limit: G.limit, base: G.base, players: G.players.length, drawn: USED.size,
          invite: !!G.invite, mailKey: !!MAIL_KEY, counts: counts()
        });
      }
      if (P === '/api/admin/invites') {
        if (Array.isArray(b.names) || b.count) {
          const names = (Array.isArray(b.names) ? b.names : []).map(s => clean(s, 20)).filter(s => s.length >= 2).slice(0, 500);
          const anon = Math.max(0, Math.min(500, parseInt(b.count, 10) || 0));
          for (const label of names) { const v = { code: newCode(), label, claimed: false, pid: null, at: Date.now() }; G.invites.push(v); INV.set(v.code, v); }
          for (let i = 0; i < anon; i++) { const v = { code: newCode(), label: '', claimed: false, pid: null, at: Date.now() }; G.invites.push(v); INV.set(v.code, v); }
          if (names.length || anon) saveNow();
        }
        return send(res, 200, { invite: !!G.invite, invites: G.invites.map(v => {
          const pl = v.pid ? G.players.find(p => p.pid === v.pid) : null;
          return { code: v.code, label: v.label, claimed: v.claimed, player: pl ? pl.name : '', played: !!(pl && pl.result) };
        }) });
      }
      if (P === '/api/admin/release') {
        const v = INV.get(String(b.code || ''));
        if (!v) return send(res, 404, { error: 'Lien introuvable.' });
        v.claimed = false;
        const pl = v.pid ? G.players.find(p => p.pid === v.pid) : null;
        if (pl) { TOK.delete(pl.token); pl.token = crypto.randomBytes(16).toString('hex'); TOK.set(pl.token, pl); } // l'ancien appareil perd l'accès
        saveNow();
        return send(res, 200, { ok: true });
      }
      if (P === '/api/admin/invite-delete') {
        const v = INV.get(String(b.code || ''));
        if (!v) return send(res, 404, { error: 'Lien introuvable.' });
        if (v.claimed || v.pid) return send(res, 409, { error: 'Ce lien est déjà lié à un joueur : utilise « Libérer ».' });
        INV.delete(v.code); G.invites = G.invites.filter(x => x !== v); saveNow();
        return send(res, 200, { ok: true });
      }
      if (P === '/api/admin/save') {
        let items = G.items;
        if (b.items !== undefined) {
          items = parseItems(b.items);
          if (items.length < 2) return send(res, 400, { error: 'Mets au moins 2 choix (un par ligne).' });
        }
        const email = clean(b.email, 120);
        if (email && !validEmail(email)) return send(res, 400, { error: 'Adresse email invalide.' });
        const limit = Math.max(0, Math.min(HARD_LIMIT, parseInt(b.limit, 10) || 0));
        G.title = clean(b.title, 40) || 'Classe NEL'; G.items = items; G.email = email; G.limit = limit;
        if (b.invite !== undefined) G.invite = !!b.invite;
        if (b.newGame) {
          const base = Math.max(10, Math.min(1e9, parseInt(b.base, 10) || G.base));
          G = Object.assign(blank(G.gameId + 1), { base, limit, title: G.title, items, email, invite: G.invite });
          USED = new Set(); index();
        }
        saveNow();
        return send(res, 200, { ok: true, gameId: G.gameId });
      }
      if (P === '/api/admin/list') {
        return send(res, 200, { counts: counts(), players: G.players.map(p => ({ pid: p.pid, name: p.name, result: p.result, mail: p.mail || '', mailErr: p.mailErr || '' })) });
      }
      if (P === '/api/admin/resend') {
        if (!mailOn()) return send(res, 409, { error: 'Envoi d\'email non configuré (adresse ou clé manquante).' });
        let n = 0;
        for (const p of G.players) if (p.result && (p.mail === 'failed' || p.mail === 'off')) { enqueue(p, null); n++; }
        return send(res, 200, { ok: true, queued: n });
      }
    }
    send(res, 404, { error: 'Introuvable' });
  } catch (e) {
    send(res, 500, { error: 'Erreur serveur' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  NEL JACKPOT · Classe v3 — serveur lancé\n');
  console.log('  Sur cet appareil :  http://localhost:' + PORT);
  Object.values(os.networkInterfaces()).forEach(l => (l || []).forEach(i => { if (i.family === 'IPv4' && !i.internal) console.log('  Lien (même Wi-Fi) :  http://' + i.address + ':' + PORT); }));
  console.log('\n  Partie #' + G.gameId + ' · participants illimités' + (G.limit ? ' (limite ' + G.limit + ')' : '') + ' · ' + G.items.length + ' choix');
  console.log('  Emails : ' + (MAIL_KEY ? 'clé Resend détectée' : 'NON configurés (ajoute RESEND_API_KEY)') + (G.email ? ' · destinataire ' + G.email : ' · pas d\'adresse animateur'));
  if (PIN === '1234') console.log('  ⚠ Code animateur par défaut : change-le avec la variable PIN');
  console.log('');
});
