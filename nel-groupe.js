#!/usr/bin/env node
/*
  NEL JACKPOT · Classe v4 — jeu de groupe + boutique (serveur sans dépendance)

  Lancer :  node nel-groupe.js

  Variables d'environnement :
    PORT            port du serveur (Render le fournit tout seul)
    PIN             code animateur (change-le !)
    MAX             plage de numéros au départ (défaut 100) ; elle grandit toute seule
    RESEND_API_KEY  clé API Resend pour envoyer les tickets par email (facultatif)
    MAIL_FROM       expéditeur (défaut : NEL JACKPOT <onboarding@resend.dev>)

  Boutique de paiement (page /pay) :
    PAY_PROVIDER        fedapay  (ou « sim » pour un simulateur de test, jamais en vrai)
    FEDAPAY_SECRET_KEY  clé secrète FedaPay (sandbox ou live)
    FEDAPAY_ENV         sandbox (défaut) ou live
    PUBLIC_URL          adresse publique du site (défaut : détectée automatiquement)
*/
const http = require('http'), https = require('https'), fs = require('fs'), os = require('os'),
  path = require('path'), crypto = require('crypto');

const HTML = "<!doctype html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1\">\n<title>NEL JACKPOT · Classe</title>\n<style>\n:root{--gold:#d4af37;--gold2:#f6e27a;--line:#3a2f12;--txt:#f3ead0;--mut:#9b9072;--green:#2ecc71}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\nbody{margin:0;background:radial-gradient(ellipse at top,#241a04 0,#070707 60%) fixed;color:var(--txt);font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;min-height:100vh;padding-bottom:40px}\nbutton,input,textarea,select{font:inherit}\nheader{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--line);background:rgba(7,7,7,.9);gap:8px}\n.logo{font-weight:900;letter-spacing:2px;font-size:17px;background:linear-gradient(90deg,var(--gold),var(--gold2),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}\n.pill{border:1px solid var(--gold);border-radius:999px;padding:5px 12px;font-weight:800;color:var(--gold2);font-size:12px;background:#150f02;white-space:nowrap}\nmain{max-width:520px;margin:0 auto;padding:14px}\n.card{background:linear-gradient(180deg,#171309,#0f0f0f);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px}\nh2{margin:4px 0 10px;color:var(--gold2);font-size:20px}\n.muted{color:var(--mut);font-size:13px}\n.view{display:none}.view.on{display:block;animation:fade .25s ease}\n@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}\ninput,textarea,select{width:100%;padding:12px;border-radius:12px;border:1px solid var(--gold);background:#0d0b04;color:var(--gold2);font-size:16px;margin:6px 0;outline:none}\ninput.c{text-align:center;font-size:17px;padding:14px}\ntextarea{min-height:130px;resize:vertical;line-height:1.5}\nlabel{display:block;font-size:12px;color:var(--mut);margin-top:10px}\n.btn{background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1300;border:0;border-radius:12px;padding:14px 18px;font-weight:900;letter-spacing:.5px;box-shadow:0 4px 0 #7d6718,0 0 18px rgba(212,175,55,.3);width:100%;cursor:pointer}\n.btn:active{transform:translateY(3px);box-shadow:0 1px 0 #7d6718}\n.btn:disabled{filter:grayscale(1) brightness(.6);cursor:not-allowed}\n.btn.ghost{background:transparent;color:var(--gold2);border:1px solid var(--gold);box-shadow:none;margin-top:8px}\n.choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:8px;margin:12px 0}\n.ch{border-radius:14px;border:2px solid var(--line);background:#120e03;padding:10px 4px 8px;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;transition:.15s;font-size:34px;line-height:1;min-width:0}\n.ch small{font-size:11px;color:var(--mut);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}\n.ch.on{border-color:var(--gold2);background:radial-gradient(circle,#3a2d08,#120e03);box-shadow:0 0 16px rgba(246,226,122,.5);transform:translateY(-3px)}\n.ch.on small{color:var(--gold2)}\n.counter{display:flex;align-items:center;justify-content:center;gap:12px;font-size:clamp(34px,11vw,64px);font-weight:900;font-family:ui-monospace,Consolas,monospace;color:var(--gold2);background:#0a0802;border:3px solid var(--gold);border-radius:18px;padding:18px 10px;margin:10px 0;box-shadow:inset 0 0 30px rgba(0,0,0,.8),0 0 26px rgba(212,175,55,.25);min-height:116px;overflow:hidden;white-space:nowrap}\n.counter.land{animation:land .5s ease}\n@keyframes land{0%{transform:scale(.85)}60%{transform:scale(1.08)}100%{transform:scale(1)}}\n.counter.run{filter:blur(.6px)}\n.msg{min-height:22px;text-align:center;font-weight:800;margin:6px 0;color:var(--gold2)}\n.err{color:#e07a6e}\n.ok{color:var(--green)}\n.board div{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #1d1a10;font-size:14px;gap:8px}\n.board b{color:var(--gold2);white-space:nowrap}\n.board .nm{overflow:hidden;text-overflow:ellipsis}\ncanvas#ticket{width:100%;max-width:340px;display:block;margin:0 auto 12px;border-radius:12px;box-shadow:0 0 30px rgba(212,175,55,.3)}\n.disc{font-size:11px;color:var(--mut);text-align:center;margin-top:12px;line-height:1.4}\na.adm{color:var(--mut);font-size:12px;text-decoration:underline;cursor:pointer}\n.row{display:flex;gap:8px}.row>*{flex:1}\n.chk{display:flex;align-items:center;gap:10px;margin:12px 0;color:var(--txt);font-size:14px}\n.chk input{width:22px;height:22px;margin:0;accent-color:var(--gold)}\n.mini{background:transparent;color:var(--gold2);border:1px solid var(--gold);border-radius:8px;padding:5px 8px;font-size:12px;cursor:pointer;white-space:nowrap}\n.board .iv{flex-wrap:wrap;align-items:center}\n.board .iv .ac{display:flex;gap:6px;flex-wrap:wrap}\n.note{background:#1a1300;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12px;color:var(--mut);margin-top:10px;line-height:1.4}\n#toast{position:fixed;top:62px;left:50%;transform:translateX(-50%) translateY(-20px);background:#1a1300;border:1px solid var(--gold);color:var(--gold2);padding:10px 16px;border-radius:12px;font-weight:700;opacity:0;pointer-events:none;transition:.3s;z-index:60;max-width:90%;text-align:center}\n#toast.on{opacity:1;transform:translateX(-50%)}\n</style>\n</head>\n<body>\n<header><div class=\"logo\">NEL JACKPOT · CLASSE</div><div class=\"pill\" id=\"stat\">…</div></header>\n<main>\n\n<section class=\"view\" id=\"v-join\">\n  <div class=\"card\" style=\"text-align:center\">\n    <h2 id=\"joinTitle\">Bienvenue dans la classe</h2>\n    <div id=\"joinForm\">\n      <div class=\"muted\" id=\"joinSub\">Inscris-toi pour recevoir ton numéro de participation.</div>\n      <input class=\"c\" id=\"nameIn\" maxlength=\"20\" placeholder=\"Ton prénom ou pseudo\" autocomplete=\"off\">\n      <button class=\"btn\" id=\"joinBtn\">M'INSCRIRE</button>\n      <div class=\"msg err\" id=\"joinErr\"></div>\n      <div class=\"note\" id=\"mailNote\" style=\"display:none\">✉️ Ton ticket sera aussi transmis à l'animateur de la partie.</div>\n    </div>\n    <div id=\"joinBlocked\" style=\"display:none\">\n      <div style=\"font-size:48px;margin:6px 0\">🔒</div>\n      <div id=\"blockedMsg\" style=\"font-weight:700;line-height:1.5\"></div>\n      <a class=\"btn\" id=\"signupBtn\" href=\"/pay\" style=\"display:none;text-decoration:none;text-align:center\">JE M'INSCRIS ET JE REÇOIS MON LIEN</a>\n      <div class=\"note\" id=\"blockedNote\">Les liens sont personnels : chacun ne marche que pour une seule personne. Va voir l'animateur pour recevoir le tien.</div>\n    </div>\n  </div>\n</section>\n\n<section class=\"view\" id=\"v-play\">\n  <div class=\"card\" style=\"text-align:center\">\n    <div class=\"muted\">Ton numéro de participation</div>\n    <div style=\"font-size:34px;font-weight:900;color:var(--gold2);letter-spacing:2px\" id=\"myPid\"></div>\n    <div class=\"muted\" id=\"myName\"></div>\n  </div>\n  <div class=\"card\">\n    <h2 style=\"text-align:center\" id=\"playTitle\">Fais ton choix</h2>\n    <div class=\"choices\" id=\"choices\"></div>\n    <div class=\"counter\" id=\"counter\">🎲 ??</div>\n    <div class=\"msg\" id=\"playMsg\"></div>\n    <button class=\"btn\" id=\"startBtn\" disabled>DÉMARRER</button>\n  </div>\n</section>\n\n<section class=\"view\" id=\"v-result\">\n  <div class=\"card\">\n    <h2 style=\"text-align:center\">Ton résultat</h2>\n    <div class=\"counter land\" id=\"resCounter\"></div>\n    <canvas id=\"ticket\" width=\"680\" height=\"1000\"></canvas>\n    <button class=\"btn\" id=\"saveBtn\">ENREGISTRER LE TICKET</button>\n    <button class=\"btn ghost\" id=\"shareBtn\" style=\"display:none\">PARTAGER</button>\n    <div class=\"msg ok\" id=\"sentMsg\"></div>\n  </div>\n</section>\n\n<div class=\"card\" id=\"boardCard\" style=\"display:none\">\n  <h2 style=\"font-size:16px\">Derniers résultats du groupe</h2>\n  <div class=\"board\" id=\"board\"></div>\n</div>\n\n<div class=\"card\" id=\"admCard\" style=\"display:none\">\n  <h2 style=\"font-size:16px\">Animateur</h2>\n  <input id=\"pin\" type=\"password\" placeholder=\"Code animateur\" autocomplete=\"off\">\n  <button class=\"btn\" id=\"admUnlock\">DÉVERROUILLER</button>\n  <div id=\"admForm\" style=\"display:none\">\n    <div class=\"note\" id=\"admInfo\"></div>\n    <label>Titre de la partie</label>\n    <input id=\"admTitle\" maxlength=\"40\" placeholder=\"Ex. Classe de L1 · Fruits\">\n    <label>Modèle de choix</label>\n    <select id=\"admPreset\">\n      <option value=\"\">— Choisir un modèle —</option>\n      <option value=\"fruits\">Fruits</option>\n      <option value=\"animaux\">Animaux</option>\n      <option value=\"sports\">Sports</option>\n      <option value=\"couleurs\">Couleurs</option>\n      <option value=\"boissons\">Boissons</option>\n    </select>\n    <label>Les choix (un par ligne : emoji puis nom, 2 à 12 choix)</label>\n    <textarea id=\"admItems\" spellcheck=\"false\"></textarea>\n    <label>Email de l'animateur (reçoit tous les tickets)</label>\n    <input id=\"admEmail\" type=\"email\" inputmode=\"email\" placeholder=\"animateur@exemple.com\">\n    <div class=\"row\">\n      <div><label>Limite de participants (0 = illimité)</label><input id=\"admLimit\" type=\"number\" min=\"0\" placeholder=\"0\"></div>\n      <div><label>Numéros de 1 à… (au départ)</label><input id=\"admBase\" type=\"number\" min=\"10\" placeholder=\"100\"></div>\n    </div>\n    <label class=\"chk\"><input type=\"checkbox\" id=\"admInvite\"> Partie sur invitation (liens personnels : chaque lien ne marche que pour une personne)</label>\n    <label class=\"chk\"><input type=\"checkbox\" id=\"admNew\"> Nouvelle partie (efface les inscrits, les résultats et les liens)</label>\n    <h2 style=\"font-size:15px;margin-top:18px\">Boutique (paiement)</h2>\n    <div class=\"note\" id=\"shopInfo\"></div>\n    <label>Prix de l'accès (FCFA)</label>\n    <input id=\"shopPrice\" type=\"number\" min=\"0\" placeholder=\"500\">\n    <label class=\"chk\"><input type=\"checkbox\" id=\"shopOpen\"> Ventes ouvertes (active aussi la partie sur invitation)</label>\n    <label class=\"chk\"><input type=\"checkbox\" id=\"freeOpen\"> Inscription libre : chaque personne s'inscrit sur le lien général et reçoit toute seule son lien personnel (gratuit, sans paiement)</label>\n    <label class=\"chk\"><input type=\"checkbox\" id=\"approveOpen\"> Inscription sur validation : chaque demande arrive chez toi, tu acceptes ou tu refuses, et le lien se crée chez le joueur dès que tu acceptes</label>\n    <div id=\"reqBox\" style=\"display:none;margin-top:10px\"></div>\n    <button class=\"btn\" id=\"admSave\">ENREGISTRER</button>\n    <button class=\"btn ghost\" id=\"shopCopy\">COPIER LE LIEN DE LA BOUTIQUE</button>\n    <div class=\"board\" id=\"shopList\" style=\"margin-top:8px\"></div>\n    <h2 style=\"font-size:15px;margin-top:18px\">Liens personnels</h2>\n    <div class=\"muted\">Crée un lien par personne et envoie-le-lui. Le premier appareil qui l'ouvre le verrouille : copié à quelqu'un d'autre, il ne marche plus.</div>\n    <label>Noms (un par ligne) : un lien par nom, le nom est verrouillé sur le ticket</label>\n    <textarea id=\"invNames\" spellcheck=\"false\" style=\"min-height:90px\" placeholder=\"Kossi&#10;Awa&#10;Ibrahim\"></textarea>\n    <label>…ou nombre de liens anonymes (le joueur écrit son prénom)</label>\n    <input id=\"invCount\" type=\"number\" min=\"0\" max=\"500\" placeholder=\"0\">\n    <button class=\"btn\" id=\"invCreate\">CRÉER LES LIENS</button>\n    <button class=\"btn ghost\" id=\"invCopyAll\">COPIER TOUS LES LIENS</button>\n    <div class=\"board\" id=\"invList\" style=\"margin-top:8px\"></div>\n    <button class=\"btn ghost\" id=\"admListBtn\">VOIR LES INSCRITS</button>\n    <button class=\"btn ghost\" id=\"admCsv\">TÉLÉCHARGER LA LISTE (CSV)</button>\n    <button class=\"btn ghost\" id=\"admResend\">RENVOYER LES EMAILS NON ENVOYÉS</button>\n    <div class=\"msg\" id=\"admMsg\"></div>\n    <div class=\"board\" id=\"admList\" style=\"margin-top:8px\"></div>\n  </div>\n</div>\n<div style=\"text-align:center\"><a class=\"adm\" id=\"admLink\">Animateur</a></div>\n<div class=\"disc\">Cette application n'attribue aucun gain en argent : elle donne seulement un numéro et un ticket.</div>\n</main>\n<div id=\"toast\"></div>\n\n<script>\nconst $=s=>document.querySelector(s);\nconst esc=t=>String(t).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\nconst pidTxt=n=>'P-'+String(n).padStart(3,'0');\nconst fmt=n=>Number(n).toLocaleString('fr-FR');\nlet ME=null,ST=null,sel=null,playing=false,lastView='',itemsKey='',uploaded='';\nlet INV='';try{INV=(new URLSearchParams(location.search).get('i')||'').replace(/[^A-Za-z0-9]/g,'').slice(0,20)}catch(e){}\ntry{ME=JSON.parse(localStorage.getItem('nelg'))}catch(e){}\nfunction saveMe(){try{if(ME)localStorage.setItem('nelg',JSON.stringify(ME));else localStorage.removeItem('nelg')}catch(e){}}\nlet tt;function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('on'),2800)}\n\n/* audio */\nlet AC=null;\nfunction tone(f,d=.06,v=.05){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.02)}catch(e){}}\nfunction fanfare(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.2,.08),i*110))}\n\nasync function api(path,body){\n  const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);\n  const j=await r.json().catch(()=>({}));\n  if(!r.ok)throw new Error(j.error||'Erreur réseau');\n  return j;\n}\nfunction show(v){\n  document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));\n  lastView=v;\n}\n\n/* ---------- état ---------- */\nasync function poll(){\n  if(playing)return;\n  try{\n    ST=await api('/api/state?token='+encodeURIComponent(ME?ME.token:'')+'&i='+encodeURIComponent(INV));\n    if(ME&&!ST.me){ME=null;saveMe()}\n    if(!ME&&ST.me){ME={token:ST.me.token,name:ST.me.name,pid:ST.me.pid};saveMe()}\n    render();\n  }catch(e){$('#stat').textContent='hors ligne'}\n}\nfunction render(){\n  $('#stat').textContent=fmt(ST.players)+' inscrit'+(ST.players>1?'s':'')+' · '+fmt(ST.drawn)+' tiré'+(ST.drawn>1?'s':'');\n  $('#mailNote').style.display=ST.mail?'block':'none';\n  $('#joinTitle').textContent=ST.title||'Bienvenue dans la classe';\n  if(!ST.me){\n    if(lastView!=='join')show('join');\n    const iv=ST.invite||{status:'none'};\n    let blocked='';\n    if(iv.status==='taken')blocked='Ce lien a déjà été utilisé sur un autre appareil.';\n    else if(iv.status==='invalid')blocked='Ce lien n\\'est pas valide.';\n    else if(ST.inviteMode&&iv.status==='none')blocked='Cette partie est sur invitation : il te faut ton lien personnel.';\n    $('#joinBlocked').style.display=blocked?'block':'none';$('#joinForm').style.display=blocked?'none':'block';\n    if(blocked){\n      $('#blockedMsg').textContent=blocked;\n      const canSign=!!ST.signup&&iv.status==='none';\n      $('#signupBtn').style.display=canSign?'block':'none';\n      if(canSign){\n        $('#blockedMsg').textContent=ST.approve?'Écris ton nom et demande ton lien. L\\'animateur l\\'acceptera et tu pourras jouer.':'Inscris-toi pour recevoir ton lien personnel et entrer dans le jeu.';\n        $('#signupBtn').textContent=ST.approve?'JE DEMANDE MON LIEN':'JE M\\'INSCRIS ET JE REÇOIS MON LIEN';\n        $('#blockedNote').style.display='none';\n      }\n      else $('#blockedNote').style.display='block';\n    }\n    else if(iv.status==='free'&&iv.label){\n      const n=$('#nameIn');if(n.value!==iv.label)n.value=iv.label;n.readOnly=true;\n      $('#joinSub').textContent='Bonjour '+iv.label+' ! Appuie pour entrer dans la partie.';$('#joinBtn').textContent='ENTRER';\n    }\n  }\n  else if(ST.me.result){\n    if(lastView!=='result'){show('result');drawTicket();$('#resCounter').textContent=ST.me.result.emoji+' '+ST.me.result.number;uploadTicket()}\n  }else{\n    const key=JSON.stringify(ST.items);\n    if(lastView!=='play'){show('play');buildChoices();itemsKey=key}\n    else if(key!==itemsKey){buildChoices();itemsKey=key}\n    $('#playTitle').textContent=ST.title||'Fais ton choix';\n    $('#myPid').textContent=pidTxt(ST.me.pid);$('#myName').textContent=ST.me.name;\n  }\n  const b=$('#board');\n  if(ST.board.length){\n    $('#boardCard').style.display='block';\n    b.innerHTML=ST.board.map(x=>`<div><span class=\"nm\">${esc(x.name)} <span class=\"muted\">${pidTxt(x.pid)}</span></span><b>${esc(x.emoji)} ${x.number}</b></div>`).join('');\n  }else $('#boardCard').style.display='none';\n}\n\n/* ---------- inscription ---------- */\n$('#joinBtn').onclick=async()=>{\n  const n=$('#nameIn').value.trim();$('#joinErr').textContent='';\n  if(n.length<2){$('#joinErr').textContent='Écris ton prénom (2 lettres minimum).';return}\n  try{const j=await api('/api/join',{name:n,invite:INV});ME={token:j.token,name:j.name,pid:j.pid};saveMe();tone(660);await poll()}\n  catch(e){$('#joinErr').textContent=e.message}\n};\n$('#nameIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('#joinBtn').click()});\n\n/* ---------- choix + tirage ---------- */\nfunction buildChoices(){\n  sel=null;$('#startBtn').disabled=true;$('#counter').textContent='🎲 ??';$('#playMsg').textContent='';\n  $('#choices').innerHTML=ST.items.map(c=>`<div class=\"ch\" data-k=\"${esc(c.id)}\">${esc(c.e)}<small>${esc(c.n)}</small></div>`).join('');\n  document.querySelectorAll('.ch').forEach(el=>el.onclick=()=>{\n    if(playing)return;sel=el.dataset.k;tone(700,.05);\n    document.querySelectorAll('.ch').forEach(x=>x.classList.toggle('on',x===el));\n    const it=ST.items.find(x=>x.id===sel);\n    $('#startBtn').disabled=false;$('#counter').textContent=(it?it.e:'')+' ??';\n  });\n}\n$('#startBtn').onclick=async()=>{\n  if(!sel||playing)return;\n  playing=true;$('#startBtn').disabled=true;$('#playMsg').className='msg';$('#playMsg').textContent='';\n  let res;\n  try{res=await api('/api/play',{token:ME.token,choice:sel})}\n  catch(e){playing=false;$('#startBtn').disabled=false;$('#playMsg').className='msg err';$('#playMsg').textContent=e.message;poll();return}\n  const c=$('#counter'),e=res.emoji,mx=ST?ST.range:100;\n  c.classList.add('run');\n  const t0=performance.now(),dur=3600;let last=0,gap=50;\n  (function step(now){\n    const el=now-t0;\n    if(el>=dur){\n      c.classList.remove('run');c.textContent=e+' '+res.number;c.classList.remove('land');void c.offsetWidth;c.classList.add('land');\n      fanfare();\n      setTimeout(async()=>{playing=false;await poll();toast('Ticket prêt !')},1300);\n      return;\n    }\n    if(now-last>=gap){last=now;c.textContent=e+' '+(1+Math.floor(Math.random()*mx));tone(500+Math.random()*500,.03,.03);gap=45+(el/dur)*220}\n    requestAnimationFrame(step);\n  })(t0);\n};\n\n/* ---------- ticket ---------- */\nfunction rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}\nfunction drawTicket(){\n  if(!ST||!ST.me||!ST.me.result)return;\n  const cv=$('#ticket'),c=cv.getContext('2d'),W=680,H=1000,me=ST.me,r=me.result;\n  c.clearRect(0,0,W,H);\n  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1d1504');g.addColorStop(1,'#0a0a0a');\n  rr(c,10,10,W-20,H-20,34);c.fillStyle=g;c.fill();c.lineWidth=6;c.strokeStyle='#d4af37';c.stroke();\n  c.setLineDash([14,10]);c.lineWidth=2;c.strokeStyle='rgba(246,226,122,.5)';rr(c,34,34,W-68,H-68,22);c.stroke();c.setLineDash([]);\n  c.textAlign='center';\n  const lg=c.createLinearGradient(100,0,580,0);lg.addColorStop(0,'#d4af37');lg.addColorStop(.5,'#f6e27a');lg.addColorStop(1,'#d4af37');\n  c.fillStyle=lg;c.font='900 54px system-ui,sans-serif';c.fillText('NEL JACKPOT',W/2,120);\n  c.fillStyle='#9b9072';c.font='700 24px system-ui,sans-serif';c.fillText((ST.title||'TICKET DE PARTICIPATION').toUpperCase(),W/2,160,540);\n  c.fillStyle='#d4af37';c.fillRect(90,190,W-180,3);\n  c.fillStyle='#9b9072';c.font='600 24px system-ui,sans-serif';c.fillText('JOUEUR',W/2,250);\n  c.fillStyle='#f3ead0';c.font='800 46px system-ui,sans-serif';c.fillText(me.name,W/2,305,520);\n  c.fillStyle='#9b9072';c.font='600 24px system-ui,sans-serif';c.fillText('N° DE PARTICIPATION',W/2,370);\n  c.fillStyle='#f6e27a';c.font='900 56px ui-monospace,Consolas,monospace';c.fillText(pidTxt(me.pid),W/2,435);\n  c.fillStyle='#070707';c.beginPath();c.arc(10,490,24,0,Math.PI*2);c.fill();c.beginPath();c.arc(W-10,490,24,0,Math.PI*2);c.fill();\n  c.setLineDash([12,10]);c.strokeStyle='rgba(212,175,55,.6)';c.lineWidth=3;c.beginPath();c.moveTo(50,490);c.lineTo(W-50,490);c.stroke();c.setLineDash([]);\n  c.fillStyle='#9b9072';c.font='600 24px system-ui,sans-serif';c.fillText('MON CHOIX : '+String(r.name).toUpperCase(),W/2,550,540);\n  rr(c,70,575,W-140,190,24);c.fillStyle='#0a0802';c.fill();c.lineWidth=4;c.strokeStyle='#d4af37';c.stroke();\n  const txt=r.emoji+' '+r.number,fs=txt.length>9?84:txt.length>7?100:120;\n  c.fillStyle='#f6e27a';c.font='900 '+fs+'px system-ui,\"Apple Color Emoji\",\"Segoe UI Emoji\",sans-serif';\n  c.fillText(txt,W/2,575+95+fs*0.35,W-180);\n  let seed=(me.pid*977+r.number*131+ST.gameId*17)>>>0;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};\n  c.fillStyle='#f3ead0';let x=110;while(x<W-110){const w=2+Math.floor(rnd()*6);c.fillRect(x,810,w,70);x+=w+2+Math.floor(rnd()*4)}\n  c.fillStyle='#9b9072';c.font='600 22px ui-monospace,Consolas,monospace';\n  c.fillText('PARTIE #'+ST.gameId+'  ·  '+pidTxt(me.pid)+'-'+r.number,W/2,915,560);\n  const d=new Date(r.at||Date.now());\n  c.font='600 22px system-ui,sans-serif';c.fillText(d.toLocaleDateString('fr-FR')+' · '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),W/2,950);\n}\nasync function uploadTicket(){\n  if(!ST||!ST.mail||!ST.me||!ST.me.result)return;\n  const k=ST.gameId+':'+ST.me.pid;if(uploaded===k)return;uploaded=k;\n  try{await api('/api/ticket',{token:ME.token,png:$('#ticket').toDataURL('image/png')});$('#sentMsg').textContent='✉️ Ticket transmis à l\\'animateur'}catch(e){}\n}\nfunction ticketBlob(){return new Promise(res=>$('#ticket').toBlob(res,'image/png'))}\n$('#saveBtn').onclick=async()=>{\n  const b=await ticketBlob(),a=document.createElement('a');\n  a.href=URL.createObjectURL(b);a.download='ticket-nel-'+pidTxt(ST.me.pid)+'.png';document.body.appendChild(a);a.click();a.remove();\n  setTimeout(()=>URL.revokeObjectURL(a.href),3000);toast('Ticket enregistré');\n};\nif(navigator.canShare&&navigator.share)$('#shareBtn').style.display='block';\n$('#shareBtn').onclick=async()=>{\n  try{const b=await ticketBlob(),f=new File([b],'ticket-nel.png',{type:'image/png'});\n    if(navigator.canShare({files:[f]}))await navigator.share({files:[f],title:'Mon ticket NEL JACKPOT'});else toast('Partage indisponible, utilise Enregistrer.')}catch(e){}\n};\n\n/* ---------- animateur ---------- */\nconst PRESETS={\n  fruits:['🍎 Pomme','🍌 Banane','🍇 Raisin','🍊 Orange','🍓 Fraise'],\n  animaux:['🦁 Lion','🐘 Éléphant','🐢 Tortue','🦅 Aigle','🐬 Dauphin','🐍 Serpent'],\n  sports:['⚽ Football','🏀 Basket','🎾 Tennis','🏐 Volley','🥊 Boxe'],\n  couleurs:['🔴 Rouge','🔵 Bleu','🟢 Vert','🟡 Jaune','🟣 Violet'],\n  boissons:['🥤 Soda','🧃 Jus','💧 Eau','☕ Café','🥛 Lait']\n};\nconst PN={fruits:'Fruits',animaux:'Animaux',sports:'Sports',couleurs:'Couleurs',boissons:'Boissons'};\nconst pinV=()=>$('#pin').value;\nfunction admMsg(t,ok){const m=$('#admMsg');m.className='msg '+(ok?'ok':'err');m.textContent=t}\nfunction counts(c){\n  const p=[];if(c.sent)p.push(c.sent+' envoyé'+(c.sent>1?'s':''));if(c.queued+c.waiting)p.push((c.queued+c.waiting)+' en cours');if(c.failed)p.push(c.failed+' en échec');if(c.off)p.push(c.off+' non envoyé'+(c.off>1?'s':''));\n  return p.length?p.join(' · '):'aucun ticket pour le moment';\n}\n$('#admLink').onclick=()=>{const c=$('#admCard');c.style.display=c.style.display==='none'?'block':'none'};\n$('#admPreset').onchange=e=>{const k=e.target.value;if(!k)return;$('#admItems').value=PRESETS[k].join('\\n');if(!$('#admTitle').value.trim()||/^Partie /.test($('#admTitle').value))$('#admTitle').value='Partie '+PN[k]};\n$('#admUnlock').onclick=async()=>{\n  try{\n    const j=await api('/api/admin/config',{pin:pinV()});\n    $('#admTitle').value=j.title;$('#admItems').value=j.itemsText;$('#admEmail').value=j.email;\n    $('#admLimit').value=j.limit||'';$('#admBase').value=j.base;$('#admNew').checked=false;$('#admInvite').checked=!!j.invite;\n    $('#admForm').style.display='block';$('#admUnlock').style.display='none';$('#admMsg').textContent='';loadInvites();loadShop(true);\n    $('#admInfo').innerHTML='Partie #'+j.gameId+' · '+fmt(j.players)+' inscrit(s) · '+fmt(j.drawn)+' numéro(s) tiré(s)<br>Emails : '+counts(j.counts)+(j.mailKey?'':'<br>⚠️ Envoi d\\'email non configuré sur le serveur (clé RESEND_API_KEY manquante).');\n  }catch(e){toast(e.message)}\n};\n$('#admSave').onclick=async()=>{\n  const nw=$('#admNew').checked;\n  if(nw&&!confirm('Lancer une nouvelle partie ? Les inscrits et résultats actuels seront effacés.'))return;\n  try{\n    await api('/api/admin/save',{pin:pinV(),title:$('#admTitle').value,items:$('#admItems').value.split('\\n'),email:$('#admEmail').value.trim(),limit:$('#admLimit').value,base:$('#admBase').value,invite:$('#admInvite').checked,price:$('#shopPrice').value,salesOpen:$('#shopOpen').checked,freeOpen:$('#freeOpen').checked,approveOpen:$('#approveOpen').checked,newGame:nw});\n    admMsg(nw?'Nouvelle partie lancée.':'Réglages enregistrés.',true);\n    if(nw){ME=null;saveMe();lastView='';uploaded='';$('#admList').innerHTML='';$('#invList').innerHTML='';$('#admNew').checked=false}\n    poll();loadInvites();loadShop(true);\n  }catch(e){admMsg(e.message,false)}\n};\nconst MS={sent:'envoyé',queued:'en cours',waiting:'en cours',failed:'échec',off:'—','':'—'};\n$('#admListBtn').onclick=async()=>{\n  try{const j=await api('/api/admin/list',{pin:pinV()});\n    $('#admMsg').className='msg';$('#admMsg').textContent='Emails : '+counts(j.counts);\n    $('#admList').innerHTML=j.players.length?j.players.map(p=>`<div><span class=\"nm\">${esc(p.name)} <span class=\"muted\">${pidTxt(p.pid)} · ${MS[p.mail]||'—'}</span></span><b>${p.result?esc(p.result.emoji)+' '+p.result.number:'…'}</b></div>`).join(''):'<span class=\"muted\">Personne pour le moment.</span>'}\n  catch(e){admMsg(e.message,false)}\n};\n$('#admCsv').onclick=async()=>{\n  try{const j=await api('/api/admin/list',{pin:pinV()});\n    const q=v=>'\"'+String(v).replace(/\"/g,'\"\"')+'\"';\n    const rows=[['Participation','Nom','Choix','Numéro','Email']].concat(j.players.map(p=>[pidTxt(p.pid),p.name,p.result?p.result.emoji+' '+p.result.name:'',p.result?p.result.number:'',MS[p.mail]||'']));\n    const blob=new Blob(['﻿'+rows.map(r=>r.map(q).join(';')).join('\\n')],{type:'text/csv;charset=utf-8'});\n    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='resultats-nel.csv';document.body.appendChild(a);a.click();a.remove();\n    setTimeout(()=>URL.revokeObjectURL(a.href),3000);admMsg('Liste téléchargée.',true)}\n  catch(e){admMsg(e.message,false)}\n};\n$('#admResend').onclick=async()=>{\n  try{const j=await api('/api/admin/resend',{pin:pinV()});admMsg(j.queued+' email(s) remis en envoi.',true)}\n  catch(e){admMsg(e.message,false)}\n};\n\n/* ---------- liens personnels ---------- */\nlet INVS=[];\nconst linkOf=code=>location.href.split(/[?#]/)[0]+'?i='+code;\nasync function copyText(t,msg){\n  try{await navigator.clipboard.writeText(t);toast(msg||'Copié')}\n  catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast(msg||'Copié')}catch(x){toast('Copie impossible')}a.remove()}\n}\nfunction renderInvites(){\n  $('#invList').innerHTML=INVS.length?INVS.map((v,i)=>{\n    const st=v.claimed?(v.played?'a joué':'utilisé'):'libre';\n    const who=v.label||v.player||'Lien anonyme';\n    const ac=['<button class=\"mini\" data-a=\"copy\" data-i=\"'+i+'\">Copier</button>','<button class=\"mini\" data-a=\"wa\" data-i=\"'+i+'\">WhatsApp</button>'];\n    if(v.claimed||v.player)ac.push('<button class=\"mini\" data-a=\"rel\" data-i=\"'+i+'\">Libérer</button>');else ac.push('<button class=\"mini\" data-a=\"del\" data-i=\"'+i+'\">✕</button>');\n    return '<div class=\"iv\"><span class=\"nm\">'+esc(who)+(v.label&&v.player&&v.player!==v.label?' · '+esc(v.player):'')+' <span class=\"muted\">· '+st+'</span></span><span class=\"ac\">'+ac.join('')+'</span></div>';\n  }).join(''):'<span class=\"muted\">Aucun lien créé pour le moment.</span>';\n}\nasync function loadInvites(){try{const j=await api('/api/admin/invites',{pin:pinV()});INVS=j.invites;renderInvites()}catch(e){}}\nsetInterval(()=>{if($('#admForm').style.display==='block'){loadInvites();loadShop(false)}},4000);\n\n/* ---------- boutique ---------- */\nasync function loadShop(fill){\n  try{\n    const j=await api('/api/admin/shop',{pin:pinV()});\n    if(fill){$('#shopPrice').value=j.price||'';$('#shopOpen').checked=!!j.open;$('#freeOpen').checked=!!j.free;$('#approveOpen').checked=!!j.approve}\n    renderRequests(j.requests||[]);\n    const c=j.counts,gate=j.testMode?'<b>SIMULATEUR DE TEST</b> (aucun vrai paiement)':j.provider==='fedapay'?(j.keyOk?'FedaPay ('+(j.env==='live'?'réel':'sandbox : essais sans vrai argent')+')':'⚠️ FedaPay sans clé secrète'):'⚠️ Passerelle de paiement non configurée sur le serveur';\n    $('#shopInfo').innerHTML=(j.approve?'<b>Inscription sur validation ouverte</b> : accepte ou refuse chaque demande.<br>Acceptées : '+c.paid+' · en attente : '+c.waiting+' · refusées : '+c.refused:j.free?'<b>Inscription libre ouverte</b> : les gens s\\'inscrivent sur le lien général et reçoivent leur lien personnel.<br>Inscrits par ce moyen : '+c.paid:'Passerelle : '+gate+'<br>Ventes : '+c.paid+' payée(s) · '+c.pending+' en attente · '+c.failed+' échouée(s) · total '+fmt(c.revenue)+' FCFA');\n    $('#shopList').innerHTML=j.orders.length?j.orders.map(o=>'<div><span class=\"nm\">'+esc(o.name)+' <span class=\"muted\">· '+esc(o.status)+' · '+new Date(o.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'</span></span><b>'+fmt(o.amount)+'</b></div>').join(''):'<span class=\"muted\">Aucune vente pour le moment.</span>';\n  }catch(e){}\n}\n/* demandes d'accès : notification + accepter / refuser */\nlet lastReq=-1;\nfunction renderRequests(list){\n  const box=$('#reqBox');\n  if(list.length>lastReq&&lastReq>=0){try{tone(880);if(navigator.vibrate)navigator.vibrate(200)}catch(e){}}\n  lastReq=list.length;\n  document.title=(list.length?'('+list.length+') ':'')+document.title.replace(/^\\(\\d+\\)\\s*/,'');\n  if(!list.length){box.style.display='none';box.innerHTML='';return}\n  box.style.display='block';\n  box.innerHTML='<div style=\"font-weight:800;color:var(--gold2);margin-bottom:6px\">🔔 '+list.length+' demande'+(list.length>1?'s':'')+' en attente</div>'+\n    list.map(r=>'<div style=\"border:1px solid var(--gold);border-radius:12px;padding:10px;margin-bottom:8px;background:#1a1300\"><div style=\"font-weight:800\">'+esc(r.name)+(r.phone?' <span class=\"muted\">· '+esc(r.phone)+'</span>':'')+'</div>'+\n    '<div style=\"display:flex;gap:8px;margin-top:8px\"><button class=\"btn\" style=\"margin:0;flex:1\" data-dec=\"1\" data-ref=\"'+esc(r.ref)+'\">ACCEPTER</button><button class=\"btn ghost\" style=\"margin:0;flex:1\" data-dec=\"0\" data-ref=\"'+esc(r.ref)+'\">REFUSER</button></div></div>').join('');\n  box.querySelectorAll('button[data-dec]').forEach(b=>b.onclick=async()=>{\n    b.disabled=true;\n    try{await api('/api/admin/decide',{pin:pinV(),ref:b.dataset.ref,accept:b.dataset.dec==='1'})}catch(e){toast&&toast(e.message)}\n    loadShop(false);\n  });\n}\n['shopOpen','freeOpen','approveOpen'].forEach(id=>{$('#'+id).addEventListener('change',()=>{if($('#'+id).checked)['shopOpen','freeOpen','approveOpen'].forEach(o=>{if(o!==id)$('#'+o).checked=false})})});\n$('#shopCopy').onclick=()=>copyText(location.origin+'/pay','Lien de la boutique copié');\n$('#invCreate').onclick=async()=>{\n  const names=$('#invNames').value.split('\\n').map(s=>s.trim()).filter(Boolean),count=parseInt($('#invCount').value,10)||0;\n  if(!names.length&&!count){admMsg('Écris des noms ou un nombre de liens.',false);return}\n  try{const j=await api('/api/admin/invites',{pin:pinV(),names,count});INVS=j.invites;renderInvites();$('#invNames').value='';$('#invCount').value='';admMsg('Liens créés. Envoie chaque lien à la bonne personne.',true)}\n  catch(e){admMsg(e.message,false)}\n};\n$('#invList').onclick=async e=>{\n  const b=e.target.closest('button');if(!b)return;const v=INVS[+b.dataset.i];if(!v)return;\n  if(b.dataset.a==='copy')copyText(linkOf(v.code),'Lien copié');\n  else if(b.dataset.a==='wa'){const t=(v.label?'Bonjour '+v.label+', v':'V')+'oici ton lien personnel pour NEL JACKPOT : '+linkOf(v.code)+'\\n(Ce lien ne marche que pour toi, ne le transfère pas.)';window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank')}\n  else if(b.dataset.a==='rel'){\n    if(!confirm('Libérer ce lien ? L\\'appareil actuel perd l\\'accès, et le prochain appareil qui ouvre le lien retrouve ce joueur et son résultat.'))return;\n    try{await api('/api/admin/release',{pin:pinV(),code:v.code});loadInvites();admMsg('Lien libéré.',true)}catch(x){admMsg(x.message,false)}\n  }else if(b.dataset.a==='del'){\n    try{await api('/api/admin/invite-delete',{pin:pinV(),code:v.code});loadInvites()}catch(x){admMsg(x.message,false)}\n  }\n};\n$('#invCopyAll').onclick=()=>{\n  if(!INVS.length){admMsg('Aucun lien à copier.',false);return}\n  copyText(INVS.map((v,i)=>(v.label||'Lien '+(i+1))+' : '+linkOf(v.code)).join('\\n'),INVS.length+' liens copiés');\n};\n\npoll();setInterval(poll,3000);\n</script>\n</body>\n</html>\n";
const SHOP_HTML = "<!doctype html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1\">\n<title>NEL JACKPOT · Boutique</title>\n<style>\n:root{--gold:#d4af37;--gold2:#f6e27a;--line:#3a2f12;--txt:#f3ead0;--mut:#9b9072;--green:#2ecc71;--red:#e07a6e}\n*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}\nbody{margin:0;background:radial-gradient(ellipse at top,#241a04 0,#070707 60%) fixed;color:var(--txt);font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;min-height:100vh;padding-bottom:40px}\nbutton,input{font:inherit}\nheader{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--line);background:rgba(7,7,7,.9)}\n.logo{font-weight:900;letter-spacing:2px;font-size:17px;background:linear-gradient(90deg,var(--gold),var(--gold2),var(--gold));-webkit-background-clip:text;background-clip:text;color:transparent}\n.pill{border:1px solid var(--gold);border-radius:999px;padding:5px 12px;font-weight:800;color:var(--gold2);font-size:12px;background:#150f02}\nmain{max-width:480px;margin:0 auto;padding:14px}\n.card{background:linear-gradient(180deg,#171309,#0f0f0f);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:12px;text-align:center}\nh2{margin:4px 0 8px;color:var(--gold2);font-size:21px}\n.muted{color:var(--mut);font-size:13px;line-height:1.5}\n.price{font-size:46px;font-weight:900;color:var(--gold2);margin:8px 0 2px;text-shadow:0 0 18px rgba(212,175,55,.4)}\n.price small{font-size:18px;color:var(--mut);font-weight:700}\ninput{width:100%;padding:14px;border-radius:12px;border:1px solid var(--gold);background:#0d0b04;color:var(--gold2);font-size:17px;text-align:center;margin:6px 0;outline:none}\nlabel{display:block;font-size:12px;color:var(--mut);margin-top:10px;text-align:left}\n.btn{display:block;text-decoration:none;text-align:center;background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1300;border:0;border-radius:12px;padding:15px 18px;font-weight:900;letter-spacing:.5px;box-shadow:0 4px 0 #7d6718,0 0 18px rgba(212,175,55,.3);width:100%;cursor:pointer;margin-top:12px}\n.btn:active{transform:translateY(3px);box-shadow:0 1px 0 #7d6718}\n.btn:disabled{filter:grayscale(1) brightness(.6);cursor:not-allowed}\n.btn.ghost{background:transparent;color:var(--gold2);border:1px solid var(--gold);box-shadow:none}\n.msg{min-height:22px;font-weight:800;margin:8px 0;color:var(--gold2)}\n.err{color:var(--red)}.ok{color:var(--green)}\n.note{background:#1a1300;border:1px solid var(--line);border-radius:10px;padding:9px 11px;font-size:12px;color:var(--mut);margin-top:12px;line-height:1.5;text-align:left}\n.test{background:#d4af37;color:#1a1300;text-align:center;font:800 12px system-ui;padding:6px}\n.spin{width:44px;height:44px;border-radius:50%;border:4px solid var(--line);border-top-color:var(--gold2);margin:10px auto;animation:sp 1s linear infinite}\n@keyframes sp{to{transform:rotate(360deg)}}\n.view{display:none}.view.on{display:block}\n.big{font-size:56px;margin:4px 0}\n.linkbox{font-family:ui-monospace,Consolas,monospace;font-size:12px;word-break:break-all;background:#0a0802;border:1px dashed var(--gold);border-radius:10px;padding:10px;color:var(--gold2);margin-top:10px;user-select:all;text-align:left}\n</style>\n</head>\n<body>\n<div class=\"test\" id=\"testBar\" style=\"display:none\">MODE TEST · aucun vrai paiement n'est effectué</div>\n<header><div class=\"logo\">NEL JACKPOT</div><div class=\"pill\">BOUTIQUE</div></header>\n<main>\n\n<section class=\"view on\" id=\"v-load\"><div class=\"card\"><div class=\"spin\"></div><div class=\"muted\">Chargement…</div></div></section>\n\n<section class=\"view\" id=\"v-buy\">\n  <div class=\"card\">\n    <div class=\"muted\">Accès à la partie</div>\n    <h2 id=\"gTitle\"></h2>\n    <div class=\"price\"><span id=\"gPrice\"></span> <small>FCFA</small></div>\n    <div class=\"muted\">Un accès personnel, valable pour une personne.</div>\n    <label>Ton prénom (il apparaîtra sur ton ticket)</label>\n    <input id=\"nameIn\" maxlength=\"20\" placeholder=\"Ton prénom\" autocomplete=\"given-name\">\n    <label>Téléphone (facultatif)</label>\n    <input id=\"phoneIn\" inputmode=\"tel\" maxlength=\"16\" placeholder=\"+229 …\" autocomplete=\"tel\">\n    <button class=\"btn\" id=\"payBtn\">PAYER</button>\n    <div class=\"msg err\" id=\"buyErr\"></div>\n    <div class=\"note\">Tu paies sur la page sécurisée de la passerelle de paiement. Dès que le paiement est confirmé, ton lien personnel s'affiche ici : il ne fonctionne que sur le premier appareil qui l'ouvre.<br>Tu paies pour participer à la partie : NEL JACKPOT n'attribue aucun gain en argent.</div>\n  </div>\n  <div class=\"card\" id=\"oldCard\" style=\"display:none\">\n    <div class=\"muted\">Tu as déjà payé ?</div>\n    <a class=\"btn ghost\" id=\"oldLink\" href=\"#\">RETROUVER MON LIEN</a>\n  </div>\n</section>\n\n<section class=\"view\" id=\"v-closed\">\n  <div class=\"card\"><div class=\"big\">🔒</div><h2>Ventes fermées</h2><div class=\"muted\" id=\"closedMsg\">Les ventes ne sont pas ouvertes pour le moment. Reviens plus tard ou demande à l'animateur.</div></div>\n</section>\n\n<section class=\"view\" id=\"v-order\">\n  <div class=\"card\" id=\"o-pending\"><div class=\"spin\"></div><h2>Vérification du paiement…</h2><div class=\"muted\">Ne ferme pas cette page. Ton lien s'affichera dès que le paiement est confirmé.</div>\n    <button class=\"btn ghost\" id=\"refreshBtn\">VÉRIFIER MAINTENANT</button>\n    <div class=\"card\" id=\"simBox\" style=\"display:none;margin-top:14px;border-color:var(--gold)\"><div class=\"muted\" style=\"margin-bottom:6px\">Simulateur de test</div><button class=\"btn\" id=\"simOk\">SIMULER UN PAIEMENT RÉUSSI</button><button class=\"btn ghost\" id=\"simKo\">SIMULER UN ÉCHEC</button></div>\n  </div>\n  <div class=\"card\" id=\"o-paid\"><div class=\"big\">✅</div><h2>Paiement confirmé</h2><div class=\"muted\" id=\"paidFor\"></div>\n    <a class=\"btn\" id=\"enterBtn\" href=\"#\">ENTRER DANS LE JEU</a>\n    <button class=\"btn ghost\" id=\"copyBtn\">COPIER MON LIEN</button>\n    <div class=\"linkbox\" id=\"linkBox\"></div>\n    <div class=\"note\">⚠️ Ce lien est personnel. Le premier appareil qui l'ouvre le verrouille : un autre appareil ne pourra plus l'utiliser. Garde cette page pour le retrouver.</div>\n  </div>\n  <div class=\"card\" id=\"o-request\"><div class=\"spin\"></div><h2>Demande envoyée</h2><div class=\"muted\" id=\"reqFor\">Ton nom est chez l'animateur. Dès qu'il accepte, ton lien personnel s'affiche ici.</div>\n    <div class=\"note\">Ne ferme pas cette page : elle se met à jour toute seule. Si tu la fermes, rouvre le même lien pour retrouver ta demande.</div>\n  </div>\n  <div class=\"card\" id=\"o-refused\"><div class=\"big\">🚫</div><h2>Demande refusée</h2><div class=\"muted\">L'animateur n'a pas accepté cette demande. Va le voir si tu penses que c'est une erreur.</div></div>\n  <div class=\"card\" id=\"o-failed\"><div class=\"big\">❌</div><h2>Paiement non abouti</h2><div class=\"muted\">Aucun argent n'a été pris pour cette commande. Tu peux réessayer.</div><a class=\"btn\" href=\"/pay\">RÉESSAYER</a></div>\n  <div class=\"card\" id=\"o-ended\"><div class=\"big\">🏁</div><h2>Partie terminée</h2><div class=\"muted\">Cette partie est terminée. Contacte l'animateur pour la suite.</div></div>\n  <div class=\"card\" id=\"o-other\"><div class=\"big\">⚠️</div><h2>Paiement reçu</h2><div class=\"muted\">Ton paiement est bien enregistré, mais la partie a changé entre-temps. Contacte l'animateur avec ton prénom pour recevoir ton accès.</div></div>\n  <div class=\"card\" id=\"o-unknown\"><div class=\"big\">❓</div><h2>Commande introuvable</h2><a class=\"btn\" href=\"/pay\">RETOUR À LA BOUTIQUE</a></div>\n</section>\n\n</main>\n<script>\nconst $=s=>document.querySelector(s);\nconst fmt=n=>Number(n).toLocaleString('fr-FR');\nconst Q=new URLSearchParams(location.search),ORD=(Q.get('order')||'').replace(/[^A-Za-z0-9]/g,'').slice(0,40);\nfunction view(v){document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v))}\nasync function api(p,b){\n  const r=await fetch(p,b?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}:undefined);\n  const j=await r.json().catch(()=>({}));\n  if(!r.ok){const e=new Error(j.error||'Erreur réseau');e.status=r.status;throw e}\n  return j;\n}\nfunction show(id){['pending','request','refused','paid','failed','ended','other','unknown'].forEach(k=>$('#o-'+k).style.display=(k===id?'block':'none'))}\nlet timer=null,INFO=null;\nasync function checkOrder(){\n  try{\n    const o=await api('/api/shop/order?ref='+encodeURIComponent(ORD));\n    if(o.status==='paid'){\n      show('paid');clearInterval(timer);\n      const link=new URL(o.path,location.origin).href;\n      $('#paidFor').textContent='Bienvenue '+o.name+' ! Ton accès est prêt.';\n      if(o.free)$('#o-paid h2').textContent='Inscription confirmée';\n      $('#enterBtn').href=link;$('#linkBox').textContent=link;\n      $('#copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(link);$('#copyBtn').textContent='LIEN COPIÉ ✓'}catch(e){const r=document.createRange();r.selectNodeContents($('#linkBox'));const s=getSelection();s.removeAllRanges();s.addRange(r)}};\n      try{localStorage.setItem('nel_order',ORD)}catch(e){}\n    }\n    else if(o.status==='request'){show('request');$('#reqFor').textContent='Bonjour '+o.name+', ta demande est chez l\\'animateur. Dès qu\\'il accepte, ton lien personnel s\\'affiche ici.'}\n    else if(o.status==='refused'){show('refused');clearInterval(timer)}\n    else if(o.status==='failed'||o.status==='expired'){show('failed');clearInterval(timer)}\n    else if(o.status==='ended'){show('ended');clearInterval(timer)}\n    else if(o.status==='paid_other'){show('other');clearInterval(timer)}\n    else{show('pending');$('#simBox').style.display=(o.testMode&&Q.get('sim'))?'block':'none'}\n  }catch(e){if(e.status===404){show('unknown');clearInterval(timer)}}\n}\nasync function init(){\n  try{INFO=await api('/api/shop/info')}catch(e){view('closed');return}\n  $('#testBar').style.display=INFO.testMode?'block':'none';\n  if(INFO.approve){\n    $('#gPrice').parentElement.style.display='none';$('#payBtn').textContent='DEMANDER MON LIEN';\n    document.querySelector('.pill').textContent='INSCRIPTION';\n    document.querySelector('#v-buy .muted').textContent='Demande d\\'accès à la partie';\n    $('#v-buy .note').innerHTML='Écris ton prénom : ta demande est envoyée à l\\'animateur. S\\'il l\\'accepte, ton lien personnel s\\'affiche sur cette page. Il ne fonctionne que sur le premier appareil qui l\\'ouvre.';\n    $('#oldCard').querySelector('.muted').textContent='Tu as déjà fait une demande ?';$('#oldLink').textContent='RETROUVER MA DEMANDE';\n  }\n  else if(INFO.free){\n    $('#gPrice').parentElement.style.display='none';$('#payBtn').textContent='JE M\\'INSCRIS';\n    document.querySelector('.pill').textContent='INSCRIPTION';\n    document.querySelector('#v-buy .muted').textContent='Inscription à la partie';\n    $('#v-buy .note').innerHTML='Écris ton prénom : ton lien personnel s\\'affiche tout de suite. Il ne fonctionne que sur le premier appareil qui l\\'ouvre.';\n    $('#oldCard').querySelector('.muted').textContent='Tu es déjà inscrit ?';\n  }\n  if(ORD){\n    view('order');show('pending');\n    try{localStorage.setItem('nel_order',ORD)}catch(e){}\n    await checkOrder();timer=setInterval(checkOrder,3000);return;\n  }\n  if(!INFO.open){view('closed');\n    let o='';try{o=localStorage.getItem('nel_order')||''}catch(e){}\n    return}\n  $('#gTitle').textContent=INFO.title;$('#gPrice').textContent=fmt(INFO.price);\n  view('buy');\n  let old='';try{old=localStorage.getItem('nel_order')||''}catch(e){}\n  if(old){$('#oldCard').style.display='block';$('#oldLink').href='/pay?order='+encodeURIComponent(old)}\n}\n$('#refreshBtn').onclick=checkOrder;\n$('#simOk').onclick=async()=>{await api('/api/shop/sim',{ref:ORD,result:'ok'});checkOrder()};\n$('#simKo').onclick=async()=>{await api('/api/shop/sim',{ref:ORD,result:'ko'});checkOrder()};\n$('#payBtn').onclick=async()=>{\n  const name=$('#nameIn').value.trim();$('#buyErr').textContent='';\n  if(name.length<2){$('#buyErr').textContent='Écris ton prénom (2 lettres minimum).';return}\n  $('#payBtn').disabled=true;$('#payBtn').textContent=INFO&&(INFO.approve||INFO.free)?'ENVOI…':'REDIRECTION…';\n  try{\n    const j=await api('/api/shop/checkout',{name,phone:$('#phoneIn').value.trim()});\n    try{localStorage.setItem('nel_order',j.ref)}catch(e){}\n    location.href=j.url;\n  }catch(e){$('#buyErr').textContent=e.message;$('#payBtn').disabled=false;$('#payBtn').textContent=INFO&&INFO.approve?'DEMANDER MON LIEN':INFO&&INFO.free?'JE M\\'INSCRIS':'PAYER'}\n};\n$('#nameIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('#payBtn').click()});\ninit();\n</script>\n</body>\n</html>\n";
const PORT = +process.env.PORT || 3000;
const PAY = String(process.env.PAY_PROVIDER || '').toLowerCase();
const FEDA_KEY = process.env.FEDAPAY_SECRET_KEY || '';
const FEDA_ENV = String(process.env.FEDAPAY_ENV || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
const FEDA_BASE = process.env.FEDAPAY_API_URL || (FEDA_ENV === 'live' ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1');
const PUBLIC_URL = String(process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
const payReady = () => PAY === 'sim' || (PAY === 'fedapay' && !!FEDA_KEY);
const paidOpen = () => !!(SHOP.open && SHOP.price > 0 && payReady());
const signupOpen = () => !!SHOP.free || !!SHOP.approve || paidOpen(); // inscription libre, sur validation, ou vente
const MAX_REQUESTS = 300; // demandes en attente au maximum (anti-spam)
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
let SHOP, ORD, ORD_TX;
function init(g) {
  SHOP = Object.assign({ price: 0, open: false, free: false, approve: false, orders: [] }, (g && g.shop) || {});
  if (!Array.isArray(SHOP.orders)) SHOP.orders = [];
  ORD = new Map(); ORD_TX = new Map();
  for (const o of SHOP.orders) { ORD.set(o.ref, o); if (o.txId) ORD_TX.set(String(o.txId), o); }
  G = Object.assign(blank(1), g || {});
  delete G.shop;
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
  try { fs.writeFileSync(FILE + '.tmp', JSON.stringify({ ...G, used: [...USED], shop: SHOP })); fs.renameSync(FILE + '.tmp', FILE); } catch (e) {}
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
    inviteMode: !!G.invite, signup: signupOpen(), approve: !!SHOP.approve, invite: inviteInfo(code, me),
    me: me ? { token: me.token, pid: me.pid, name: me.name, result: me.result } : null,
    board: (me || !G.invite ? RECENT.slice().reverse() : []).map(p => ({ name: p.name, pid: p.pid, emoji: p.result.emoji, number: p.result.number }))
  };
}
function counts() {
  const c = { sent: 0, failed: 0, waiting: 0, queued: 0, off: 0 };
  for (const p of G.players) if (p.result && c[p.mail] !== undefined) c[p.mail]++;
  return c;
}

/* ---------- boutique de paiement ---------- */
function reqJson(method, urlStr, headers, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr), lib = u.protocol === 'http:' ? http : https, data = payload ? JSON.stringify(payload) : null;
    const req = lib.request({
      hostname: u.hostname, port: u.port || (u.protocol === 'http:' ? 80 : 443), path: u.pathname + u.search, method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...headers }, timeout: 20000
    }, res => {
      let b = ''; res.on('data', c => { if (b.length < 20000) b += c; });
      res.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) {} resolve({ status: res.statusCode, json: j, raw: b.slice(0, 300) }); });
    });
    req.on('timeout', () => req.destroy(new Error('Délai dépassé')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
const feda = (method, p, payload) => reqJson(method, FEDA_BASE + p, { Authorization: 'Bearer ' + FEDA_KEY }, payload);
const txOf = j => (j && (j['v1/transaction'] || j.transaction)) || j || {};
function baseUrl(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  return proto + '://' + (req.headers['x-forwarded-host'] || req.headers.host || 'localhost');
}
const ipOf = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const buyHits = new Map();
function buyLimited(ip) {
  const now = Date.now(), a = (buyHits.get(ip) || []).filter(t => now - t < 600000);
  if (a.length >= 30) { buyHits.set(ip, a); return true; }
  a.push(now); buyHits.set(ip, a); return false;
}
const orderRef = () => crypto.randomBytes(12).toString('hex');
function shopCounts() {
  const c = { paid: 0, pending: 0, failed: 0, revenue: 0, waiting: 0, refused: 0 };
  for (const o of SHOP.orders) {
    if (o.gameId !== G.gameId) continue;
    if (o.invite) { c.paid++; c.revenue += o.amount; } else if (o.status === 'pending') c.pending++;
    else if (o.status === 'request') c.waiting++; else if (o.status === 'refused') c.refused++; else c.failed++;
  }
  return c;
}
function fulfill(o) {
  if (o.invite) return;
  if (o.gameId !== G.gameId) { o.status = 'paid_other'; saveNow(); return; }
  const v = { code: newCode(), label: clean(o.name, 20), claimed: false, pid: null, at: Date.now(), order: o.ref };
  G.invites.push(v); INV.set(v.code, v);
  o.invite = v.code; o.status = 'paid'; o.paidAt = Date.now();
  saveNow();
}
// Demande à la passerelle l'état réel de la transaction : on ne croit jamais le navigateur ni un simple message reçu.
async function verifyOrder(o) {
  if (o.invite || o.status === 'paid_other' || PAY !== 'fedapay' || !o.txId) return;
  if (Date.now() - (o.lastCheck || 0) < 3000) return;
  o.lastCheck = Date.now();
  try {
    const r = await feda('GET', '/transactions/' + encodeURIComponent(o.txId));
    if (r.status < 200 || r.status >= 300) return;
    const tx = txOf(r.json), st = String(tx.status || '').toLowerCase();
    if (st === 'approved' || st === 'transferred') {
      if (tx.amount !== undefined && Number(tx.amount) < o.amount) { o.status = 'failed'; o.note = 'montant inférieur'; saveNow(); return; }
      fulfill(o);
    } else if (st === 'declined' || st === 'canceled' || st === 'refunded') { o.status = 'failed'; saveNow(); }
  } catch (e) {}
}
async function createCheckout(o, req) {
  if (PAY === 'sim') return '/pay?order=' + o.ref + '&sim=1';
  const parts = o.name.split(/\s+/), customer = { firstname: parts[0], lastname: parts.slice(1).join(' ') || 'Client' };
  if (o.email) customer.email = o.email;
  if (o.phone) customer.phone_number = { number: o.phone, country: 'bj' };
  const r = await feda('POST', '/transactions', {
    description: 'NEL JACKPOT · accès à la partie ' + G.title, amount: o.amount, currency: { iso: 'XOF' },
    callback_url: baseUrl(req) + '/pay?order=' + o.ref, customer
  });
  const id = txOf(r.json).id;
  if (r.status < 200 || r.status >= 300 || !id) throw new Error('La passerelle de paiement a refusé la commande (' + r.status + ').');
  o.txId = String(id); ORD_TX.set(o.txId, o);
  const t = await feda('POST', '/transactions/' + encodeURIComponent(id) + '/token');
  if (t.status < 200 || t.status >= 300 || !t.json || !t.json.url) throw new Error('Lien de paiement indisponible (' + t.status + ').');
  return String(t.json.url);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), P = url.pathname;
  try {
    if (req.method === 'GET' && (P === '/pay' || P === '/pay/')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(SHOP_HTML);
    }
    if (req.method === 'GET' && P === '/api/shop/info') {
      return send(res, 200, { title: G.title, price: (SHOP.free || SHOP.approve) ? 0 : SHOP.price, free: !!SHOP.free, approve: !!SHOP.approve, open: signupOpen(), testMode: PAY === 'sim' && !SHOP.free && !SHOP.approve });
    }
    if (req.method === 'POST' && P === '/api/shop/checkout') {
      const b = await body(req); if (!b) return send(res, 413, { error: 'Trop volumineux.' });
      if (!signupOpen()) return send(res, 409, { error: SHOP.free === false && SHOP.open ? 'Les ventes sont fermées pour le moment.' : 'Les inscriptions sont fermées pour le moment.' });
      if (buyLimited(ipOf(req))) return send(res, 429, { error: 'Trop de tentatives, réessaie dans quelques minutes.' });
      const name = clean(b.name, 20);
      if (name.length < 2) return send(res, 400, { error: 'Écris ton prénom (2 lettres minimum).' });
      const phone = String(b.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
      const email = clean(b.email, 120);
      if (email && !validEmail(email)) return send(res, 400, { error: 'Adresse email invalide.' });
      if (G.limit) {
        const c = shopCounts();
        if (c.paid + c.pending + c.waiting >= G.limit) return send(res, 409, { error: 'Il n\'y a plus de places pour cette partie.' });
      }
      const o = { ref: orderRef(), gameId: G.gameId, name, phone, email, amount: (SHOP.free || SHOP.approve) ? 0 : SHOP.price, status: 'pending', createdAt: Date.now(), invite: null };
      if (SHOP.approve) { // inscription sur validation : la demande attend la décision de l'animateur
        if (shopCounts().waiting >= MAX_REQUESTS) return send(res, 429, { error: 'Trop de demandes en attente, réessaie dans un moment.' });
        o.status = 'request';
        SHOP.orders.push(o); ORD.set(o.ref, o); saveNow();
        return send(res, 200, { ref: o.ref, url: '/pay?order=' + o.ref });
      }
      if (SHOP.free) { // inscription libre : pas de paiement, le lien personnel est créé tout de suite
        SHOP.orders.push(o); ORD.set(o.ref, o); fulfill(o);
        return send(res, 200, { ref: o.ref, url: '/pay?order=' + o.ref });
      }
      let payUrl;
      try { payUrl = await createCheckout(o, req); }
      catch (e) { return send(res, 502, { error: String(e.message || 'Paiement indisponible.').slice(0, 160) }); }
      SHOP.orders.push(o); ORD.set(o.ref, o); saveNow();
      return send(res, 200, { ref: o.ref, url: payUrl });
    }
    if (req.method === 'GET' && P === '/api/shop/order') {
      const o = ORD.get(String(url.searchParams.get('ref') || ''));
      if (!o) return send(res, 404, { error: 'Commande introuvable.' });
      if (o.status === 'pending') {
        await verifyOrder(o);
        if (o.status === 'pending' && Date.now() - o.createdAt > 86400000) { o.status = 'expired'; saveSoon(); }
      }
      if (o.invite && o.gameId !== G.gameId) return send(res, 200, { status: 'ended', name: o.name, amount: o.amount });
      const out = { status: o.invite ? 'paid' : o.status, name: o.name, amount: o.amount, free: o.amount === 0, testMode: PAY === 'sim' && o.amount > 0 };
      if (o.status === 'request' && o.gameId !== G.gameId) out.status = 'ended';
      if (o.invite) out.path = '/?i=' + o.invite;
      return send(res, 200, out);
    }
    if (req.method === 'POST' && P === '/api/shop/webhook') {
      const b = await body(req, 50000); if (!b) return send(res, 413, { error: 'Trop volumineux.' });
      // Le contenu n'est qu'un signal : on vérifie la transaction directement auprès de la passerelle.
      const id = String((b.entity && b.entity.id) || (b.object && b.object.id) || b.id || '');
      const o = id ? ORD_TX.get(id) : null;
      if (o) { o.lastCheck = 0; await verifyOrder(o); }
      return send(res, 200, { received: true });
    }
    if (req.method === 'POST' && P === '/api/shop/sim') {
      const b = await body(req); if (!b) return send(res, 413, { error: 'Trop volumineux.' });
      if (PAY !== 'sim') return send(res, 404, { error: 'Introuvable' });
      const o = ORD.get(String(b.ref || ''));
      if (!o || o.status !== 'pending') return send(res, 404, { error: 'Commande introuvable.' });
      if (b.result === 'ok') fulfill(o); else { o.status = 'failed'; saveNow(); }
      return send(res, 200, { ok: true });
    }
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
      if (P === '/api/admin/shop') {
        const orders = SHOP.orders.filter(o => o.gameId === G.gameId).slice(-40).reverse()
          .map(o => ({ name: o.name, amount: o.amount, status: o.invite ? (INV.get(o.invite) && INV.get(o.invite).claimed ? 'utilisé' : (o.amount ? 'payé' : 'accepté')) : o.status === 'request' ? 'en attente' : o.status === 'refused' ? 'refusé' : o.status, at: o.createdAt }));
        const requests = SHOP.orders.filter(o => o.gameId === G.gameId && o.status === 'request')
          .map(o => ({ ref: o.ref, name: o.name, phone: o.phone || '', at: o.createdAt }));
        return send(res, 200, {
          requests, approve: !!SHOP.approve,
          price: SHOP.price, open: !!SHOP.open, free: !!SHOP.free, provider: PAY || 'aucun', env: FEDA_ENV, ready: payReady(), testMode: PAY === 'sim',
          keyOk: PAY === 'sim' || !!FEDA_KEY, counts: shopCounts(), orders
        });
      }
      if (P === '/api/admin/decide') { // accepter ou refuser une demande d'accès
        const o = ORD.get(String(b.ref || ''));
        if (!o || o.status !== 'request') return send(res, 404, { error: 'Demande introuvable ou déjà traitée.' });
        if (b.accept) {
          fulfill(o); // crée le lien personnel : le joueur le voit apparaître sur sa page
        } else { o.status = 'refused'; saveNow(); }
        return send(res, 200, { ok: true, status: o.status });
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
        if (b.price !== undefined) SHOP.price = Math.max(0, Math.min(10000000, parseInt(b.price, 10) || 0));
        if (b.salesOpen !== undefined) {
          if (b.salesOpen && !(SHOP.price > 0 && payReady())) return send(res, 400, { error: 'Impossible d\'ouvrir les ventes : fixe un prix et configure la passerelle de paiement sur le serveur (PAY_PROVIDER et FEDAPAY_SECRET_KEY).' });
          SHOP.open = !!b.salesOpen;
          if (SHOP.open) { G.invite = true; SHOP.free = false; SHOP.approve = false; } // vente ouverte = accès uniquement par lien personnel
        }
        if (b.freeOpen !== undefined) {
          SHOP.free = !!b.freeOpen;
          if (SHOP.free) { G.invite = true; SHOP.open = false; SHOP.approve = false; } // inscription libre = lien personnel gratuit, sans paiement
        }
        if (b.approveOpen !== undefined) {
          SHOP.approve = !!b.approveOpen;
          if (SHOP.approve) { G.invite = true; SHOP.open = false; SHOP.free = false; } // sur validation : l'animateur accepte ou refuse chaque demande
        }
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
  console.log('\n  NEL JACKPOT · Classe v4 — serveur lancé\n');
  console.log('  Sur cet appareil :  http://localhost:' + PORT);
  Object.values(os.networkInterfaces()).forEach(l => (l || []).forEach(i => { if (i.family === 'IPv4' && !i.internal) console.log('  Lien (même Wi-Fi) :  http://' + i.address + ':' + PORT); }));
  console.log('\n  Partie #' + G.gameId + ' · participants illimités' + (G.limit ? ' (limite ' + G.limit + ')' : '') + ' · ' + G.items.length + ' choix');
  console.log('  Paiement : ' + (PAY === 'sim' ? 'SIMULATEUR DE TEST (aucun vrai paiement)' : PAY === 'fedapay' ? (FEDA_KEY ? 'FedaPay ' + FEDA_ENV : 'FedaPay SANS clé (ajoute FEDAPAY_SECRET_KEY)') : 'non configuré') + ' · boutique : /pay');
  console.log('  Emails : ' + (MAIL_KEY ? 'clé Resend détectée' : 'NON configurés (ajoute RESEND_API_KEY)') + (G.email ? ' · destinataire ' + G.email : ' · pas d\'adresse animateur'));
  if (PIN === '1234') console.log('  ⚠ Code animateur par défaut : change-le avec la variable PIN');
  console.log('');
});
