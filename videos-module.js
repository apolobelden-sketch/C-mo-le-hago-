/*
  Videos — módulo independiente
  - Carrusel "Videos para resolverlo ya" en la portada.
  - Video incrustado arriba de cada guía que tenga uno.
  - Limpia la portada: oculta el recuadro negro de "Mis videos", el botón de lives
    sin configurar y el banner de ahorro cuando todavía va en $0.
  Para agregar un video: busca la guía en script.js (su id) y agrega una línea aquí
  con el ID del video de YouTube (lo que va después de "watch?v=").
*/
(function(){
  const VIDEOS = {
    'armar-ofrenda-dia-muertos': { v:'hBFOwuTcvds', t:'Arma tu ofrenda de Día de Muertos' },
    'destapar-excusado':         { v:'W-ml-fmBHmo', t:'Destapa el baño en minutos' },
    'cambiar-llanta':            { v:'M1gVuAmXNVI', t:'Cambia una llanta ponchada' },
    'pasar-corriente':           { v:'Z6qn6DRScMM', t:'Pasa corriente sin riesgo' },
    'cambiar-wifi-password':     { v:'glFyEUSrU1g', t:'Cambia la clave de tu WiFi' },
    'whatsapp-web':              { v:'3XQbtJZrdps', t:'WhatsApp Web paso a paso' },
    'liberar-espacio':           { v:'_KMy_W6riMw', t:'Libera espacio en tu celular' },
    'gmail-recuperar':           { v:'xRTql8HZXvY', t:'Recupera correos borrados' },
    'curp-linea':                { v:'RKkYX-A93u8', t:'Descarga tu CURP gratis' },
    'rfc-sat':                   { v:'zSl-37x4-90', t:'Saca tu RFC con tu CURP' },
    'semanas-imss':              { v:'fKyfH0uR_a4', t:'Tus semanas cotizadas IMSS' },
    'consultar-infonavit':       { v:'gVMxg09rfDw', t:'Tu saldo de Infonavit' },
    'hacer-cv':                  { v:'7kSrVQYY_D8', t:'Tu currículum desde el celular' },
    'pegar-azulejo':             { v:'huX-A_0nVUY', t:'Pega azulejo como experto' },
    'llave-agua-gotea':          { v:'35bBgqlUCEI', t:'Arregla la llave que gotea' },
    'atragantamiento-que-hacer': { v:'AExXzeXMGbY', t:'Maniobra de Heimlich (Cruz Roja)' }
  };
  const ORDEN = Object.keys(VIDEOS);
  const thumb = (v) => `https://i.ytimg.com/vi/${v}/hqdefault.jpg`;
  const ver = (v) => `https://www.youtube.com/watch?v=${v}`;
  let autoplaySiguiente = false;

  // ---------- estilos ----------
  const css = `
  #misVideosSection,.lives-cta-row,.brand-sub{display:none!important}
  .vx{margin:16px 0 4px}
  .vx-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px}
  .vx-head h3{margin:0;font:700 1.05rem "Space Grotesk",system-ui,sans-serif}
  .vx-head span{font-size:.75rem;color:var(--ink-soft)}
  .vx-row{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;-webkit-overflow-scrolling:touch}
  .vx-card{flex:none;width:68%;max-width:260px;scroll-snap-align:start;cursor:pointer;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;text-align:left;padding:0;color:inherit;font:inherit}
  .vx-img{position:relative;aspect-ratio:16/9;background:#111}
  .vx-img img{width:100%;height:100%;object-fit:cover;display:block}
  .vx-play{position:absolute;inset:0;margin:auto;width:52px;height:36px;border-radius:10px;background:rgba(220,30,30,.92);display:grid;place-items:center;color:#fff;font-size:18px;box-shadow:0 4px 12px rgba(0,0,0,.35)}
  .vx-t{padding:9px 11px 11px;font-weight:700;font-size:.9rem;line-height:1.25}
  .vbox{margin:12px 16px}
  .vbox.hidden{display:none}
  .vbox-frame{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000;cursor:pointer}
  .vbox-frame img{width:100%;height:100%;object-fit:cover;display:block;opacity:.9}
  .vbox-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
  .vbox-frame .vx-play{width:68px;height:48px;font-size:22px}
  .vbox-tag{position:absolute;left:10px;top:10px;background:rgba(0,0,0,.65);color:#fff;font-size:.72rem;font-weight:700;padding:4px 9px;border-radius:999px}
  .vbox a{display:inline-block;margin-top:6px;font-size:.78rem;color:var(--ink-soft)}
  .vx-badge{display:inline-block;margin-left:6px;font-size:.68rem;font-weight:700;color:#c62828;background:rgba(198,40,40,.1);padding:2px 7px;border-radius:999px;vertical-align:middle}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // ---------- carrusel en la portada ----------
  function carrusel(){
    const anchor = document.querySelector('#listView .search-row');
    if(!anchor || document.getElementById('vx')) return;
    const existe = (id) => typeof TUTORIALS !== 'undefined' ? TUTORIALS.some((t) => t.id === id) : true;
    const ids = ORDEN.filter(existe);
    if(!ids.length) return;
    const sec = document.createElement('section');
    sec.className = 'vx'; sec.id = 'vx';
    sec.innerHTML = `<div class="vx-head"><h3>🎬 Videos para resolverlo ya</h3><span>Desliza →</span></div><div class="vx-row">` +
      ids.map((id) => `<button type="button" class="vx-card" data-vid="${esc(id)}"><div class="vx-img"><img src="${thumb(VIDEOS[id].v)}" alt="" loading="lazy"><span class="vx-play">▶</span></div><div class="vx-t">${esc(VIDEOS[id].t)}</div></button>`).join('') +
      `</div>`;
    anchor.insertAdjacentElement('afterend', sec);
    sec.addEventListener('click', (e) => {
      const c = e.target.closest('.vx-card'); if(!c) return;
      autoplaySiguiente = true;
      if(typeof openDetail === 'function') openDetail(c.dataset.vid);
    });
  }

  // ---------- video dentro de la guía ----------
  function cajaVideo(){
    let box = document.getElementById('vbox');
    if(box) return box;
    const ref = document.querySelector('#detail .yt-row');
    if(!ref) return null;
    box = document.createElement('div');
    box.className = 'vbox hidden'; box.id = 'vbox';
    ref.parentNode.insertBefore(box, ref);
    return box;
  }
  function reproducir(frame, v){
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v}?autoplay=1&rel=0&playsinline=1" title="Video" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }
  function ponerVideo(id){
    const box = cajaVideo(); if(!box) return;
    const item = VIDEOS[id];
    if(!item){ box.classList.add('hidden'); box.innerHTML = ''; autoplaySiguiente = false; return; }
    box.classList.remove('hidden');
    box.innerHTML = `<div class="vbox-frame"><img src="${thumb(item.v)}" alt=""><span class="vbox-tag">🎬 Mira cómo se hace</span><span class="vx-play">▶</span></div><a href="${ver(item.v)}" target="_blank" rel="noopener">¿No se reproduce? Ábrelo en YouTube ↗</a>`;
    const frame = box.querySelector('.vbox-frame');
    frame.addEventListener('click', () => reproducir(frame, item.v), { once:true });
    if(autoplaySiguiente){ reproducir(frame, item.v); }
    autoplaySiguiente = false;
  }

  // ---------- marca "con video" en la lista ----------
  function marcar(){
    document.querySelectorAll('#cardList .card[data-id]').forEach((c) => {
      if(VIDEOS[c.dataset.id] && !c.querySelector('.vx-badge')){
        const h = c.querySelector('h3, h4, .card-title') || c.querySelector('.card-body');
        if(h) h.insertAdjacentHTML('beforeend', '<span class="vx-badge">▶ Video</span>');
      }
    });
  }

  // ---------- banner de ahorro en $0 ----------
  function limpiarAhorro(){
    const n = document.getElementById('ahorro-counter');
    if(n && /^\$0$/.test(n.textContent.trim())){ const b = document.getElementById('ahorro-banner'); if(b) b.remove(); }
  }

  function iniciar(){
    carrusel();
    if(typeof window.openDetail === 'function' && !window.openDetail.__vx){
      const original = window.openDetail;
      const nuevo = function(id){ const r = original.apply(this, arguments); try { ponerVideo(id); } catch(e){} return r; };
      nuevo.__vx = true;
      window.openDetail = nuevo;
    }
    const lista = document.getElementById('cardList');
    if(lista){ marcar(); new MutationObserver(marcar).observe(lista, { childList:true }); }
    limpiarAhorro(); setTimeout(limpiarAhorro, 800);
    // Si la página se abrió directo en una guía (#id), pon su video
    const h = location.hash.slice(1);
    if(h && VIDEOS[h]) setTimeout(() => ponerVideo(h), 300);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
