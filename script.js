// ================================================================
// CONFIGURACIÓN — pega aquí tus datos para activar cada función
// ================================================================
// Tu WhatsApp para consultas pagadas (con código de país, sin + ni espacios). Ej: '526441234567'
const CONSULTA_WHATSAPP = '';
// Tu link de donación (Mercado Pago, PayPal.me, Ko-fi, etc.)
const DONACION_LINK = '';

// ===== Tus propios videos (carrusel gratis, sin límite, sin API) =====
// 1) Crea o usa tu canal de YouTube y sube tus videos ahí.
// 2) Ve a tu canal → pestaña "Videos" → copia el ID que aparece en la URL después de "list=" en tu playlist de "Subidos".
//    (Truco fácil: el ID de tu canal empieza con "UC...", tu playlist de subidos es igual pero cambiando "UC" por "UU".)
// 3) Pégalo aquí abajo. Se actualiza solo cada vez que subas un video nuevo.
const MIS_VIDEOS_PLAYLIST_ID = 'UU7VOo8nlwERziFajtcDPMQg';

// ===== Lives de venta =====
// Tu WhatsApp para que vendedores te pidan un espacio de live (con código de país, sin + ni espacios)
const LIVES_WHATSAPP = '';

// Cada live:
//   id: identificador único corto, sin espacios (sirve para el link directo que le das al vendedor)
//   vendedor: nombre del negocio
//   plataforma: 'youtube', 'facebook' o 'tiktok'
//   embedUrl: link "embed" (solo para youtube/facebook — TikTok no permite incrustar lives, se usa "urlDirecta" en su lugar)
//   urlDirecta: para TikTok — el link directo a su live (se abre en TikTok, no se incrusta)
//   productoLink: a dónde comprar
//   activo: true cuando el live YA está transmitiendo
//   fechaProgramada: fecha y hora del live en formato 'YYYY-MM-DDTHH:MM' (para mostrar cuenta regresiva antes de que empiece)
// Ejemplos:
// { id:'tornillo-01', vendedor:'Ferretería El Tornillo', plataforma:'youtube', embedUrl:'', productoLink:'', activo:false, fechaProgramada:'2026-07-15T18:00' }
// { id:'ropa-02', vendedor:'Boutique Ana', plataforma:'tiktok', urlDirecta:'https://www.tiktok.com/@usuario/live', productoLink:'', activo:true }
const LIVES = [];
// ================================================================

// ===== Directorio de profesionales por oficio =====
// Para agregar uno: nombre, WhatsApp (con código de país, sin + ni espacios) y sus coordenadas (lat, lng).
// Para sacar las coordenadas: busca su negocio en Google Maps, toca y mantén sobre el punto, copia los números que aparecen.
// Ejemplo: Plomero: [ { nombre: 'Don Beto - Plomería 24h', whatsapp: '526441234567', lat: 31.309, lng: -110.945 } ]
// Si no le pones lat/lng, igual aparece, solo que sin ordenar por cercanía.
const PROFESIONALES = {
  'Plomero': [],
  'Electricista': [],
  'Cerrajero': [],
  'Técnico en refrigeración': [],
  'Mecánico': [],
  'Carpintero': [],
  'Pintor': [],
  'Albañil': [],
  'Vidriero': [],
  'Técnico en aire acondicionado': []
};
// ================================================================

// ===== Ubicación de la persona (para ordenar profesionales y buscar negocios cerca) =====
let miUbicacion = null;
function pedirUbicacion(){
  if(!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    function(pos){
      miUbicacion = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if(currentDetail) openDetail(currentDetail.id);
    },
    function(){ miUbicacion = null; },
    { timeout: 8000 }
  );
}

function distanciaKm(lat1, lng1, lat2, lng2){
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLng = (lng2-lng1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function ordenarPorCercania(lista){
  if(!miUbicacion) return lista;
  return [...lista].map(p => {
    const d = (p.lat && p.lng) ? distanciaKm(miUbicacion.lat, miUbicacion.lng, p.lat, p.lng) : null;
    return { ...p, distancia: d };
  }).sort((a,b) => (a.distancia ?? 999) - (b.distancia ?? 999));
}

// ===== Lives de venta =====
function generarICS(vendedor, fechaISO){
  const inicio = new Date(fechaISO);
  const fin = new Date(inicio.getTime() + 60*60*1000);
  const fmt = d => d.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',
    `DTSTART:${fmt(inicio)}`,`DTEND:${fmt(fin)}`,
    `SUMMARY:Live de ${vendedor} en ¿Cómo le hago?`,
    'DESCRIPTION:No te lo pierdas.',
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  return 'data:text/calendar;charset=utf8,' + encodeURIComponent(ics);
}

function tiempoRestante(fechaISO){
  const diff = new Date(fechaISO) - new Date();
  if(diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if(h >= 24){ const d = Math.floor(h/24); return `en ${d} día${d>1?'s':''}`; }
  if(h > 0) return `en ${h}h ${m}min`;
  return `en ${m} min`;
}

function cargarLivesVenta(){
  const seccion = document.getElementById('livesSection');
  const scroll = document.getElementById('livesScroll');
  const ctaBtn = document.getElementById('livesCtaBtn');
  if(!seccion || !scroll) return;

  const activos = LIVES.filter(l => l.activo && (l.embedUrl || l.urlDirecta));
  const programados = LIVES.filter(l => !l.activo && l.fechaProgramada && new Date(l.fechaProgramada) > new Date());

  if(activos.length === 0 && programados.length === 0){
    seccion.classList.add('hidden');
  } else {
    seccion.classList.remove('hidden');

    const badgePlataforma = { youtube:'YOUTUBE', facebook:'FACEBOOK', tiktok:'TIKTOK' };

    const htmlActivos = activos.map(l => {
      const badge = `<span class="live-plataforma live-plataforma-${l.plataforma}">${badgePlataforma[l.plataforma] || ''}</span>`;
      const cuerpo = (l.plataforma === 'tiktok')
        ? `<a class="live-tiktok-box" href="${l.urlDirecta}" target="_blank" rel="noopener">
             <span class="live-tiktok-play">▶</span>
             <span>Ver en TikTok Live</span>
           </a>`
        : `<iframe class="live-embed" src="${l.embedUrl}" allowfullscreen loading="lazy"></iframe>`;
      return `
      <div class="live-card" id="${l.id ? 'live-'+l.id : ''}">
        ${badge}
        ${cuerpo}
        <div class="live-info">
          <p class="live-vendedor">${l.vendedor}</p>
          ${l.productoLink ? `<a class="live-producto-link" href="${l.productoLink}" target="_blank" rel="noopener sponsored">🛒 Ver producto en venta</a>` : ''}
        </div>
      </div>`;
    }).join('');

    const htmlProgramados = programados.map(l => `
      <div class="live-card live-proximo" id="${l.id ? 'live-'+l.id : ''}">
        <div class="live-proximo-box">
          <span class="live-proximo-badge">PRÓXIMO LIVE</span>
          <p class="live-proximo-cuando">${tiempoRestante(l.fechaProgramada) || 'muy pronto'}</p>
        </div>
        <div class="live-info">
          <p class="live-vendedor" style="--live-dot-color:var(--ink-soft)">${l.vendedor}</p>
          <a class="live-calendario-link" href="${generarICS(l.vendedor, l.fechaProgramada)}" download="live-${l.id||'evento'}.ics">📅 Agregar a mi calendario</a>
        </div>
      </div>`).join('');

    scroll.innerHTML = htmlActivos + htmlProgramados;
  }

  if(ctaBtn && LIVES_WHATSAPP){
    const msg = 'Hola, quiero hacer un live de ventas en la app ¿Cómo le hago?';
    ctaBtn.href = `https://wa.me/${LIVES_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  } else if(ctaBtn){
    ctaBtn.style.display = 'none';
  }
}

const ICONS = {
  paw: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="17" cy="7" r="2"/><path d="M12 12c-4 0-6 2.5-6 5a3 3 0 0 0 6 1 3 3 0 0 0 6-1c0-2.5-2-5-6-5z"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z"/></svg>`,
  briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  cake: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M4 21h16M4 17h16M12 8V5"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  hand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 12V6a1.5 1.5 0 0 1 3 0v8M8 13l-2 1a2 2 0 0 0-1 2c0 3 3 6 7 6h1a6 6 0 0 0 6-6v-3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  bucket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8z"/><path d="M2 8h20M8 8V6a4 4 0 0 1 8 0v2" stroke-linecap="round"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>`,
  move: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h13M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  atm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4" stroke-linecap="round"/></svg>`,
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19" stroke-linecap="round"/></svg>`,
  keypad: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="1.4"/><circle cx="12" cy="7" r="1.4"/><circle cx="17" cy="7" r="1.4"/><circle cx="7" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="17" cy="12" r="1.4"/><circle cx="7" cy="17" r="1.4"/><circle cx="12" cy="17" r="1.4"/><circle cx="17" cy="17" r="1.4"/></svg>`,
  cash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 7L9.5 17.5 4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  receipt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5z"/><path d="M9 8h6M9 12h6" stroke-linecap="round"/></svg>`,
  broom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 4L9 14M4 20l3-6 3 3-6 3z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ruler: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="9" width="18" height="6" rx="1" transform="rotate(-8 12 12)"/><path d="M7 10l.5 2M11 9.5l.5 2M15 9l.5 2" stroke-linecap="round"/></svg>`,
  mix: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14M7 4l1.5 12a2 2 0 0 0 2 1.8h3a2 2 0 0 0 2-1.8L17 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12h6" stroke-linecap="round"/></svg>`,
  trowel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20l7-7M11 13l6-6 3 3-6 6-3-3z" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  tile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>`,
  cross: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v16M4 12h16" stroke-linecap="round"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  sponge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="10" rx="3"/><path d="M6 11h.01M10 11h.01M14 11h.01M18 11h.01" stroke-linecap="round"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 18L15 9" stroke-linecap="round"/><circle cx="17" cy="7" r="3"/><path d="M4 20l2-2" stroke-linecap="round"/></svg>`,
  screwdriver: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="14" width="6" height="3" rx="1" transform="rotate(-45 6 15.5)"/><path d="M9 12l7-7 3 3-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  hinge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="6" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="17" r="1" fill="currentColor" stroke="none"/></svg>`,
  valve: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="4"/><path d="M12 13v3M8 9H4M20 9h-4" stroke-linecap="round"/></svg>`,
  plug: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3v6M15 3v6M7 9h10v3a5 5 0 0 1-10 0z" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17v4" stroke-linecap="round"/></svg>`,
  bulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18h6M10 21h4" stroke-linecap="round"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.7V17h5.4v-1.4c0-.7.3-1.3.8-1.7A6 6 0 0 0 12 3z" stroke-linejoin="round"/></svg>`,
  shelf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8h18M6 8v5a2 2 0 0 0 2 2M18 8v5a2 2 0 0 1-2 2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  roller: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="12" height="6" rx="1"/><path d="M9 11v4M9 15h4a2 2 0 0 1 2 2v3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  glass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 4v16M4 12h16" stroke-linecap="round"/></svg>`,
  tire: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3" stroke-linecap="round"/></svg>`,
  battery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="8" width="17" height="8" rx="2"/><path d="M21 10v4" stroke-linecap="round"/></svg>`,
  cc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M8 10.5c-1.2 0-2 .8-2 2s.8 2 2 2M16 10.5c-1.2 0-2 .8-2 2s.8 2 2 2" stroke-linecap="round"/></svg>`,
  compress: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 3v4a2 2 0 0 1-2 2H3M15 3v4a2 2 0 0 0 2 2h4M9 21v-4a2 2 0 0 0-2-2H3M15 21v-4a2 2 0 0 1 2-2h4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-4 4-3-3-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3v18M5 4h13l-3 4 3 4H5" stroke-linejoin="round"/></svg>`,
  wifi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 9a11 11 0 0 1 14 0M8 12.5a6.5 6.5 0 0 1 8 0" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  branch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M6 8.2V15.8M6 8.2c0 3 3 3.8 8 3.8h1.8" stroke-linecap="round"/></svg>`,
  cloudUpload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18a4 4 0 0 1-1-7.9 5 5 0 0 1 9.6-1.6A4.5 4.5 0 0 1 17 18z" stroke-linejoin="round"/><path d="M12 20v-6M9.5 16.5L12 14l2.5 2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  bug: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="8" height="10" rx="4"/><path d="M8 11H4M8 15H4M16 11h4M16 15h4M9 8l-1.5-2M15 8l1.5-2M12 8V5" stroke-linecap="round"/></svg>`,
  iron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 16l2-8a4 4 0 0 1 4-3h6a6 6 0 0 1 6 6v5z" stroke-linejoin="round"/><path d="M3 16h18" stroke-linecap="round"/></svg>`,
  needle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20l9-9M13 11a3 3 0 1 0 4-4M20 4l-2 2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  suitcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke-linecap="round"/></svg>`,
  bed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 13V9a2 2 0 0 1 2-2h4v4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  egg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3C8 8 6 12 6 15a6 6 0 0 0 12 0c0-3-2-7-6-12z" stroke-linejoin="round"/></svg>`,
  bowl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11h18a9 6 0 0 1-18 0z" stroke-linejoin="round"/><path d="M12 3v4" stroke-linecap="round"/></svg>`,
  tie: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 4h6l-1 4-1.5 12-1.5 2-1.5-2L8 8z" stroke-linejoin="round"/></svg>`,
  hanger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4a2 2 0 1 1 2 2c-1 0-2 1-2 2v1l9 5H3l9-5v-1" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 19h16" stroke-linecap="round"/></svg>`,
  piggy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="13" rx="8" ry="6"/><path d="M12 7V4M9 19l-1 2M15 19l1 2M4 12H2" stroke-linecap="round"/></svg>`,
  percent: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 19L19 5" stroke-linecap="round"/><circle cx="7" cy="7" r="2.3"/><circle cx="17" cy="17" r="2.3"/></svg>`,
  extinguisher: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="9" width="8" height="12" rx="2"/><path d="M11 9V6h2v3M9 4h4M15 12l4-2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  medkit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M12 12v4M10 14h4" stroke-linecap="round"/></svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="15" r="3"/><path d="M10.5 12.5L20 3M16 7l3 3M13 10l2 2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke-linecap="round"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke-linejoin="round"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v12H8l-4 4z" stroke-linejoin="round"/></svg>`,
  qr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2"/></svg>`,
  drain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M9 9l6 6M15 9l-6 6" stroke-linecap="round"/></svg>`,
  switch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="4" width="10" height="16" rx="5"/><circle cx="12" cy="9" r="2" fill="currentColor" stroke="none"/></svg>`,
  drop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" stroke-linejoin="round"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8l9-5 9 5-9 5-9-5zm0 0v9l9 5 9-5V8M12 13v9" stroke-linejoin="round"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16l-6 8v6l-4 2v-8z" stroke-linejoin="round"/></svg>`,
  idcard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5M14 9h5M14 13h5" stroke-linecap="round"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 16V12l2-5h12l2 5v4" stroke-linejoin="round"/><rect x="2.5" y="13" width="19" height="5" rx="2"/><circle cx="7" cy="18" r="1.5" fill="currentColor" stroke="none"/><circle cx="17" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  printer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="8" width="14" height="8" rx="1"/><path d="M7 8V4h10v4M7 16v4h10v-4"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18a4 4 0 0 1-1-7.9 5 5 0 0 1 9.6-1.6A4.5 4.5 0 0 1 17 18z" stroke-linejoin="round"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" stroke-linecap="round"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h3l2-2h6l2 2h3v11H4z" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.5"/></svg>`,
  pen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" stroke-linejoin="round"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" stroke-linejoin="round"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" stroke-linecap="round"/></svg>`
};
function icon(name){ return ICONS[name] || ICONS.check; }

const CATS = {
  tec:    { label: 'Tecnología', class: 'tec' },
  dinero: { label: 'Dinero y trámites', class: 'dinero' },
  hogar:  { label: 'Hogar y oficios', class: 'hogar' }
};

const TUTORIALS = [
  {
    id: 'gmail-recuperar',
    destacada: true,
    cat: 'tec',
    title: 'Recuperar un correo que borré en Gmail',
    summary: 'Primero pasa por la papelera.',
    time: '3 min',
    youtubeQuery: 'como recuperar correo eliminado de gmail',
    materials: ['Tu teléfono o computadora', 'Saber tu contraseña de Gmail'],
    steps: [
      { icon:'mail', action:'Abre', target:'Gmail, con tu cuenta' },
      { icon:'menu', action:'Toca', target:'☰ (arriba a la izquierda)' },
      { icon:'trash', action:'Toca', target:'"Más" → "Papelera"' },
      { icon:'search', action:'Toca', target:'🔍 y escribe el remitente' },
      { icon:'move', action:'Toca', target:'⋮ → "Mover a" → Recibidos', warn: 'Pasados 30 días, Gmail lo borra para siempre.' }
    ]
  },
  {
    id: 'deposito-tarjeta',
    destacada: true,
    cat: 'dinero',
    title: 'Hacer un depósito con tarjeta en el cajero',
    summary: 'Mete efectivo sin ir a ventanilla.',
    time: '5 min',
    youtubeQuery: 'como depositar efectivo en cajero automatico con tarjeta',
    materials: ['Tu tarjeta de débito', 'El efectivo a depositar (billetes no muy doblados)', 'Tu NIP'],
    steps: [
      { icon:'atm', title: 'Busca un cajero con depósito', text: 'Busca el logo de "Depósito" o revisa la app de tu banco.' },
      { icon:'card', title: 'Inserta tarjeta y NIP', text: 'Como en cualquier retiro.' },
      { icon:'keypad', title: 'Elige "Depósito"', text: 'Selecciona la cuenta donde caerá el dinero.' },
      { icon:'cash', title: 'Introduce los billetes', text: 'Derechos, sin grapas ni clips.' },
      { icon:'check', title: 'Confirma el monto', text: 'Revisa que el total coincida antes de aceptar.', warn: 'Billete rechazado: no lo insertes húmedo o doblado.' },
      { icon:'receipt', title: 'Guarda tu comprobante', text: 'Foto o impreso, por si lo necesitas después.' }
    ]
  },
  {
    id: 'pegar-azulejo',
    producto: { nombre: 'Adhesivo y boquilla para azulejo', link: 'https://meli.la/2GtHR8P' },
    destacada: true,
    cat: 'hogar',
    title: 'Pegar azulejo en el piso',
    summary: 'Colocación pareja, sin experiencia previa.',
    time: '1–2 horas por cuarto pequeño',
    youtubeQuery: 'como pegar azulejo en el piso paso a paso',
    materials: ['Azulejo suficiente + 10% extra', 'Adhesivo/mortero para piso', 'Llana dentada', 'Crucetas niveladoras', 'Nivel', 'Esponja y cubeta', 'Boquilla (lechada) para las juntas'],
    steps: [
      { icon:'broom', title: 'Prepara la superficie', text: 'Limpia, seca y nivelada, sin polvo ni grasa.' },
      { icon:'ruler', title: 'Traza tus líneas guía', text: 'Marca el centro del cuarto con gis o hilo.' },
      { icon:'mix', title: 'Mezcla el adhesivo', text: 'Sigue el empaque hasta que quede como pasta espesa.' },
      { icon:'trowel', title: 'Aplica con la llana dentada', text: 'Un metro a la vez, surcos parejos en un solo sentido.' },
      { icon:'tile', title: 'Coloca el azulejo', text: 'Presiona con vaivén para que asiente bien.' },
      { icon:'cross', title: 'Usa crucetas', text: 'En cada esquina, para juntas parejas.', warn: 'Revisa el nivel cada 2 o 3 piezas.' },
      { icon:'clock', title: 'Deja secar', text: 'El tiempo que indique el empaque (usualmente 24 h).' },
      { icon:'trowel', title: 'Aplica la boquilla', text: 'Rellena las juntas en diagonal con llana de goma.' },
      { icon:'sponge', title: 'Limpia el excedente', text: 'Con esponja húmeda, antes de que seque.' }
    ]
  },
  {
    id: 'bisagras-puerta',
    producto: { nombre: 'Bisagras para puerta', link: 'https://meli.la/2sP35kR' },
    cat: 'hogar',
    title: 'Cambiar las bisagras de una puerta',
    summary: 'Para que deje de rechinar o cierre chueco.',
    time: '20–30 min',
    youtubeQuery: 'como cambiar bisagras de una puerta',
    materials: ['Bisagras nuevas (mismo tamaño)', 'Destornillador', 'Cuña para sostener la puerta'],
    steps: [
      { icon:'wrench', title: 'Sostén la puerta', text: 'Coloca una cuña por debajo para que no se mueva.' },
      { icon:'screwdriver', title: 'Quita los tornillos', text: 'Empieza por la bisagra de en medio.' },
      { icon:'hinge', title: 'Retira la bisagra vieja', text: 'Guárdala para comparar el tamaño de la nueva.' },
      { icon:'hinge', title: 'Coloca la nueva', text: 'Alinéala con los mismos agujeros si es posible.', warn: 'Si los agujeros no cierran, rellena con un palillo y pegamento antes de atornillar.' },
      { icon:'screwdriver', title: 'Atornilla firme', text: 'Sin apretar de más para no barrer la madera.' },
      { icon:'check', title: 'Repite y prueba', text: 'Haz lo mismo en las demás y checa que cierre parejo.' }
    ]
  },
  {
    id: 'excusado-mecanismo',
    producto: { nombre: 'Mecanismo de excusado (flotador y válvula)', link: 'https://meli.la/2gifNeD' },
    cat: 'hogar',
    title: 'Cambiar el mecanismo del excusado',
    summary: 'Cuando no deja de correr agua o no jala bien.',
    time: '30–45 min',
    youtubeQuery: 'como cambiar el mecanismo de un excusado wc',
    materials: ['Mecanismo nuevo (flotador y válvula)', 'Llave de perico', 'Trapo', 'Cubeta chica'],
    steps: [
      { icon:'valve', title: 'Cierra la llave de paso', text: 'Está detrás o debajo del excusado.' },
      { icon:'valve', title: 'Vacía el tanque', text: 'Jala la palanca y saca lo que quede con una taza.' },
      { icon:'wrench', title: 'Desconecta la manguera', text: 'Con la llave de perico. Ten el trapo listo.' },
      { icon:'screwdriver', title: 'Quita el mecanismo viejo', text: 'Desatornilla la tuerca de abajo del tanque.' },
      { icon:'valve', title: 'Coloca el nuevo', text: 'Ajusta la altura del flotador antes de fijarlo.' },
      { icon:'wrench', title: 'Conecta y abre el agua', text: 'Revisa que no gotee.', warn: 'Si gotea, aprieta un poco más la tuerca, sin forzar.' },
      { icon:'check', title: 'Prueba la descarga', text: 'El tanque debe llenarse y cerrarse solo.' }
    ]
  },
  {
    id: 'cambiar-foco',
    producto: { nombre: 'Foco LED', link: 'https://meli.la/2Kh9aJa' },
    destacada: true,
    cat: 'hogar',
    title: 'Cambiar un foco',
    summary: 'Lo básico, con cuidado de no quemarte.',
    time: '5 min',
    youtubeQuery: 'como cambiar un foco correctamente',
    materials: ['Foco nuevo (mismo tipo y watts)', 'Banco o escalera si hace falta'],
    steps: [
      { icon:'plug', title: 'Apaga el interruptor', text: 'Espera a que el foco se enfríe si estaba prendido.' },
      { icon:'screwdriver', title: 'Quita el foco viejo', text: 'Gira hacia la izquierda para aflojarlo.', warn: 'Nunca lo toques con las manos mojadas.' },
      { icon:'bulb', title: 'Revisa el nuevo', text: 'Mismo tipo de rosca y watts que el anterior.' },
      { icon:'bulb', title: 'Coloca el foco nuevo', text: 'Gira a la derecha, sin apretar de más.' },
      { icon:'plug', title: 'Enciende para probar', text: 'Debe prender parejo, sin parpadear.' }
    ]
  },
  {
    id: 'colgar-repisa',
    categoriaProfesional: 'Carpintero',
    producto: { nombre: 'Kit de repisa con soportes', link: 'https://meli.la/1aXowqe' },
    cat: 'hogar',
    title: 'Colgar o cambiar una repisa',
    summary: 'Para que quede firme y bien nivelada.',
    time: '20 min',
    youtubeQuery: 'como colgar una repisa en la pared',
    materials: ['Repisa', 'Soportes o escuadras', 'Taquetes y tornillos', 'Taladro', 'Nivel'],
    steps: [
      { icon:'ruler', title: 'Marca la altura', text: 'Usa el nivel para que quede derecha.' },
      { icon:'shelf', title: 'Marca los soportes', text: 'Señala dónde van los agujeros de cada escuadra.' },
      { icon:'wrench', title: 'Taladra los agujeros', text: 'Usa la broca del tamaño del taquete.', warn: 'Evita taladrar donde pueda haber cables o tubería.' },
      { icon:'screwdriver', title: 'Coloca los taquetes', text: 'Empújalos hasta que queden a ras de la pared.' },
      { icon:'shelf', title: 'Atornilla los soportes', text: 'Firmes, sin forzar el taquete.' },
      { icon:'check', title: 'Coloca la repisa', text: 'Verifica que esté nivelada antes de poner peso.' }
    ]
  },

  { id:'transferencia-bancaria', destacada:true, cat:'dinero', title:'Hacer una transferencia bancaria', summary:'Aplica en Santander, HSBC, BBVA y otros.', time:'5 min', youtubeQuery:'como hacer una transferencia bancaria desde la app',
    materials:['App de tu banco', 'CLABE o número de cuenta destino'],
    steps:[
      {icon:'keypad', title:'Entra a tu app', text:'Con usuario, contraseña o huella.'},
      {icon:'search', title:'Busca "Transferir"', text:'A veces dice "Enviar dinero".'},
      {icon:'card', title:'Agrega la cuenta destino', text:'CLABE o número, si es nueva.'},
      {icon:'cash', title:'Escribe el monto', text:'Revisa los datos antes de seguir.'},
      {icon:'shield', title:'Confirma con tu clave', text:'NIP, token o código SMS.', warn:'Los botones cambian según el banco, pero el proceso es el mismo.'},
      {icon:'receipt', title:'Guarda el folio', text:'Por si necesitas comprobarla.'}
    ]
  },
  { id:'consultar-saldo', cat:'dinero', title:'Consultar tu saldo desde la app', summary:'Rápido, sin ir al cajero.', time:'1 min', youtubeQuery:'como ver mi saldo en la app del banco',
    materials:['App de tu banco'],
    steps:[
      {icon:'keypad', title:'Abre tu app', text:'Inicia sesión como siempre.'},
      {icon:'card', title:'Toca tu cuenta', text:'El saldo aparece arriba de los movimientos.'},
      {icon:'check', title:'Desliza para actualizar', text:'Por si el dato está desactualizado.'}
    ]
  },
  { id:'bloquear-tarjeta', cat:'dinero', title:'Bloquear tu tarjeta si la perdiste', summary:'Hazlo apenas te des cuenta.', time:'2 min', youtubeQuery:'como bloquear mi tarjeta de debito desde la app',
    materials:['App o número telefónico de tu banco'],
    steps:[
      {icon:'lock', title:'Entra a tu app', text:'O marca al número de atención de tu banco.'},
      {icon:'card', title:'Selecciona la tarjeta', text:'Busca "Bloquear" o "Reportar pérdida".'},
      {icon:'shield', title:'Confirma el bloqueo', text:'Es inmediato en la mayoría de los bancos.', warn:'Si ves cargos que no reconoces, repórtalos de una vez.'},
      {icon:'check', title:'Pide tu tarjeta nueva', text:'Desde la misma app o en sucursal.'}
    ]
  },
  { id:'retiro-sin-tarjeta', cat:'dinero', title:'Sacar dinero sin tarjeta en el cajero', summary:'Con un código desde tu celular.', time:'3 min', youtubeQuery:'como retirar dinero sin tarjeta con codigo',
    materials:['App de tu banco', 'Cajero que acepte retiro sin tarjeta'],
    steps:[
      {icon:'keypad', title:'Genera el código', text:'Busca "Retiro sin tarjeta" en tu app.'},
      {icon:'cash', title:'Elige el monto', text:'El código suele durar pocos minutos.'},
      {icon:'atm', title:'Ve al cajero', text:'Selecciona "Retiro sin tarjeta" en la pantalla.'},
      {icon:'check', title:'Ingresa el código', text:'Y tu NIP cuando te lo pida.'}
    ]
  },
  { id:'pagar-servicio', cat:'dinero', title:'Pagar un servicio (luz, agua) desde la app', summary:'Sin hacer fila.', time:'3 min', youtubeQuery:'como pagar recibo de luz o agua desde la app del banco',
    materials:['App de tu banco', 'Tu recibo o número de referencia'],
    steps:[
      {icon:'keypad', title:'Entra a "Pago de servicios"', text:'Dentro del menú principal.'},
      {icon:'search', title:'Busca la empresa', text:'CFE, agua, gas, etc.'},
      {icon:'card', title:'Ingresa tu referencia', text:'Viene en el recibo.'},
      {icon:'check', title:'Confirma el pago', text:'Guarda el comprobante que te da la app.'}
    ]
  },
  { id:'activar-tarjeta', cat:'dinero', title:'Activar una tarjeta nueva', summary:'Antes de usarla por primera vez.', time:'2 min', youtubeQuery:'como activar mi tarjeta de debito nueva',
    materials:['Tu tarjeta nueva', 'App o cajero de tu banco'],
    steps:[
      {icon:'card', title:'Entra a tu app', text:'Busca "Activar tarjeta".'},
      {icon:'keypad', title:'Ingresa los datos', text:'Últimos dígitos y fecha de vencimiento.'},
      {icon:'lock', title:'Crea tu NIP', text:'Evita fechas de nacimiento obvias.'},
      {icon:'check', title:'Ya puedes usarla', text:'Pruébala primero en un cajero de tu banco.'}
    ]
  },
  { id:'estado-cuenta', cat:'dinero', title:'Descargar tu estado de cuenta', summary:'Para trámites o revisar gastos.', time:'2 min', youtubeQuery:'como descargar mi estado de cuenta bancario',
    materials:['App o página del banco'],
    steps:[
      {icon:'search', title:'Busca "Estados de cuenta"', text:'Suele estar en el menú de tu cuenta.'},
      {icon:'menu', title:'Elige el mes', text:'Puedes descargar varios meses atrás.'},
      {icon:'receipt', title:'Descárgalo en PDF', text:'Ábrelo o compártelo desde ahí mismo.'}
    ]
  },
  { id:'domiciliar-pago', cat:'dinero', title:'Domiciliar un pago automático', summary:'Para no olvidar pagar cada mes.', time:'4 min', youtubeQuery:'como domiciliar un pago automatico en mi tarjeta',
    materials:['App de tu banco', 'Datos del servicio a domiciliar'],
    steps:[
      {icon:'search', title:'Busca "Domiciliación"', text:'En el menú de tu tarjeta o cuenta.'},
      {icon:'card', title:'Elige la tarjeta de cargo', text:'De donde saldrá el pago cada mes.'},
      {icon:'check', title:'Confirma el servicio', text:'Revisa fecha y monto estimado.', warn:'Deja saldo suficiente para el día del cargo.'}
    ]
  },
  { id:'reportar-cargo', cat:'dinero', title:'Reportar un cargo que no reconoces', summary:'Actúa rápido, hay tiempo límite.', time:'5 min', youtubeQuery:'como reportar un cargo no reconocido a mi banco',
    materials:['App o teléfono de tu banco'],
    steps:[
      {icon:'search', title:'Encuentra el movimiento', text:'En tu historial de la app.'},
      {icon:'shield', title:'Toca "Reportar cargo"', text:'O marca a atención a clientes.'},
      {icon:'lock', title:'Bloquea tu tarjeta', text:'Si el cargo sigue apareciendo.'},
      {icon:'check', title:'Guarda tu folio', text:'Es tu comprobante de la aclaración.', warn:'Los bancos tienen un plazo límite para aclaraciones, no lo dejes pasar.'}
    ]
  },

  { id:'enviar-correo-gmail', cat:'tec', title:'Enviar un correo en Gmail', summary:'Lo básico para empezar.', time:'2 min', youtubeQuery:'como enviar un correo en gmail',
    materials:['Cuenta de Gmail'],
    steps:[
      {icon:'mail', title:'Abre Gmail', text:'Toca el botón "Redactar".'},
      {icon:'search', title:'Escribe el destinatario', text:'En el campo "Para".'},
      {icon:'check', title:'Agrega asunto y mensaje', text:'Y toca el avión de papel para enviar.'}
    ]
  },
  { id:'crear-cuenta-gmail', cat:'tec', title:'Crear una cuenta de Gmail', summary:'Correo nuevo en pocos pasos.', time:'5 min', youtubeQuery:'como crear una cuenta de gmail nueva',
    materials:['Teléfono o computadora', 'Un número para verificar'],
    steps:[
      {icon:'mail', title:'Entra a "Crear cuenta"', text:'Desde la app o gmail.com.'},
      {icon:'keypad', title:'Llena tus datos', text:'Nombre y fecha de nacimiento.'},
      {icon:'lock', title:'Elige tu contraseña', text:'Que no uses en otro lado.'},
      {icon:'shield', title:'Verifica tu número', text:'Te llega un código por SMS.'},
      {icon:'check', title:'Acepta los términos', text:'Y listo, ya puedes usar tu correo.'}
    ]
  },
  { id:'password-gmail', cat:'tec', title:'Cambiar la contraseña de Gmail', summary:'Si crees que alguien más la sabe.', time:'2 min', youtubeQuery:'como cambiar mi contraseña de gmail',
    materials:['Acceso actual a tu cuenta'],
    steps:[
      {icon:'lock', title:'Ve a tu cuenta de Google', text:'Ícono de tu foto → "Administrar tu cuenta".'},
      {icon:'shield', title:'Entra a "Seguridad"', text:'Busca "Contraseña".'},
      {icon:'key', title:'Escribe la actual', text:'Te la vuelve a pedir por seguridad.'},
      {icon:'check', title:'Crea la nueva', text:'Diferente a las que ya usaste antes.'}
    ]
  },
  { id:'2fa-gmail', cat:'tec', title:'Activar verificación en dos pasos', summary:'Para que nadie más entre a tu cuenta.', time:'3 min', youtubeQuery:'como activar verificacion en dos pasos gmail',
    materials:['Tu teléfono'],
    steps:[
      {icon:'shield', title:'Entra a "Seguridad"', text:'Dentro de tu cuenta de Google.'},
      {icon:'lock', title:'Busca "Verificación en 2 pasos"', text:'Y actívala.'},
      {icon:'qr', title:'Vincula tu teléfono', text:'Por SMS o app de autenticación.'},
      {icon:'check', title:'Guarda tus códigos de respaldo', text:'Por si pierdes el teléfono.'}
    ]
  },
  { id:'crear-repo-github', cat:'tec', title:'Crear un repositorio en GitHub', summary:'Para guardar y compartir tu código.', time:'3 min', youtubeQuery:'como crear un repositorio en github',
    materials:['Cuenta de GitHub'],
    steps:[
      {icon:'key', title:'Toca el botón "+"', text:'Arriba a la derecha → "New repository".'},
      {icon:'search', title:'Ponle un nombre', text:'Sin espacios, minúsculas de preferencia.'},
      {icon:'check', title:'Elige público o privado', text:'Y toca "Create repository".'}
    ]
  },
  { id:'subir-codigo-github', cat:'tec', title:'Subir tu código a GitHub', summary:'Cuando ya tienes el repo creado.', time:'5 min', youtubeQuery:'como subir mi codigo a github paso a paso',
    materials:['Repositorio creado', 'Git instalado o usar la web'],
    steps:[
      {icon:'search', title:'Abre tu repositorio', text:'Toca "Add file" → "Upload files".'},
      {icon:'box', title:'Arrastra tus archivos', text:'O selecciónalos desde tu carpeta.'},
      {icon:'check', title:'Escribe un mensaje', text:'Qué cambiaste, y toca "Commit changes".'}
    ]
  },
  { id:'token-github', cat:'tec', title:'Generar un token de acceso en GitHub', summary:'La "llave" para conectar otras apps.', time:'3 min', youtubeQuery:'como generar un token de github personal access token',
    materials:['Cuenta de GitHub'],
    steps:[
      {icon:'key', title:'Ve a "Settings"', text:'Desde tu foto de perfil.'},
      {icon:'lock', title:'Entra a "Developer settings"', text:'Hasta abajo del menú.'},
      {icon:'key', title:'Crea un "Personal access token"', text:'Elige qué permisos va a tener.'},
      {icon:'shield', title:'Cópialo y guárdalo', text:'Solo se muestra una vez.', warn:'Nunca compartas tu token: es como una contraseña.'}
    ]
  },
  { id:'api-instagram', cat:'tec', title:'Conectar una API en Instagram', summary:'Para apps que publican o leen datos.', time:'10 min', youtubeQuery:'como conectar api de instagram graph api',
    materials:['Cuenta de Instagram profesional', 'Cuenta en Meta for Developers'],
    steps:[
      {icon:'key', title:'Crea una app en Meta Developers', text:'developers.facebook.com → "Mis apps".'},
      {icon:'search', title:'Agrega el producto "Instagram"', text:'Desde el panel de tu app.'},
      {icon:'lock', title:'Vincula tu cuenta profesional', text:'Debe ser cuenta de empresa o creador.'},
      {icon:'key', title:'Genera tu token de acceso', text:'Y guárdalo en tu app o código.', warn:'No lo pongas nunca directo en una página pública.'}
    ]
  },
  { id:'api-gemini', cat:'tec', title:'Obtener una API key de Gemini', summary:'Para usar la IA de Google en tus apps.', time:'3 min', youtubeQuery:'como obtener api key de gemini google ai studio',
    materials:['Cuenta de Google'],
    steps:[
      {icon:'search', title:'Entra a Google AI Studio', text:'aistudio.google.com'},
      {icon:'key', title:'Toca "Get API key"', text:'Crea un proyecto si te lo pide.'},
      {icon:'shield', title:'Copia tu llave', text:'Guárdala en un lugar seguro.', warn:'No la subas a un repositorio público de GitHub.'}
    ]
  },
  { id:'password-instagram', cat:'tec', title:'Recuperar tu contraseña de Instagram', summary:'Si ya no puedes entrar.', time:'3 min', youtubeQuery:'como recuperar mi contraseña de instagram',
    materials:['Tu número o correo registrado'],
    steps:[
      {icon:'lock', title:'Toca "¿Olvidaste tu contraseña?"', text:'En la pantalla de inicio de sesión.'},
      {icon:'search', title:'Ingresa tu usuario o correo', text:'El que usaste al registrarte.'},
      {icon:'shield', title:'Sigue el enlace o código', text:'Te llega por correo o SMS.'},
      {icon:'check', title:'Crea tu nueva contraseña', text:'Distinta a las anteriores.'}
    ]
  },
  { id:'whatsapp-web', destacada:true, cat:'tec', title:'Vincular WhatsApp Web con tu celular', summary:'Para usarlo desde la computadora.', time:'2 min', youtubeQuery:'como vincular whatsapp web con mi celular',
    materials:['Tu celular con WhatsApp', 'Computadora con internet'],
    steps:[
      {icon:'chat', title:'Entra a web.whatsapp.com', text:'En la computadora.'},
      {icon:'menu', title:'Abre WhatsApp en tu celular', text:'Toca los tres puntos → "Dispositivos vinculados".'},
      {icon:'qr', title:'Escanea el código QR', text:'El que aparece en la computadora.'},
      {icon:'check', title:'Listo', text:'Tus chats aparecen en la pantalla grande.'}
    ]
  },

  { id:'destapar-cano', cat:'hogar', title:'Destapar un caño o drenaje tapado', summary:'Antes de llamar al plomero.', time:'15 min', youtubeQuery:'como destapar un cano tapado facil',
    materials:['Ventosa (destapacaños)', 'Agua caliente', 'Guantes'],
    steps:[
      {icon:'drop', title:'Saca el agua estancada', text:'Con una taza si hay mucha.'},
      {icon:'drain', title:'Coloca la ventosa', text:'Que cubra bien el desagüe.'},
      {icon:'wrench', title:'Bombea con fuerza', text:'Varias veces, sin levantarla del todo.'},
      {icon:'drop', title:'Enjuaga con agua caliente', text:'Para arrastrar lo que se soltó.', warn:'No mezcles productos químicos destapacaños distintos entre sí.'}
    ]
  },
  { id:'cambiar-apagador', producto:{ nombre:'Apagador o contacto de luz', link:'https://meli.la/1JPySD1' }, categoriaProfesional:'Electricista', cat:'hogar', title:'Cambiar un apagador o contacto', summary:'Con la corriente apagada, siempre.', time:'20 min', youtubeQuery:'como cambiar un apagador de luz paso a paso',
    materials:['Apagador o contacto nuevo', 'Desarmador de cruz y plano', 'Probador de corriente'],
    steps:[
      {icon:'plug', title:'Apaga el interruptor general', text:'O el de ese circuito específico.'},
      {icon:'switch', title:'Verifica que no hay corriente', text:'Con un probador de voltaje.', warn:'Nunca trabajes en un contacto con la luz encendida.'},
      {icon:'screwdriver', title:'Quita la placa y el apagador', text:'Toma foto de cómo van los cables.'},
      {icon:'wrench', title:'Conecta el nuevo', text:'En el mismo orden que el viejo.'},
      {icon:'check', title:'Enciende y prueba', text:'Debe funcionar sin chispas ni olor raro.'}
    ]
  },
  { id:'sellar-gotera', categoriaProfesional:'Albañil', cat:'hogar', title:'Sellar una gotera pequeña', summary:'Solución rápida mientras llega el arreglo definitivo.', time:'20 min', youtubeQuery:'como sellar una gotera pequeña en el techo',
    materials:['Sellador impermeabilizante', 'Espátula', 'Trapo seco'],
    steps:[
      {icon:'sponge', title:'Seca bien la zona', text:'El sellador no pega sobre humedad.'},
      {icon:'trowel', title:'Aplica el sellador', text:'En capa pareja sobre la grieta.'},
      {icon:'clock', title:'Deja secar', text:'El tiempo que diga el empaque.'},
      {icon:'check', title:'Revisa con la próxima lluvia', text:'Si vuelve a filtrar, necesita reparación mayor.'}
    ]
  },
  { id:'armar-mueble', categoriaProfesional:'Carpintero', cat:'hogar', title:'Armar un mueble con instrucciones', summary:'Para que no te falten piezas a la mitad.', time:'30–60 min', youtubeQuery:'como armar un mueble de caja paso a paso',
    materials:['El mueble en caja', 'Desarmador', 'Espacio despejado'],
    steps:[
      {icon:'box', title:'Acomoda todas las piezas', text:'Y cuenta que estén completas.'},
      {icon:'search', title:'Ubica el diagrama principal', text:'Sigue el orden que marca el manual.'},
      {icon:'screwdriver', title:'Arma por secciones', text:'Sin apretar del todo hasta el final.'},
      {icon:'wrench', title:'Aprieta todo al final', text:'Cuando ya esté completa la estructura.'},
      {icon:'check', title:'Revisa que no se tambalee', text:'Antes de acomodarlo en su lugar.'}
    ]
  },
  { id:'cambiar-filtro-agua', recordatorioMeses:6, producto:{ nombre:'Filtro para purificador de agua', link:'https://listado.mercadolibre.com.mx/filtro-para-purificador-de-agua' }, cat:'hogar', title:'Cambiar el filtro de un purificador', summary:'Para que el agua siga saliendo limpia.', time:'10 min', youtubeQuery:'como cambiar el filtro de un purificador de agua',
    materials:['Filtro nuevo (mismo modelo)', 'Trapo'],
    steps:[
      {icon:'valve', title:'Cierra la llave de agua', text:'La que alimenta el purificador.'},
      {icon:'filter', title:'Abre la carcasa del filtro', text:'Gira o desengancha según el modelo.'},
      {icon:'sponge', title:'Saca el filtro viejo', text:'Ten un trapo listo, escurre un poco.'},
      {icon:'filter', title:'Coloca el nuevo', text:'Revisa que quede bien sellado.'},
      {icon:'check', title:'Abre el agua y deja correr', text:'Unos minutos antes de tomarla.'}
    ]
  },

  { id:'curp-linea', cat:'dinero', title:'Sacar tu CURP en línea', summary:'Gratis, sin ir a ninguna oficina.', time:'3 min', youtubeQuery:'como sacar mi curp en linea',
    materials:['Tu CURP o datos de tu acta'],
    steps:[
      {icon:'globe', action:'Entra a', target:'gob.mx/curp'},
      {icon:'idcard', action:'Escribe', target:'tu CURP o tus datos personales'},
      {icon:'check', action:'Toca', target:'"Buscar"'},
      {icon:'printer', action:'Descarga', target:'el PDF o imprímelo'}
    ]
  },
  { id:'rfc-sat', cat:'dinero', title:'Sacar tu RFC en el SAT', summary:'Para facturar o trabajar formalmente.', time:'10 min', youtubeQuery:'como sacar mi rfc por internet sat',
    materials:['CURP', 'Correo electrónico'],
    steps:[
      {icon:'globe', action:'Entra a', target:'sat.gob.mx'},
      {icon:'idcard', action:'Toca', target:'"Preinscripción al RFC"'},
      {icon:'keypad', action:'Llena', target:'tus datos con tu CURP'},
      {icon:'mail', action:'Revisa', target:'tu correo para la confirmación'},
      {icon:'check', action:'Agenda', target:'tu cita si piden trámite presencial'}
    ]
  },
  { id:'renovar-ine', cat:'dinero', title:'Renovar tu INE', summary:'Antes de que venza.', time:'5 min (cita)', youtubeQuery:'como renovar mi ine credencial para votar',
    materials:['INE actual', 'Comprobante de domicilio'],
    steps:[
      {icon:'globe', action:'Entra a', target:'ine.mx'},
      {icon:'pin', action:'Toca', target:'"Agenda tu cita"'},
      {icon:'search', action:'Elige', target:'tu módulo más cercano'},
      {icon:'idcard', action:'Lleva', target:'tus documentos el día de la cita'}
    ]
  },
  { id:'cita-pasaporte', cat:'dinero', title:'Sacar cita para el pasaporte', summary:'Se satura rápido, agenda con tiempo.', time:'5 min', youtubeQuery:'como sacar cita para pasaporte mexicano',
    materials:['CURP', 'Acta de nacimiento'],
    steps:[
      {icon:'globe', action:'Entra a', target:'citas.sre.gob.mx'},
      {icon:'pin', action:'Elige', target:'tu estado y oficina'},
      {icon:'keypad', action:'Llena', target:'tus datos personales'},
      {icon:'check', action:'Confirma', target:'fecha y hora, guarda tu folio'}
    ]
  },
  { id:'semanas-imss', cat:'dinero', title:'Consultar tus semanas cotizadas', summary:'Para saber cómo va tu pensión.', time:'3 min', youtubeQuery:'como consultar mis semanas cotizadas imss',
    materials:['NSS (número de seguro social)'],
    steps:[
      {icon:'globe', action:'Entra a', target:'imss.gob.mx'},
      {icon:'lock', action:'Toca', target:'"Mi IMSS en línea"'},
      {icon:'idcard', action:'Ingresa', target:'con tu NSS y contraseña'},
      {icon:'check', action:'Toca', target:'"Semanas cotizadas"'}
    ]
  },
  { id:'password-sat', cat:'dinero', title:'Recuperar tu contraseña del SAT', summary:'La CIEC, para entrar sin e.firma.', time:'5 min', youtubeQuery:'como recuperar mi contraseña del sat ciec',
    materials:['RFC', 'Correo registrado'],
    steps:[
      {icon:'globe', action:'Entra a', target:'sat.gob.mx'},
      {icon:'lock', action:'Toca', target:'"¿Olvidaste tu contraseña?"'},
      {icon:'idcard', action:'Escribe', target:'tu RFC'},
      {icon:'mail', action:'Revisa', target:'tu correo y sigue el enlace'},
      {icon:'key', action:'Crea', target:'tu nueva contraseña'}
    ]
  },
  { id:'tenencia-linea', cat:'dinero', title:'Pagar la tenencia en línea', summary:'Sin ir a ventanilla.', time:'5 min', youtubeQuery:'como pagar la tenencia vehicular en linea',
    materials:['Tarjeta de circulación', 'Tarjeta bancaria'],
    steps:[
      {icon:'globe', action:'Entra a', target:'la página de tu estado'},
      {icon:'car', action:'Escribe', target:'tu placa o línea de captura'},
      {icon:'cash', action:'Revisa', target:'el monto a pagar'},
      {icon:'card', action:'Paga', target:'con tu tarjeta'},
      {icon:'receipt', action:'Guarda', target:'tu comprobante'}
    ]
  },
  { id:'constancia-fiscal', cat:'dinero', title:'Sacar tu constancia de situación fiscal', summary:'La piden mucho para trámites y trabajo.', time:'3 min', youtubeQuery:'como descargar mi constancia de situacion fiscal sat',
    materials:['RFC y contraseña del SAT'],
    steps:[
      {icon:'globe', action:'Entra a', target:'sat.gob.mx'},
      {icon:'lock', action:'Ingresa', target:'con tu RFC y contraseña'},
      {icon:'search', action:'Busca', target:'"Constancia de situación fiscal"'},
      {icon:'printer', action:'Descarga', target:'el PDF'}
    ]
  },
  { id:'verificacion-vehicular', cat:'dinero', title:'Sacar cita de verificación vehicular', summary:'Para no acumular multas.', time:'5 min', youtubeQuery:'como sacar cita de verificacion vehicular',
    materials:['Placas del auto'],
    steps:[
      {icon:'globe', action:'Entra a', target:'el sitio de verificación de tu estado'},
      {icon:'car', action:'Escribe', target:'tu placa'},
      {icon:'pin', action:'Elige', target:'verificentro y horario'},
      {icon:'check', action:'Confirma', target:'y guarda tu cita'}
    ]
  },

  { id:'pedir-uber', cat:'tec', title:'Pedir un viaje en Uber o DiDi', summary:'Lo básico si nunca lo has usado.', time:'2 min', youtubeQuery:'como pedir un viaje en uber por primera vez',
    materials:['App instalada', 'Tarjeta o efectivo configurado'],
    steps:[
      {icon:'pin', action:'Escribe', target:'a dónde vas'},
      {icon:'car', action:'Elige', target:'el tipo de viaje'},
      {icon:'card', action:'Confirma', target:'tu forma de pago'},
      {icon:'check', action:'Toca', target:'"Confirmar viaje"'}
    ]
  },
  { id:'pedir-domicilio', cat:'tec', title:'Pedir comida a domicilio', summary:'Uber Eats, Rappi o similar.', time:'3 min', youtubeQuery:'como pedir comida a domicilio por app',
    materials:['App instalada', 'Dirección guardada'],
    steps:[
      {icon:'search', action:'Busca', target:'el restaurante'},
      {icon:'check', action:'Elige', target:'tus platillos'},
      {icon:'card', action:'Confirma', target:'dirección y pago'},
      {icon:'pin', action:'Sigue', target:'el pedido en el mapa'}
    ]
  },
  { id:'password-facebook', cat:'tec', title:'Recuperar tu contraseña de Facebook', summary:'Si ya no puedes entrar.', time:'3 min', youtubeQuery:'como recuperar mi contraseña de facebook',
    materials:['Correo o número registrado'],
    steps:[
      {icon:'lock', action:'Toca', target:'"¿Olvidaste tu contraseña?"'},
      {icon:'search', action:'Escribe', target:'tu correo, número o nombre'},
      {icon:'mail', action:'Revisa', target:'el código que te llega'},
      {icon:'key', action:'Crea', target:'tu nueva contraseña'}
    ]
  },
  { id:'descargar-fotos-facebook', cat:'tec', title:'Descargar tus fotos de Facebook', summary:'Antes de borrar o desactivar tu cuenta.', time:'5 min', youtubeQuery:'como descargar mis fotos de facebook',
    materials:['Cuenta de Facebook'],
    steps:[
      {icon:'gear', action:'Entra a', target:'Configuración → "Tu información"'},
      {icon:'cloud', action:'Toca', target:'"Descargar tu información"'},
      {icon:'check', action:'Elige', target:'fotos y videos'},
      {icon:'mail', action:'Espera', target:'el correo con tu archivo'}
    ]
  },
  { id:'cancelar-netflix', cat:'tec', title:'Cancelar tu suscripción de Netflix', summary:'Para que no te sigan cobrando.', time:'2 min', youtubeQuery:'como cancelar mi suscripcion de netflix',
    materials:['Cuenta de Netflix'],
    steps:[
      {icon:'gear', action:'Entra a', target:'"Cuenta" en tu perfil'},
      {icon:'search', action:'Busca', target:'"Cancelar membresía"'},
      {icon:'check', action:'Confirma', target:'la cancelación'}
    ]
  },
  { id:'modo-oscuro-whatsapp', cat:'tec', title:'Activar el modo oscuro en WhatsApp', summary:'Para cuidar tu vista y batería.', time:'1 min', youtubeQuery:'como activar modo oscuro en whatsapp',
    materials:['WhatsApp actualizado'],
    steps:[
      {icon:'gear', action:'Toca', target:'⋮ → "Configuración"'},
      {icon:'search', action:'Entra a', target:'"Chats" → "Tema"'},
      {icon:'check', action:'Elige', target:'"Oscuro"'}
    ]
  },
  { id:'videollamada-whatsapp', cat:'tec', title:'Hacer una videollamada por WhatsApp', summary:'Con una o varias personas.', time:'1 min', youtubeQuery:'como hacer una videollamada en whatsapp',
    materials:['WhatsApp', 'Buena conexión a internet'],
    steps:[
      {icon:'chat', action:'Abre', target:'el chat de la persona'},
      {icon:'camera', action:'Toca', target:'el ícono de cámara (arriba)'},
      {icon:'check', action:'Espera', target:'a que conteste'}
    ]
  },
  { id:'ubicacion-whatsapp', cat:'tec', title:'Compartir tu ubicación en tiempo real', summary:'Para que sepan dónde andas.', time:'1 min', youtubeQuery:'como compartir ubicacion en tiempo real whatsapp',
    materials:['WhatsApp con GPS activado'],
    steps:[
      {icon:'chat', action:'Abre', target:'el chat'},
      {icon:'pin', action:'Toca', target:'📎 → "Ubicación"'},
      {icon:'clock', action:'Elige', target:'"Compartir en tiempo real"'},
      {icon:'check', action:'Selecciona', target:'por cuánto tiempo'}
    ]
  },
  { id:'backup-celular', cat:'tec', title:'Hacer un backup de tu celular', summary:'Por si lo pierdes o lo cambias.', time:'10 min', youtubeQuery:'como hacer un backup de mi celular android o iphone',
    materials:['WiFi', 'Cuenta de Google o iCloud'],
    steps:[
      {icon:'gear', action:'Entra a', target:'Ajustes → tu cuenta'},
      {icon:'cloud', action:'Toca', target:'"Copia de seguridad"'},
      {icon:'check', action:'Activa', target:'y espera a que termine'}
    ]
  },
  { id:'liberar-espacio', cat:'tec', title:'Liberar espacio en tu celular', summary:'Cuando ya no te deja instalar nada.', time:'5 min', youtubeQuery:'como liberar espacio de almacenamiento en mi celular',
    materials:['Ninguno'],
    steps:[
      {icon:'gear', action:'Entra a', target:'Ajustes → "Almacenamiento"'},
      {icon:'search', action:'Revisa', target:'qué apps y fotos ocupan más'},
      {icon:'trash', action:'Borra', target:'lo que ya no uses'},
      {icon:'cloud', action:'Sube', target:'tus fotos a la nube antes de borrarlas'}
    ]
  },
  { id:'correo-trabajo-celular', cat:'tec', title:'Configurar tu correo del trabajo', summary:'Para recibirlo en tu celular.', time:'5 min', youtubeQuery:'como configurar correo de trabajo en el celular',
    materials:['Tu correo y contraseña del trabajo'],
    steps:[
      {icon:'gear', action:'Entra a', target:'Ajustes → "Cuentas" → "Agregar cuenta"'},
      {icon:'mail', action:'Escribe', target:'tu correo y contraseña'},
      {icon:'check', action:'Acepta', target:'los permisos que pida'}
    ]
  },
  { id:'escanear-documento', cat:'tec', title:'Escanear un documento con el celular', summary:'Sin necesitar un escáner de verdad.', time:'2 min', youtubeQuery:'como escanear un documento con el celular',
    materials:['Cámara del celular'],
    steps:[
      {icon:'camera', action:'Abre', target:'Notas o Google Drive'},
      {icon:'search', action:'Toca', target:'"Escanear documento"'},
      {icon:'check', action:'Alinea', target:'el documento y toma la foto'},
      {icon:'printer', action:'Guarda', target:'como PDF'}
    ]
  },
  { id:'firmar-pdf', cat:'tec', title:'Firmar un PDF desde el celular', summary:'Sin imprimir ni escanear.', time:'3 min', youtubeQuery:'como firmar un pdf desde el celular',
    materials:['El PDF a firmar', 'App de PDF o Notas'],
    steps:[
      {icon:'search', action:'Abre', target:'el PDF'},
      {icon:'pen', action:'Toca', target:'el ícono de firma ✍️'},
      {icon:'check', action:'Dibuja', target:'tu firma con el dedo'},
      {icon:'receipt', action:'Guarda', target:'y comparte el archivo'}
    ]
  },
  { id:'conectar-impresora', cat:'tec', title:'Conectar tu celular a una impresora', summary:'Por WiFi, sin cables.', time:'5 min', youtubeQuery:'como conectar mi celular a una impresora por wifi',
    materials:['Impresora con WiFi', 'Mismo WiFi que el celular'],
    steps:[
      {icon:'printer', action:'Conecta', target:'la impresora al mismo WiFi'},
      {icon:'search', action:'Abre', target:'lo que quieres imprimir'},
      {icon:'check', action:'Toca', target:'"Imprimir" y elige tu impresora'}
    ]
  },
  { id:'idioma-celular', cat:'tec', title:'Cambiar el idioma de tu celular', summary:'Si se cambió por accidente.', time:'2 min', youtubeQuery:'como cambiar el idioma de mi celular',
    materials:['Ninguno'],
    steps:[
      {icon:'gear', action:'Entra a', target:'Ajustes (⚙️, suele estar arriba)'},
      {icon:'globe', action:'Busca', target:'"Idioma" o "Language"'},
      {icon:'check', action:'Elige', target:'"Español"'}
    ]
  },

  { id:'publicar-github-pages', cat:'tec', title:'Publicar tu app en GitHub Pages', summary:'Para que cualquiera la vea con un link.', time:'10 min', youtubeQuery:'como publicar github pages',
    materials:['Cuenta de GitHub', 'Tu archivo index.html'],
    steps:[
      {icon:'key', action:'Toca', target:'"+" → "New repository"'},
      {icon:'search', action:'Escribe', target:'un nombre simple, sin acentos'},
      {icon:'check', action:'Toca', target:'"Create repository"'},
      {icon:'box', action:'Toca', target:'"uploading an existing file"'},
      {icon:'move', action:'Sube', target:'tu index.html (sin "(1)" en el nombre)'},
      {icon:'check', action:'Toca', target:'"Commit changes"'},
      {icon:'gear', action:'Ve a', target:'"Settings" → "Pages"'},
      {icon:'globe', action:'Elige', target:'"main" en Branch → "Save"'},
      {icon:'clock', action:'Espera', target:'1-2 min y recarga la página'}
    ]
  },
  { id:'borrar-repo-github', cat:'tec', title:'Borrar un repositorio de GitHub', summary:'Cuando quieres empezar de cero.', time:'2 min', youtubeQuery:'como borrar un repositorio de github',
    materials:['Ser dueño del repositorio'],
    steps:[
      {icon:'gear', action:'Entra a', target:'"Settings" del repositorio'},
      {icon:'search', action:'Baja hasta', target:'"Danger Zone"'},
      {icon:'trash', action:'Toca', target:'"Delete this repository"'},
      {icon:'key', action:'Escribe', target:'el nombre exacto para confirmar'},
      {icon:'check', action:'Toca', target:'"Delete this repository" (rojo)', warn:'Esto no se puede deshacer.'}
    ]
  },

  { id:'llave-agua-gotea', producto:{ nombre:'Empaques para llave de agua', link:'https://listado.mercadolibre.com.mx/empaque-para-llave-de-agua' }, categoriaProfesional:'Plomero', cat:'hogar', title:'Cambiar el empaque de una llave que gotea', summary:'Antes de que se desperdicie más agua.', time:'20 min', youtubeQuery:'como cambiar el empaque de una llave que gotea',
    materials:['Empaque nuevo (mismo tamaño)', 'Llave de perico', 'Desarmador'],
    steps:[
      {icon:'valve', action:'Cierra', target:'la llave de paso'},
      {icon:'wrench', action:'Quita', target:'la manija con el desarmador'},
      {icon:'screwdriver', action:'Destornilla', target:'la tuerca de adentro'},
      {icon:'valve', action:'Cambia', target:'el empaque de goma'},
      {icon:'wrench', action:'Arma todo', target:'en el mismo orden'},
      {icon:'check', action:'Abre', target:'el agua y revisa que no gotee'}
    ]
  },
  { id:'sellar-tina', producto:{ nombre:'Silicón para baño', link:'https://listado.mercadolibre.com.mx/silicon-para-bano' }, categoriaProfesional:'Plomero', cat:'hogar', title:'Poner silicón en la tina o regadera', summary:'Para que no se filtre agua a la pared.', time:'30 min', youtubeQuery:'como sellar con silicon la tina o regadera',
    materials:['Silicón para baño', 'Pistola de silicón', 'Cinta de pintor'],
    steps:[
      {icon:'sponge', action:'Limpia y seca', target:'bien la orilla'},
      {icon:'ruler', action:'Pega', target:'cinta de pintor a los lados'},
      {icon:'trowel', action:'Aplica', target:'el silicón en línea pareja'},
      {icon:'sponge', action:'Alisa', target:'con el dedo mojado'},
      {icon:'clock', action:'Espera', target:'24 h antes de mojarlo'}
    ]
  },
  { id:'cambiar-vidrio', categoriaProfesional:'Vidriero', cat:'hogar', title:'Cambiar un vidrio de ventana roto', summary:'Medidas exactas para no batallar.', time:'40 min', youtubeQuery:'como cambiar un vidrio de ventana roto',
    materials:['Vidrio nuevo a la medida', 'Guantes gruesos', 'Silicón o masilla'],
    steps:[
      {icon:'shield', action:'Ponte', target:'guantes gruesos'},
      {icon:'trash', action:'Retira', target:'los vidrios rotos con cuidado'},
      {icon:'ruler', action:'Mide', target:'el marco antes de comprar'},
      {icon:'glass', action:'Coloca', target:'el vidrio nuevo en el marco'},
      {icon:'trowel', action:'Sella', target:'las orillas con silicón'}
    ]
  },
  { id:'pintar-pared', categoriaProfesional:'Pintor', cat:'hogar', title:'Pintar una pared', summary:'Pareja, sin escurrimientos.', time:'2-3 horas', youtubeQuery:'como pintar una pared paso a paso',
    materials:['Pintura', 'Rodillo y brocha', 'Cinta de pintor', 'Lija fina'],
    steps:[
      {icon:'sponge', action:'Limpia', target:'la pared de polvo y grasa'},
      {icon:'ruler', action:'Protege', target:'con cinta bordes y contactos'},
      {icon:'roller', action:'Aplica', target:'una primera capa pareja'},
      {icon:'clock', action:'Deja secar', target:'según indique el bote'},
      {icon:'roller', action:'Aplica', target:'segunda capa si hace falta'}
    ]
  },
  { id:'mancha-humedad', categoriaProfesional:'Pintor', cat:'hogar', title:'Quitar una mancha de humedad', summary:'Solución rápida, no arregla la causa.', time:'30 min', youtubeQuery:'como quitar mancha de humedad de la pared',
    materials:['Cloro diluido o sellador anti-manchas', 'Brocha', 'Guantes'],
    steps:[
      {icon:'shield', action:'Ponte', target:'guantes y ventila el cuarto'},
      {icon:'sponge', action:'Aplica', target:'el cloro diluido con brocha'},
      {icon:'clock', action:'Deja secar', target:'por completo'},
      {icon:'roller', action:'Aplica', target:'sellador anti-manchas antes de pintar'},
      {icon:'check', action:'Busca', target:'de dónde viene la humedad', warn:'Si no arreglas la causa, la mancha regresa.'}
    ]
  },
  { id:'cambiar-chapa', producto:{ nombre:'Chapa para puerta', link:'https://listado.mercadolibre.com.mx/chapa-para-puerta' }, categoriaProfesional:'Cerrajero', cat:'hogar', title:'Cambiar una chapa o cerradura', summary:'Cuando se descompone o pierdes la llave.', time:'30 min', youtubeQuery:'como cambiar una chapa de puerta',
    materials:['Chapa nueva (mismo tamaño)', 'Desarmador', 'Cincel (a veces)'],
    steps:[
      {icon:'screwdriver', action:'Quita', target:'los tornillos de la chapa vieja'},
      {icon:'move', action:'Saca', target:'el mecanismo completo'},
      {icon:'wrench', action:'Compara', target:'con la chapa nueva antes de instalar'},
      {icon:'screwdriver', action:'Atornilla', target:'la nueva en su lugar'},
      {icon:'check', action:'Prueba', target:'con la llave varias veces'}
    ]
  },
  { id:'cambiar-llanta', cat:'hogar', title:'Cambiar una llanta ponchada', summary:'Lo básico para salir del apuro.', time:'20 min', youtubeQuery:'como cambiar una llanta ponchada paso a paso',
    materials:['Llanta de refacción', 'Gato hidráulico', 'Llave de cruz'],
    steps:[
      {icon:'car', action:'Estaciona', target:'en un lugar plano y seguro'},
      {icon:'wrench', action:'Afloja', target:'los birlos antes de levantar el carro'},
      {icon:'wrench', action:'Levanta', target:'el carro con el gato'},
      {icon:'tire', action:'Cambia', target:'la llanta ponchada por la de refacción'},
      {icon:'check', action:'Aprieta', target:'los birlos en cruz, bien firme'}
    ]
  },
  { id:'pasar-corriente', cat:'hogar', title:'Pasar corriente a la batería del carro', summary:'Cuando no enciende por batería baja.', time:'10 min', youtubeQuery:'como pasar corriente a un carro con cables',
    materials:['Cables pasacorriente', 'Otro carro funcionando'],
    steps:[
      {icon:'shield', action:'Apaga', target:'ambos carros antes de conectar'},
      {icon:'battery', action:'Conecta', target:'rojo con rojo, positivo a positivo'},
      {icon:'battery', action:'Conecta', target:'negro a una parte metálica sin pintura', warn:'No conectes negro directo a la batería descargada.'},
      {icon:'car', action:'Enciende', target:'el carro que sí funciona, espera 2 min'},
      {icon:'check', action:'Intenta encender', target:'el carro descargado'}
    ]
  },
  { id:'revisar-aceite', cat:'hogar', title:'Revisar el nivel de aceite del carro', summary:'Cada cierto tiempo, para cuidar el motor.', time:'5 min', youtubeQuery:'como revisar el nivel de aceite del carro',
    materials:['Trapo'],
    steps:[
      {icon:'car', action:'Apaga', target:'el carro, espera que enfríe'},
      {icon:'search', action:'Saca', target:'la varilla amarilla del motor'},
      {icon:'sponge', action:'Límpiala', target:'con el trapo'},
      {icon:'drop', action:'Métela', target:'de nuevo por completo y sácala'},
      {icon:'check', action:'Revisa', target:'el nivel entre las marcas'}
    ]
  },
  { id:'cambiar-foco-carro', producto:{ nombre:'Foco delantero para auto', link:'https://listado.mercadolibre.com.mx/foco-delantero-para-auto' }, cat:'hogar', title:'Cambiar un foco delantero del carro', summary:'Cuando se funde uno de los faros.', time:'15 min', youtubeQuery:'como cambiar un foco delantero de carro',
    materials:['Foco nuevo (mismo modelo)', 'Guantes'],
    steps:[
      {icon:'car', action:'Abre', target:'el cofre y ubica el foco'},
      {icon:'screwdriver', action:'Desconecta', target:'el conector eléctrico'},
      {icon:'bulb', action:'Saca', target:'el foco fundido girándolo'},
      {icon:'bulb', action:'Coloca', target:'el nuevo sin tocar el vidrio con los dedos', warn:'La grasa de tus dedos puede dañarlo.'},
      {icon:'check', action:'Prueba', target:'que encienda bien'}
    ]
  },

  { id:'licencia-conducir', cat:'dinero', title:'Sacar tu licencia de conducir', summary:'Trámite y requisitos básicos.', time:'30 min', youtubeQuery:'como sacar mi licencia de conducir por primera vez',
    materials:['INE', 'Comprobante de domicilio', 'CURP'],
    steps:[
      {icon:'globe', action:'Agenda', target:'tu cita en la página de tu estado'},
      {icon:'idcard', action:'Lleva', target:'tus documentos originales'},
      {icon:'cash', action:'Paga', target:'el trámite en ventanilla o en línea'},
      {icon:'check', action:'Realiza', target:'el examen si te lo piden'}
    ]
  },
  { id:'acta-nacimiento', cat:'dinero', title:'Sacar tu acta de nacimiento en línea', summary:'Sin ir al Registro Civil.', time:'5 min', youtubeQuery:'como sacar mi acta de nacimiento en linea gratis',
    materials:['Tus datos o los de la persona'],
    steps:[
      {icon:'globe', action:'Entra a', target:'gob.mx/actas'},
      {icon:'idcard', action:'Escribe', target:'nombre, fecha y estado de nacimiento'},
      {icon:'check', action:'Toca', target:'"Buscar"'},
      {icon:'printer', action:'Descarga', target:'el PDF'}
    ]
  },
  { id:'buro-credito', cat:'dinero', title:'Consultar tu buró de crédito', summary:'Gratis, una vez al año.', time:'10 min', youtubeQuery:'como consultar mi buro de credito gratis',
    materials:['INE', 'Correo electrónico'],
    steps:[
      {icon:'globe', action:'Entra a', target:'burodecredito.com.mx'},
      {icon:'idcard', action:'Llena', target:'tus datos personales'},
      {icon:'shield', action:'Verifica', target:'tu identidad con las preguntas'},
      {icon:'receipt', action:'Descarga', target:'tu reporte'}
    ]
  },
  { id:'solicitar-tarjeta-credito', cat:'dinero', title:'Solicitar una tarjeta de crédito', summary:'Lo básico antes de aplicar.', time:'10 min', youtubeQuery:'como solicitar una tarjeta de credito por primera vez',
    materials:['INE', 'Comprobante de domicilio', 'Comprobante de ingresos'],
    steps:[
      {icon:'search', action:'Compara', target:'opciones antes de elegir'},
      {icon:'globe', action:'Llena', target:'la solicitud en línea o en sucursal'},
      {icon:'idcard', action:'Sube', target:'tus documentos'},
      {icon:'clock', action:'Espera', target:'la respuesta del banco'}
    ]
  },
  { id:'reportar-robo-imei', cat:'dinero', title:'Reportar un celular robado', summary:'Bloquéalo para que no lo puedan usar.', time:'10 min', youtubeQuery:'como reportar mi celular robado bloquear imei',
    materials:['El IMEI de tu celular (si lo tienes anotado)'],
    steps:[
      {icon:'shield', action:'Marca', target:'a tu compañía telefónica'},
      {icon:'lock', action:'Pide', target:'bloquear la línea y el IMEI'},
      {icon:'flag', action:'Levanta', target:'la denuncia en el Ministerio Público'},
      {icon:'check', action:'Cambia', target:'tus contraseñas importantes'}
    ]
  },
  { id:'denunciar-fraude', cat:'dinero', title:'Denunciar un fraude o cobro indebido', summary:'Actúa lo antes posible.', time:'10 min', youtubeQuery:'como denunciar un fraude bancario o cobro no reconocido',
    materials:['Tu identificación', 'Capturas o comprobantes del fraude'],
    steps:[
      {icon:'lock', action:'Bloquea', target:'tu tarjeta o cuenta afectada'},
      {icon:'flag', action:'Reporta', target:'a tu banco de inmediato'},
      {icon:'globe', action:'Levanta', target:'la queja en CONDUSEF si no resuelven'},
      {icon:'receipt', action:'Guarda', target:'todos tus comprobantes'}
    ]
  },
  { id:'queja-profeco', cat:'dinero', title:'Poner una queja en PROFECO', summary:'Cuando una tienda o servicio te falló.', time:'10 min', youtubeQuery:'como poner una queja en profeco',
    materials:['Ticket o contrato', 'Datos de la empresa'],
    steps:[
      {icon:'globe', action:'Entra a', target:'profeco.gob.mx'},
      {icon:'flag', action:'Toca', target:'"Presentar una queja"'},
      {icon:'idcard', action:'Llena', target:'tus datos y los del problema'},
      {icon:'receipt', action:'Adjunta', target:'tu ticket o contrato'}
    ]
  },
  { id:'consultar-multas', cat:'dinero', title:'Consultar si tienes multas de tránsito', summary:'Antes de que se acumulen recargos.', time:'3 min', youtubeQuery:'como consultar multas de transito con mi placa',
    materials:['Placas del vehículo'],
    steps:[
      {icon:'globe', action:'Entra a', target:'la página de tránsito de tu estado'},
      {icon:'car', action:'Escribe', target:'tu número de placa'},
      {icon:'check', action:'Revisa', target:'el listado de adeudos'}
    ]
  },

  { id:'crear-instagram', cat:'tec', title:'Crear una cuenta de Instagram', summary:'Lo básico para empezar.', time:'3 min', youtubeQuery:'como crear una cuenta de instagram',
    materials:['Correo o número de teléfono'],
    steps:[
      {icon:'search', action:'Descarga', target:'la app de Instagram'},
      {icon:'mail', action:'Toca', target:'"Crear cuenta nueva"'},
      {icon:'idcard', action:'Llena', target:'tus datos y usuario'},
      {icon:'lock', action:'Crea', target:'tu contraseña'}
    ]
  },
  { id:'cerrar-sesion-remota', cat:'tec', title:'Cerrar sesión en otro dispositivo', summary:'Si dejaste tu cuenta abierta en otro celular.', time:'2 min', youtubeQuery:'como cerrar sesion remota de mi cuenta',
    materials:['Acceso a tu cuenta'],
    steps:[
      {icon:'gear', action:'Entra a', target:'"Configuración" → "Seguridad"'},
      {icon:'search', action:'Busca', target:'"Dispositivos" o "Sesiones activas"'},
      {icon:'lock', action:'Toca', target:'"Cerrar sesión" en el que no reconozcas'}
    ]
  },
  { id:'subtitulos-youtube', cat:'tec', title:'Poner subtítulos a un video en YouTube', summary:'Útil si no traen audio claro.', time:'1 min', youtubeQuery:'como activar subtitulos en youtube',
    materials:['App o página de YouTube'],
    steps:[
      {icon:'search', action:'Toca', target:'el video'},
      {icon:'cc', action:'Toca', target:'el ícono "CC"'},
      {icon:'check', action:'Elige', target:'el idioma'}
    ]
  },
  { id:'comprimir-pdf', cat:'tec', title:'Comprimir el tamaño de un PDF', summary:'Para poder enviarlo por WhatsApp o correo.', time:'2 min', youtubeQuery:'como comprimir un pdf gratis',
    materials:['El PDF a comprimir', 'Internet'],
    steps:[
      {icon:'globe', action:'Entra a', target:'un compresor de PDF en línea'},
      {icon:'compress', action:'Sube', target:'tu archivo'},
      {icon:'check', action:'Descarga', target:'la versión comprimida'}
    ]
  },
  { id:'foto-a-pdf', cat:'tec', title:'Convertir una foto a PDF', summary:'Para mandar documentos escaneados.', time:'2 min', youtubeQuery:'como convertir una foto a pdf desde el celular',
    materials:['La foto ya tomada'],
    steps:[
      {icon:'image', action:'Abre', target:'la app de Fotos o Drive'},
      {icon:'search', action:'Toca', target:'"Compartir" o "Imprimir"'},
      {icon:'check', action:'Elige', target:'"Guardar como PDF"'}
    ]
  },

  { id:'tiktok-password', cat:'tec', title:'Recuperar tu contraseña de TikTok', summary:'Si ya no puedes entrar.', time:'3 min', youtubeQuery:'como recuperar mi contraseña de tiktok',
    materials:['Correo o número registrado'],
    steps:[
      {icon:'lock', action:'Toca', target:'"¿Olvidaste tu contraseña?"'},
      {icon:'search', action:'Elige', target:'correo, número o usuario'},
      {icon:'mail', action:'Revisa', target:'el código que te llega'},
      {icon:'key', action:'Crea', target:'tu nueva contraseña'}
    ]
  },
  { id:'descargar-video-tiktok', cat:'tec', title:'Guardar un video de TikTok', summary:'Para verlo sin internet.', time:'1 min', youtubeQuery:'como descargar un video de tiktok',
    materials:['App de TikTok'],
    steps:[
      {icon:'search', action:'Abre', target:'el video'},
      {icon:'move', action:'Toca', target:'"Compartir" (flecha)'},
      {icon:'check', action:'Toca', target:'"Guardar video"'}
    ]
  },
  { id:'videollamada-zoom', cat:'tec', title:'Entrar a una videollamada de Zoom', summary:'Con el link que te compartieron.', time:'2 min', youtubeQuery:'como entrar a una videollamada de zoom con link',
    materials:['El link o código de la reunión'],
    steps:[
      {icon:'search', action:'Toca', target:'el link que te enviaron'},
      {icon:'camera', action:'Permite', target:'el acceso a cámara y micrófono'},
      {icon:'check', action:'Toca', target:'"Unirse a la reunión"'}
    ]
  },
  { id:'compartir-pantalla', cat:'tec', title:'Compartir tu pantalla en una videollamada', summary:'Para que vean tu documento o celular.', time:'1 min', youtubeQuery:'como compartir pantalla en zoom o meet',
    materials:['Estar en la llamada'],
    steps:[
      {icon:'search', action:'Busca', target:'el ícono "Compartir pantalla"'},
      {icon:'check', action:'Elige', target:'qué pantalla o app mostrar'},
      {icon:'check', action:'Toca', target:'"Compartir"'}
    ]
  },
  { id:'grabar-pantalla', cat:'tec', title:'Grabar la pantalla de tu celular', summary:'Útil para tutoriales o reportar errores.', time:'1 min', youtubeQuery:'como grabar la pantalla de mi celular',
    materials:['Ninguno'],
    steps:[
      {icon:'gear', action:'Desliza', target:'desde arriba (panel rápido)'},
      {icon:'camera', action:'Toca', target:'"Grabar pantalla"'},
      {icon:'check', action:'Detén', target:'la grabación cuando termines'}
    ]
  },
  { id:'captura-pantalla', cat:'tec', title:'Tomar una captura de pantalla', summary:'Para guardar lo que ves.', time:'1 min', youtubeQuery:'como tomar captura de pantalla en mi celular',
    materials:['Ninguno'],
    steps:[
      {icon:'plug', action:'Presiona', target:'Encendido + Bajar volumen a la vez'},
      {icon:'check', action:'Revisa', target:'tu galería de fotos'}
    ]
  },
  { id:'traducir-texto-camara', cat:'tec', title:'Traducir un letrero con la cámara', summary:'Sin escribir nada.', time:'1 min', youtubeQuery:'como traducir texto con la camara del celular',
    materials:['App del traductor o Google Lens'],
    steps:[
      {icon:'camera', action:'Abre', target:'Google Traductor'},
      {icon:'globe', action:'Toca', target:'el ícono de cámara'},
      {icon:'check', action:'Apunta', target:'al texto y espera la traducción'}
    ]
  },
  { id:'escanear-qr', cat:'tec', title:'Escanear un código QR', summary:'Sin descargar una app aparte.', time:'1 min', youtubeQuery:'como escanear un codigo qr con el celular',
    materials:['Cámara del celular'],
    steps:[
      {icon:'camera', action:'Abre', target:'la cámara de tu celular'},
      {icon:'qr', action:'Apunta', target:'al código QR'},
      {icon:'check', action:'Toca', target:'la notificación que aparece'}
    ]
  },

  { id:'destapar-excusado', producto:{ nombre:'Ventosa para excusado / destapacaños', link:'https://listado.mercadolibre.com.mx/destapacanos' }, categoriaProfesional:'Plomero', cat:'hogar', title:'Destapar un excusado tapado', summary:'Antes de usar químicos fuertes.', time:'15 min', youtubeQuery:'como destapar un excusado tapado con ventosa',
    materials:['Ventosa para excusado', 'Guantes'],
    steps:[
      {icon:'shield', action:'Ponte', target:'guantes'},
      {icon:'drain', action:'Coloca', target:'la ventosa cubriendo el hoyo'},
      {icon:'wrench', action:'Bombea', target:'con fuerza varias veces'},
      {icon:'check', action:'Jala', target:'la palanca para probar'}
    ]
  },
  { id:'empaque-refrigerador', producto:{ nombre:'Empaque para puerta de refrigerador', link:'https://listado.mercadolibre.com.mx/empaque-para-refrigerador' }, categoriaProfesional:'Técnico en refrigeración', cat:'hogar', title:'Cambiar el empaque del refri', summary:'Cuando ya no cierra bien la puerta.', time:'20 min', youtubeQuery:'como cambiar el empaque de la puerta del refrigerador',
    materials:['Empaque nuevo (mismo modelo)', 'Desarmador'],
    steps:[
      {icon:'box', action:'Despega', target:'el empaque viejo poco a poco'},
      {icon:'sponge', action:'Limpia', target:'el canal donde va'},
      {icon:'box', action:'Coloca', target:'el nuevo empujando desde una esquina'},
      {icon:'check', action:'Cierra', target:'la puerta y revisa que selle'}
    ]
  },
  { id:'nivelar-lavadora', cat:'hogar', title:'Nivelar una lavadora que vibra', summary:'Para que no se mueva ni haga ruido.', time:'15 min', youtubeQuery:'como nivelar una lavadora que vibra mucho',
    materials:['Nivel de burbuja', 'Llave para las patas'],
    steps:[
      {icon:'ruler', action:'Coloca', target:'el nivel encima de la lavadora'},
      {icon:'wrench', action:'Gira', target:'las patas hasta nivelar'},
      {icon:'check', action:'Prueba', target:'con un ciclo corto de centrifugado'}
    ]
  },
  { id:'arreglar-mesa-coja', cat:'hogar', title:'Nivelar una mesa o silla coja', summary:'Solución rápida, sin herramientas raras.', time:'10 min', youtubeQuery:'como nivelar una mesa o silla que cojea',
    materials:['Corcho o hule delgado', 'Tijeras'],
    steps:[
      {icon:'search', action:'Identifica', target:'qué pata está más corta'},
      {icon:'ruler', action:'Corta', target:'un pedazo de corcho a la medida'},
      {icon:'check', action:'Pégalo', target:'debajo de esa pata'}
    ]
  },
  { id:'cambiar-wifi-password', cat:'hogar', title:'Cambiar el nombre y contraseña del WiFi', summary:'Para tener tu red más segura.', time:'5 min', youtubeQuery:'como cambiar el nombre y contraseña de mi wifi',
    materials:['El IP del router (suele venir en una etiqueta)'],
    steps:[
      {icon:'wifi', action:'Entra a', target:'la dirección del router en el navegador'},
      {icon:'lock', action:'Ingresa', target:'con usuario y contraseña de admin'},
      {icon:'search', action:'Busca', target:'"Nombre de red (SSID)"'},
      {icon:'key', action:'Cambia', target:'nombre y contraseña, y guarda'}
    ]
  },
  { id:'reiniciar-router', cat:'hogar', title:'Reiniciar el router de internet', summary:'Cuando el internet va lento o falla.', time:'3 min', youtubeQuery:'como reiniciar mi router de internet',
    materials:['Ninguno'],
    steps:[
      {icon:'plug', action:'Desconecta', target:'el router de la luz'},
      {icon:'clock', action:'Espera', target:'30 segundos'},
      {icon:'plug', action:'Conéctalo', target:'de nuevo'},
      {icon:'wifi', action:'Espera', target:'a que las luces se estabilicen'}
    ]
  },

  { id:'consultar-infonavit', cat:'dinero', title:'Consultar tu saldo de Infonavit', summary:'Para ver tu ahorro y puntos.', time:'3 min', youtubeQuery:'como consultar mi saldo de infonavit en linea',
    materials:['NSS o clave de tu cuenta'],
    steps:[
      {icon:'globe', action:'Entra a', target:'micuenta.infonavit.org.mx'},
      {icon:'idcard', action:'Ingresa', target:'con tu NSS y contraseña'},
      {icon:'check', action:'Toca', target:'"Precalifica" o "Mi saldo"'}
    ]
  },
  { id:'cita-registro-civil', cat:'dinero', title:'Sacar cita en el Registro Civil', summary:'Para actas, matrimonio u otros trámites.', time:'5 min', youtubeQuery:'como sacar cita en el registro civil',
    materials:['CURP', 'Documentos según tu trámite'],
    steps:[
      {icon:'globe', action:'Entra a', target:'la página del Registro Civil de tu estado'},
      {icon:'pin', action:'Elige', target:'oficina y trámite'},
      {icon:'check', action:'Confirma', target:'fecha y hora'}
    ]
  },
  { id:'baja-numero-telefono', cat:'dinero', title:'Dar de baja un número o plan', summary:'Antes de que te sigan cobrando.', time:'10 min', youtubeQuery:'como dar de baja mi plan de telefono',
    materials:['Datos de tu contrato'],
    steps:[
      {icon:'chat', action:'Marca', target:'a tu compañía o entra a su app'},
      {icon:'search', action:'Busca', target:'"Cancelar plan" o "Portabilidad"'},
      {icon:'check', action:'Confirma', target:'la baja y pide tu folio'}
    ]
  },
  { id:'consultar-fonacot', cat:'dinero', title:'Consultar tu crédito Fonacot', summary:'Saldo y pagos pendientes.', time:'3 min', youtubeQuery:'como consultar mi credito fonacot en linea',
    materials:['Número de crédito o RFC'],
    steps:[
      {icon:'globe', action:'Entra a', target:'fonacot.gob.mx'},
      {icon:'idcard', action:'Ingresa', target:'con tu RFC o número de crédito'},
      {icon:'check', action:'Revisa', target:'tu saldo y pagos'}
    ]
  },
  { id:'domicilio-ine', cat:'dinero', title:'Actualizar tu domicilio en el INE', summary:'Si te cambiaste de casa.', time:'5 min (cita)', youtubeQuery:'como actualizar mi domicilio en el ine',
    materials:['Comprobante de domicilio nuevo', 'INE actual'],
    steps:[
      {icon:'globe', action:'Agenda', target:'tu cita en ine.mx'},
      {icon:'pin', action:'Elige', target:'tu módulo más cercano'},
      {icon:'idcard', action:'Lleva', target:'tu comprobante nuevo el día de la cita'}
    ]
  },

  { id:'hacer-cv', destacada:true, cat:'tec', title:'Hacer un currículum (CV) básico', summary:'Lo esencial para empezar a aplicar.', time:'20 min', youtubeQuery:'como hacer un curriculum vitae basico',
    materials:['Tus datos y experiencia', 'Computadora o celular'],
    steps:[
      {icon:'idcard', action:'Escribe', target:'tu nombre y datos de contacto'},
      {icon:'search', action:'Agrega', target:'tu experiencia, más reciente primero'},
      {icon:'check', action:'Incluye', target:'estudios y habilidades'},
      {icon:'printer', action:'Guarda', target:'como PDF antes de enviarlo'}
    ]
  },
  { id:'solicitud-empleo', cat:'tec', title:'Llenar una solicitud de empleo', summary:'Sin dejar espacios en blanco.', time:'15 min', youtubeQuery:'como llenar una solicitud de empleo',
    materials:['Tu CV a la mano', 'Identificación'],
    steps:[
      {icon:'idcard', action:'Llena', target:'tus datos personales completos'},
      {icon:'search', action:'Copia', target:'tu experiencia igual que en el CV'},
      {icon:'check', action:'Revisa', target:'antes de firmar o enviar'}
    ]
  },
  { id:'correo-formal', cat:'tec', title:'Escribir un correo formal', summary:'Para trabajo, trámites o escuela.', time:'5 min', youtubeQuery:'como escribir un correo formal',
    materials:['Cuenta de correo'],
    steps:[
      {icon:'mail', action:'Escribe', target:'un asunto claro y corto'},
      {icon:'check', action:'Saluda', target:'con "Estimado/a" + nombre'},
      {icon:'search', action:'Explica', target:'tu punto en pocos párrafos'},
      {icon:'check', action:'Cierra', target:'con "Saludos" y tu nombre completo'}
    ]
  },
  { id:'entrevista-trabajo', cat:'tec', title:'Prepararte para una entrevista de trabajo', summary:'Lo básico para no llegar en blanco.', time:'20 min', youtubeQuery:'como prepararme para una entrevista de trabajo',
    materials:['Tu CV', 'Ropa presentable'],
    steps:[
      {icon:'search', action:'Investiga', target:'la empresa antes de ir'},
      {icon:'check', action:'Prepara', target:'ejemplos de tu experiencia'},
      {icon:'clock', action:'Llega', target:'10 minutos antes'},
      {icon:'check', action:'Ten listas', target:'2-3 preguntas para ellos'}
    ]
  },
  { id:'linkedin-perfil', cat:'tec', title:'Crear tu perfil en LinkedIn', summary:'Para que te encuentren reclutadores.', time:'20 min', youtubeQuery:'como crear mi perfil de linkedin',
    materials:['Foto profesional', 'Tu CV'],
    steps:[
      {icon:'idcard', action:'Sube', target:'una foto clara de tu rostro'},
      {icon:'search', action:'Escribe', target:'un extracto breve de quién eres'},
      {icon:'check', action:'Agrega', target:'tu experiencia y estudios'},
      {icon:'globe', action:'Conéctate', target:'con compañeros y conocidos'}
    ]
  },

  { id:'planchar-camisa', cat:'hogar', title:'Planchar una camisa sin arruinarla', summary:'Orden correcto para que quede pareja.', time:'8 min', youtubeQuery:'como planchar una camisa correctamente',
    materials:['Plancha', 'Burro de planchar'],
    steps:[
      {icon:'iron', action:'Empieza', target:'por el cuello'},
      {icon:'iron', action:'Sigue', target:'con los puños y mangas'},
      {icon:'iron', action:'Plancha', target:'la espalda y luego el frente'},
      {icon:'hanger', action:'Cuélgala', target:'de inmediato para que no se arrugue'}
    ]
  },
  { id:'coser-boton', producto:{ nombre:'Kit de costura básico', link:'https://listado.mercadolibre.com.mx/kit-de-costura' }, cat:'hogar', title:'Coser un botón', summary:'Para no tirar la prenda.', time:'10 min', youtubeQuery:'como coser un boton a mano',
    materials:['Aguja', 'Hilo del color de la prenda', 'Tijeras'],
    steps:[
      {icon:'needle', action:'Enhebra', target:'la aguja y haz un nudo al final'},
      {icon:'needle', action:'Pasa', target:'la aguja por los hoyos, varias veces'},
      {icon:'needle', action:'Enreda', target:'el hilo debajo del botón (el "cuello")'},
      {icon:'check', action:'Corta', target:'el hilo sobrante y anuda'}
    ]
  },
  { id:'doblar-maleta', cat:'hogar', title:'Doblar ropa para la maleta', summary:'Para que quepa más y no se arrugue.', time:'10 min', youtubeQuery:'como doblar ropa para maleta sin que se arrugue',
    materials:['Tu ropa', 'Maleta'],
    steps:[
      {icon:'suitcase', action:'Enrolla', target:'las playeras en vez de doblarlas'},
      {icon:'hanger', action:'Pon', target:'lo pesado (zapatos) en el fondo'},
      {icon:'check', action:'Rellena', target:'espacios vacíos con calcetines'}
    ]
  },
  { id:'tender-cama', cat:'hogar', title:'Tender la cama bien', summary:'Rápido y se ve mucho más ordenado.', time:'3 min', youtubeQuery:'como tender la cama correctamente',
    materials:['Sábanas', 'Cobija o edredón'],
    steps:[
      {icon:'bed', action:'Estira', target:'la sábana de abajo pareja'},
      {icon:'bed', action:'Acomoda', target:'la cobija y dobla las esquinas'},
      {icon:'check', action:'Acomoda', target:'las almohadas al final'}
    ]
  },
  { id:'lavar-ropa-mano', cat:'hogar', title:'Lavar ropa a mano', summary:'Para prendas delicadas o sin lavadora.', time:'15 min', youtubeQuery:'como lavar ropa a mano correctamente',
    materials:['Jabón para ropa', 'Cubeta o lavadero'],
    steps:[
      {icon:'sponge', action:'Remoja', target:'la ropa con agua y jabón'},
      {icon:'sponge', action:'Talla', target:'suave las partes más sucias'},
      {icon:'drop', action:'Enjuaga', target:'hasta que no salga jabón'},
      {icon:'check', action:'Exprime', target:'sin torcer de más y tiende'}
    ]
  },
  { id:'hervir-huevo', cat:'hogar', title:'Hervir un huevo perfecto', summary:'Según qué tan cocida quieras la yema.', time:'12 min', youtubeQuery:'como hervir un huevo perfecto tiempo',
    materials:['Huevos', 'Agua', 'Olla'],
    steps:[
      {icon:'egg', action:'Coloca', target:'los huevos en agua fría'},
      {icon:'clock', action:'Espera', target:'a que hierva'},
      {icon:'clock', action:'Cuenta', target:'6 min (blandito) o 10 min (duro)'},
      {icon:'drop', action:'Enfríalos', target:'en agua con hielo antes de pelar'}
    ]
  },
  { id:'hacer-arroz', cat:'hogar', title:'Hacer arroz blanco', summary:'Que quede suelto, no pegajoso.', time:'25 min', youtubeQuery:'como hacer arroz blanco esponjoso',
    materials:['Arroz', 'Agua', 'Aceite', 'Sal'],
    steps:[
      {icon:'bowl', action:'Enjuaga', target:'el arroz hasta que salga clara el agua'},
      {icon:'mix', action:'Fríelo', target:'un poco en aceite antes del agua'},
      {icon:'drop', action:'Agrega', target:'el doble de agua que de arroz'},
      {icon:'clock', action:'Tapa', target:'y cocina a fuego bajo 15-18 min'}
    ]
  },
  { id:'picar-cebolla', cat:'hogar', title:'Picar cebolla sin llorar tanto', summary:'Trucos que sí funcionan.', time:'5 min', youtubeQuery:'como picar cebolla sin llorar trucos',
    materials:['Cebolla', 'Cuchillo filoso'],
    steps:[
      {icon:'search', action:'Enfría', target:'la cebolla en el refri antes'},
      {icon:'trowel', action:'Corta', target:'cerca de un extractor o ventana abierta'},
      {icon:'check', action:'Usa', target:'un cuchillo bien filoso (corta más limpio)'}
    ]
  },
  { id:'nudo-corbata', cat:'hogar', title:'Hacer un nudo de corbata', summary:'El nudo simple, el más fácil.', time:'5 min', youtubeQuery:'como hacer un nudo de corbata simple',
    materials:['Corbata'],
    steps:[
      {icon:'tie', action:'Cruza', target:'el lado ancho sobre el angosto'},
      {icon:'tie', action:'Pásalo', target:'por dentro del cuello y hacia abajo'},
      {icon:'tie', action:'Mete', target:'la punta por el nudo que se formó'},
      {icon:'check', action:'Ajusta', target:'jalando desde el nudo, no la punta'}
    ]
  },
  { id:'organizar-closet', cat:'hogar', title:'Organizar el clóset', summary:'Para encontrar todo más rápido.', time:'30 min', youtubeQuery:'como organizar mi closet facil',
    materials:['Ganchos', 'Cajas u organizadores'],
    steps:[
      {icon:'hanger', action:'Saca', target:'todo y sepáralo por tipo'},
      {icon:'trash', action:'Decide', target:'qué ya no usas'},
      {icon:'hanger', action:'Acomoda', target:'por color o por uso'},
      {icon:'check', action:'Guarda', target:'lo de temporada en cajas altas'}
    ]
  },

  { id:'presupuesto-mensual', cat:'dinero', title:'Hacer un presupuesto mensual', summary:'Para que el dinero te alcance.', time:'20 min', youtubeQuery:'como hacer un presupuesto mensual personal',
    materials:['Tus ingresos y gastos del mes'],
    steps:[
      {icon:'cash', action:'Anota', target:'todo lo que entra al mes'},
      {icon:'receipt', action:'Anota', target:'todos tus gastos fijos'},
      {icon:'check', action:'Resta', target:'gastos de ingresos'},
      {icon:'piggy', action:'Aparta', target:'una parte para ahorro, aunque sea poco'}
    ]
  },
  { id:'ahorrar-dinero', cat:'dinero', title:'Empezar a ahorrar', summary:'Una regla simple para no batallar.', time:'5 min', youtubeQuery:'como empezar a ahorrar dinero regla basica',
    materials:['Una cuenta o alcancía aparte'],
    steps:[
      {icon:'piggy', action:'Abre', target:'una cuenta o alcancía solo para ahorro'},
      {icon:'cash', action:'Aparta', target:'ese dinero apenas te paguen'},
      {icon:'check', action:'Trátalo', target:'como un gasto fijo más, no lo que sobra'}
    ]
  },
  { id:'leer-contrato-renta', cat:'dinero', title:'Entender un contrato de renta', summary:'Antes de firmar cualquier cosa.', time:'15 min', youtubeQuery:'que revisar antes de firmar un contrato de renta',
    materials:['El contrato completo'],
    steps:[
      {icon:'search', action:'Revisa', target:'el monto y la fecha de pago'},
      {icon:'search', action:'Busca', target:'cuánto es el depósito y si se regresa'},
      {icon:'search', action:'Lee', target:'qué pasa si te sales antes de tiempo'},
      {icon:'check', action:'Pregunta', target:'todo lo que no entiendas antes de firmar'}
    ]
  },
  { id:'calcular-propina', cat:'dinero', title:'Calcular la propina correctamente', summary:'Rápido, sin calculadora.', time:'1 min', youtubeQuery:'como calcular la propina facil',
    materials:['Ninguno'],
    steps:[
      {icon:'percent', action:'Calcula', target:'el 10% moviendo el punto decimal'},
      {icon:'cash', action:'Súmalo', target:'la mitad otra vez si quieres dar 15%'},
      {icon:'check', action:'Redondea', target:'al número más fácil'}
    ]
  },

  { id:'llamar-911', destacada:true, emergencia:true, cat:'hogar', title:'Qué decir al llamar al 911', summary:'Para que te ayuden más rápido.', time:'2 min', youtubeQuery:'que decir al llamar al 911 emergencia',
    materials:['Tu ubicación'],
    steps:[
      {icon:'chat', action:'Di primero', target:'qué está pasando'},
      {icon:'pin', action:'Da', target:'tu ubicación exacta'},
      {icon:'check', action:'Responde', target:'las preguntas, no cuelgues primero'}
    ]
  },
  { id:'usar-extintor', emergencia:true, cat:'hogar', title:'Usar un extintor de incendios', summary:'La técnica PASE.', time:'2 min', youtubeQuery:'como usar un extintor tecnica pase',
    materials:['Extintor cargado y vigente'],
    steps:[
      {icon:'extinguisher', action:'Jala', target:'el seguro'},
      {icon:'extinguisher', action:'Apunta', target:'a la base del fuego, no arriba'},
      {icon:'wrench', action:'Aprieta', target:'la palanca'},
      {icon:'check', action:'Mueve', target:'en zigzag hasta apagarlo', warn:'Si el fuego crece, sal de inmediato y llama a bomberos.'}
    ]
  },
  { id:'primeros-auxilios-basicos', emergencia:true, cat:'hogar', title:'Primeros auxilios básicos', summary:'Mientras llega ayuda profesional.', time:'5 min', youtubeQuery:'primeros auxilios basicos que hacer',
    materials:['Ninguno'],
    steps:[
      {icon:'shield', action:'Revisa', target:'que el lugar sea seguro para acercarte'},
      {icon:'chat', action:'Llama', target:'al 911 o pide que alguien lo haga'},
      {icon:'medkit', action:'No muevas', target:'a la persona si sospechas fractura'},
      {icon:'check', action:'Quédate', target:'con ella hasta que llegue ayuda', warn:'Esto no sustituye un curso certificado de primeros auxilios.'}
    ]
  },
  { id:'botiquin-basico', emergencia:true, cat:'hogar', title:'Armar un botiquín básico', summary:'Lo esencial para tener en casa.', time:'15 min', youtubeQuery:'que debe tener un botiquin basico en casa',
    materials:['Caja o bolsa para guardar todo'],
    steps:[
      {icon:'medkit', action:'Incluye', target:'gasas, curitas y cinta médica'},
      {icon:'drop', action:'Agrega', target:'alcohol o antiséptico'},
      {icon:'check', action:'Incluye', target:'analgésico básico y guantes'},
      {icon:'search', action:'Revisa', target:'fechas de caducidad cada año'}
    ]
  },

  { id:'atragantamiento-que-hacer', emergencia:true, cat:'hogar', title:'Qué hacer si alguien se atraganta', summary:'Mientras llega ayuda profesional.', time:'3 min', youtubeQuery:'que hacer si alguien se atraganta maniobra heimlich',
    materials:['Ninguno'],
    steps:[
      {icon:'chat', action:'Pregúntale', target:'"¿te estás atragantando?" — si puede toser o hablar, no intervengas, solo anímalo a toser'},
      {icon:'chat', action:'Si no puede', target:'toser, hablar ni respirar, llama al 911 de inmediato'},
      {icon:'hand', action:'Colócate', target:'detrás de la persona, rodéala con los brazos'},
      {icon:'wrench', action:'Da compresiones', target:'firmes hacia adentro y arriba, abajo de las costillas', warn:'Esto sustituye llamar a emergencias y buscar un curso certificado de primeros auxilios.'}
    ]
  },
  { id:'quemadura-que-hacer', emergencia:true, cat:'hogar', title:'Qué hacer ante una quemadura', summary:'Los primeros minutos importan.', time:'3 min', youtubeQuery:'que hacer en caso de quemadura primeros auxilios',
    materials:['Agua limpia'],
    steps:[
      {icon:'drop', action:'Enfría', target:'la zona con agua corriente tibia/fría, 10-15 min'},
      {icon:'shield', action:'No apliques', target:'hielo, pasta de dientes, ni remedios caseros', warn:'Esos "remedios" pueden empeorar el daño en la piel.'},
      {icon:'medkit', action:'Cubre', target:'con una gasa limpia, sin apretar'},
      {icon:'chat', action:'Busca ayuda médica', target:'si es grande, profunda, o en cara/manos/genitales'}
    ]
  },
  { id:'desmayo-que-hacer', emergencia:true, cat:'hogar', title:'Qué hacer si alguien se desmaya', summary:'Mientras llega ayuda profesional.', time:'3 min', youtubeQuery:'que hacer si alguien se desmaya primeros auxilios',
    materials:['Ninguno'],
    steps:[
      {icon:'shield', action:'Recuéstala', target:'boca arriba y eleva un poco sus piernas'},
      {icon:'search', action:'Afloja', target:'ropa apretada (cuello, cinturón)'},
      {icon:'check', action:'Verifica', target:'que respire; si no, llama al 911 e inicia RCP si sabes'},
      {icon:'clock', action:'Si despierta', target:'no la levantes de golpe, dale unos minutos'}
    ]
  },

  { id:'stripe-api-key', cat:'tec', title:'Obtener tu API key de Stripe', summary:'Para cobrar pagos desde tu app.', time:'3 min', youtubeQuery:'como obtener api key de stripe',
    materials:['Cuenta de Stripe'],
    steps:[
      {icon:'globe', action:'Entra a', target:'dashboard.stripe.com'},
      {icon:'search', action:'Toca', target:'"Developers" → "API keys"'},
      {icon:'key', action:'Copia', target:'tu "Secret key"'},
      {icon:'shield', action:'Guárdala', target:'como variable de entorno, no en el código', warn:'Si la subes a un repo público, cualquiera puede cobrar a tu nombre.'}
    ]
  },
  { id:'supabase-api-key', cat:'tec', title:'Obtener tu API key de Supabase', summary:'Para conectar tu base de datos.', time:'3 min', youtubeQuery:'como obtener api key de supabase',
    materials:['Proyecto creado en Supabase'],
    steps:[
      {icon:'globe', action:'Entra a', target:'tu proyecto en supabase.com'},
      {icon:'gear', action:'Toca', target:'"Project Settings" → "API"'},
      {icon:'key', action:'Copia', target:'la URL y la "anon key"'},
      {icon:'shield', action:'Pégalas', target:'en tu código como variables de entorno'}
    ]
  },
  { id:'notion-integracion', cat:'tec', title:'Crear una integración de Notion', summary:'Para leer o escribir tus páginas desde código.', time:'5 min', youtubeQuery:'como crear una integracion en notion api',
    materials:['Cuenta de Notion'],
    steps:[
      {icon:'globe', action:'Entra a', target:'notion.so/my-integrations'},
      {icon:'key', action:'Toca', target:'"New integration" → crea una'},
      {icon:'key', action:'Copia', target:'el "Internal Integration Token"'},
      {icon:'search', action:'Comparte', target:'la página de Notion con esa integración'},
      {icon:'check', action:'Ya puedes', target:'leer o escribir esa página desde tu código'}
    ]
  },
  { id:'canva-api', cat:'tec', title:'Conectar la API de Canva', summary:'Para generar o editar diseños automático.', time:'5 min', youtubeQuery:'como conectar la api de canva developers',
    materials:['Cuenta de Canva'],
    steps:[
      {icon:'globe', action:'Entra a', target:'developers.canva.com'},
      {icon:'key', action:'Toca', target:'"Create an app"'},
      {icon:'key', action:'Copia', target:'tu Client ID y Client Secret'},
      {icon:'shield', action:'Guárdalos', target:'seguros, no en el código público'}
    ]
  },
  { id:'gemini-github-actions', cat:'tec', title:'Conectar Gemini con GitHub', summary:'Para que revise tu código automático.', time:'10 min', youtubeQuery:'como conectar gemini con github actions',
    materials:['API key de Gemini', 'Repositorio en GitHub'],
    steps:[
      {icon:'globe', action:'Saca', target:'tu API key en aistudio.google.com'},
      {icon:'gear', action:'Ve a', target:'Settings del repo → "Secrets and variables" → "Actions"'},
      {icon:'key', action:'Toca', target:'"New repository secret"'},
      {icon:'shield', action:'Pega', target:'tu API key ahí (nunca en el código)'},
      {icon:'check', action:'Úsala', target:'en un GitHub Action para revisar tu código al subir cambios'}
    ]
  },
  { id:'github-api-en-app', cat:'tec', title:'Usar la API de GitHub desde tu app', summary:'Para que tu app lea o escriba en tus repos.', time:'10 min', youtubeQuery:'como usar la api de github en mi aplicacion',
    materials:['Token de acceso de GitHub'],
    steps:[
      {icon:'key', action:'Genera', target:'un "Personal access token" en GitHub'},
      {icon:'check', action:'Elige', target:'solo los permisos que necesitas'},
      {icon:'shield', action:'Guárdalo', target:'como variable de entorno en tu app'},
      {icon:'check', action:'Úsalo', target:'para crear archivos, leer issues o hacer commits'}
    ]
  },
  { id:'guardar-api-key-segura', cat:'tec', title:'Guardar una API key de forma segura', summary:'La regla de oro, para cualquier app.', time:'3 min', youtubeQuery:'como guardar una api key de forma segura',
    tutorial: 'No guardes API keys en el código ni en repositorios públicos. Usa variables de entorno en tu servidor y “Secrets” en tus herramientas CI/CD. Si la llave se filtra, revócala y crea una nueva de inmediato para mantener tu app segura.',
    materials:['Cualquier API key'],
    steps:[
      {icon:'lock', action:'Nunca escribas', target:'la llave directo en tu código'},
      {icon:'gear', action:'Usa', target:'variables de entorno o "Secrets" de la plataforma'},
      {icon:'search', action:'Revisa', target:'que no quede en un archivo subido a GitHub'},
      {icon:'check', action:'Si se filtró', target:'genera una llave nueva y borra la vieja'}
    ]
  },
  { id:'configurar-bluetooth', cat:'tec', title:'Configurar Bluetooth en tu celular', summary:'Para conectar audífonos, bocinas o autos.', time:'5 min', youtubeQuery:'como configurar bluetooth en el celular',
    tutorial: 'Abre Ajustes y entra a Bluetooth. Activa el interruptor y espera a que aparezca tu dispositivo en la lista. Toca el nombre correcto y confirma el emparejamiento si se solicita. Si no aparece, acerca el dispositivo o apágalo y enciéndelo. Cuando se conecte, aparecerá como “Conectado”.',
    media:[
      {type:'image', src:'https://via.placeholder.com/640x360?text=Bluetooth', alt:'Pantalla de ajustes de Bluetooth', caption:'Activa Bluetooth y empareja el dispositivo en la lista.'}
    ],
    materials:['Dispositivo Bluetooth'],
    steps:[
      {icon:'gear', action:'Abre', target:'Ajustes → Bluetooth'},
      {icon:'search', action:'Activa', target:'el Bluetooth en tu celular'},
      {icon:'search', action:'Busca', target:'el dispositivo en la lista'},
      {icon:'check', action:'Toca', target:'el nombre para emparejarlo'}
    ]
  },
  { id:'limpiar-cache-celular', cat:'tec', title:'Limpiar la caché de apps', summary:'Recupera espacio sin borrar tus datos.', time:'3 min', youtubeQuery:'como limpiar cache de aplicaciones en el celular',
    materials:['Tu celular'],
    steps:[
      {icon:'gear', action:'Abre', target:'Ajustes → Aplicaciones'},
      {icon:'search', action:'Selecciona', target:'la app que quieres limpiar'},
      {icon:'trash', action:'Toca', target:'"Almacenamiento" o "Caché"'},
      {icon:'check', action:'Confirma', target:'Borrar caché'}
    ]
  },
  { id:'conectar-wifi', cat:'tec', title:'Conectar a una red WiFi', summary:'Para tener internet en tu celular o laptop.', time:'2 min', youtubeQuery:'como conectar a wifi',
    tutorial: 'Abre Ajustes y ve a WiFi. Busca la red, toca su nombre y escribe la contraseña cuando te la solicite. Si el router es nuevo, usa los datos de la etiqueta. Si la señal es débil, acerca tu dispositivo al router. Finalmente, confirma que aparezca “Conectado”.',
    media:[
      {type:'video', src:'https://www.youtube.com/embed/9GgxinPwAGc', caption:'Video de ejemplo para conectar WiFi en tu dispositivo.'}
    ],
    materials:['Nombre de red y contraseña'],
    steps:[
      {icon:'wifi', action:'Abre', target:'Ajustes → WiFi'},
      {icon:'search', action:'Selecciona', target:'la red correcta'},
      {icon:'key', action:'Ingresa', target:'la contraseña si la pide'},
      {icon:'check', action:'Confirma', target:'que diga "Conectado"'}
    ]
  },
  { id:'organizar-escritorio', cat:'hogar', title:'Organizar tu escritorio de trabajo', summary:'Menos desorden, más concentración.', time:'15 min', youtubeQuery:'como organizar mi escritorio de trabajo',
    materials:['Cajas pequeñas', 'Ganchos o separadores'],
    steps:[
      {icon:'box', action:'Saca', target:'todo lo que no necesitas en el escritorio'},
      {icon:'search', action:'Agrupa', target:'papeles y objetos por tipo'},
      {icon:'check', action:'Guarda', target:'lo que usas en cajas o contenedores'},
      {icon:'pen', action:'Deja', target:'solo las herramientas que usas a mano'}
    ]
  },
  { id:'cambiar-aceite-bici', recordatorioMeses:3, cat:'hogar', title:'Cambiar el aceite de la bicicleta', summary:'Mantenimiento básico para que ruede mejor.', time:'20 min', youtubeQuery:'como cambiar el aceite de una bicicleta', costoPiezas:50, costoTaller:150,
    materials:['Aceite para bicicleta', 'Trapo', 'Llave inglesa'],
    steps:[
      {icon:'wrench', action:'Suelta', target:'la tuerca del eje con la llave inglesa'},
      {icon:'drop', action:'Deja', target:'escurrir el aceite viejo en un recipiente'},
      {icon:'drop', action:'Agrega', target:'el aceite nuevo según la cantidad indicada'},
      {icon:'check', action:'Aprieta', target:'la tuerca otra vez y limpia el exceso'}
    ]
  },
  { id:'hacer-llamada-skype', cat:'tec', title:'Hacer una llamada en Skype', summary:'Para hablar con alguien que usa Skype.', time:'3 min', youtubeQuery:'como hacer una llamada en skype',
    materials:['Cuenta de Skype', 'Micrófono'],
    steps:[
      {icon:'search', action:'Busca', target:'el contacto en Skype'},
      {icon:'camera', action:'Toca', target:'el botón de llamada de video o audio'},
      {icon:'check', action:'Acepta', target:'los permisos de micrófono y cámara'}
    ]
  },

  { id:'desbloquear-pdf', cat:'tec', title:'Desbloquear un PDF protegido', summary:'Cuando no puedes copiar o imprimir.', time:'5 min', youtubeQuery:'como desbloquear un pdf protegido',
    materials:['PDF bloqueado', 'Navegador web'],
    steps:[
      {icon:'globe', action:'Entra a', target:'ilovepdf.com'},
      {icon:'box', action:'Toca', target:'"Desbloquear PDF"'},
      {icon:'move', action:'Arrastra', target:'tu PDF al recuadro'},
      {icon:'check', action:'Descarga', target:'el PDF desbloqueado'}
    ]
  },
  { id:'traducir-pag-web', cat:'tec', title:'Traducir una página web completa', summary:'Sin perder el formato original.', time:'1 min', youtubeQuery:'como traducir una pagina web al español',
    materials:['Navegador Chrome o similar'],
    steps:[
      {icon:'globe', action:'Abre', target:'la página en otro idioma'},
      {icon:'globe', action:'Toca', target:'el botón de traducción (o haz clic derecho)'},
      {icon:'check', action:'Elige', target:'español → Traducir'}
    ]
  },
  { id:'limpiar-cache-chrome', cat:'tec', title:'Limpiar el caché de Google Chrome', summary:'Cuando el navegador va lento.', time:'2 min', youtubeQuery:'como limpiar el cache de google chrome',
    materials:['Google Chrome'],
    steps:[
      {icon:'menu', action:'Toca', target:'⋮ (tres puntos) → Ajustes'},
      {icon:'search', action:'Busca', target:'"Borrar datos de navegación"'},
      {icon:'trash', action:'Marca', target:'lo que quieras limpiar'},
      {icon:'check', action:'Toca', target:'"Borrar datos"'}
    ]
  },
  { id:'crear-cuenta-gmail-generica', cat:'tec', title:'Crear un correo para registros', summary:'Uno nuevo solo para trámites web.', time:'3 min', youtubeQuery:'como crear una cuenta de gmail nueva',
    materials:['Un número telefónico'],
    steps:[
      {icon:'globe', action:'Entra a', target:'gmail.com → "Crear cuenta"'},
      {icon:'mail', action:'Elige', target:'un nombre sin espacios'},
      {icon:'lock', action:'Escribe', target:'una contraseña fuerte'},
      {icon:'shield', action:'Verifica', target:'con tu número por SMS'}
    ]
  },

  { id:'ahorrar-con-app', cat:'dinero', title:'Empezar a ahorrar con una app', summary:'Sin sentir que te sacrificas.', time:'5 min', youtubeQuery:'mejores apps para ahorrar dinero automatico',
    materials:['App de banco o Fondo, Alkanza, Revolut'],
    steps:[
      {icon:'piggy', action:'Descarga', target:'la app de ahorro'},
      {icon:'keypad', action:'Regístrate', target:'con tus datos'},
      {icon:'cash', action:'Fija', target:'cuánto ahorras cada semana'},
      {icon:'check', action:'Actívala', target:'para que sea automático'}
    ]
  },
  { id:'reclamar-envio', cat:'dinero', title:'Reclamar un envío perdido', summary:'Pasos correctos para que te devuelvan el dinero.', time:'10 min', youtubeQuery:'como reclamar un envio perdido amazon o paqueteria',
    materials:['Número de rastreo', 'Recibo del envío'],
    steps:[
      {icon:'box', action:'Abre', target:'tu cuenta donde compraste'},
      {icon:'search', action:'Busca', target:'tu pedido'},
      {icon:'shield', action:'Toca', target:'"Reportar problema"'},
      {icon:'receipt', action:'Adjunta', target:'foto del recibo o rastreo'},
      {icon:'check', action:'Envía', target:'tu reclamo'}
    ]
  },
  { id:'prestamo-bancario', cat:'dinero', title:'Solicitar un préstamo personal', summary:'Lo que necesitas saber antes de pedir.', time:'20 min', youtubeQuery:'como solicitar un prestamo personal al banco',
    materials:['INE', 'Comprobante de ingresos', 'Referencias'],
    steps:[
      {icon:'search', action:'Compara', target:'tasas en 2-3 bancos'},
      {icon:'globe', action:'Llena', target:'solicitud en línea o en sucursal'},
      {icon:'idcard', action:'Sube', target:'documentos e información personal'},
      {icon:'clock', action:'Espera', target:'de 2 a 5 días hábiles'},
      {icon:'check', action:'Recibe', target:'el dinero si te aprueban', warn:'Lee bien las condiciones antes de firmar.'}
    ]
  },
  { id:'impuestos-independiente', cat:'dinero', title:'Declarar impuestos si trabajas solo', summary:'Lo mínimo para no tener problemas con SAT.', time:'30 min', youtubeQuery:'como declarar impuestos si soy independiente mexico',
    materials:['RFC', 'Comprobantes de gasto', 'Acceso al portal SAT'],
    steps:[
      {icon:'globe', action:'Entra a', target:'sat.gob.mx'},
      {icon:'receipt', action:'Reúne', target:'tus facturas y comprobantes'},
      {icon:'pen', action:'Calcula', target:'ingresos menos gastos'},
      {icon:'check', action:'Presenta', target:'tu declaración antes de abril'}
    ]
  },

  { id:'limpiar-refrigerador', cat:'hogar', title:'Limpiar el refrigerador a fondo', summary:'Sin perder comida ni congelador.', time:'30 min', youtubeQuery:'como limpiar el refrigerador a fondo',
    materials:['Agua tibia', 'Jabón neutro', 'Trapos'],
    steps:[
      {icon:'plug', action:'Apaga', target:'el refrigerador'},
      {icon:'box', action:'Saca', target:'la comida hacia una hielera'},
      {icon:'sponge', action:'Lava', target:'cada entrepaño con jabón'},
      {icon:'drop', action:'Enjuaga', target:'bien y deja secar'},
      {icon:'clock', action:'Prende', target:'y espera 15 min antes de meter comida'}
    ]
  },
  { id:'eliminar-malos-olores', cat:'hogar', title:'Eliminar malos olores de la casa', summary:'Soluciones caseras que funcionan.', time:'15 min', youtubeQuery:'como eliminar malos olores de la casa',
    materials:['Vinagre blanco', 'Bicarbonato', 'Limón'],
    steps:[
      {icon:'search', action:'Identifica', target:'de dónde viene el olor'},
      {icon:'mix', action:'Mezcla', target:'vinagre + bicarbonato en aerosol'},
      {icon:'broom', action:'Rocía', target:'en muebles y rincones'},
      {icon:'drop', action:'Abre', target:'ventanas para que entre aire'},
      {icon:'check', action:'Repite', target:'si hace falta al día siguiente'}
    ]
  },
  { id:'reparar-pared-agujerada', categoriaProfesional:'Albañil', cat:'hogar', title:'Reparar un agujero pequeño en la pared', summary:'Sin llamar a un albañil.', time:'20 min', youtubeQuery:'como reparar un agujero en la pared',
    materials:['Masilla para pared', 'Espátula', 'Lija', 'Pintura'],
    steps:[
      {icon:'trowel', action:'Aplica', target:'masilla con la espátula'},
      {icon:'ruler', action:'Alisa', target:'al nivel de la pared'},
      {icon:'clock', action:'Deja secar', target:'según el empaque'},
      {icon:'sponge', action:'Lija', target:'cuando esté seco'},
      {icon:'roller', action:'Pinta', target:'para que no se note'}
    ]
  },
  { id:'cambiar-tuberias', cat:'hogar', title:'Cambiar una tubería con fuga', summary:'Cuando gotea debajo del lavabo.', time:'45 min', youtubeQuery:'como cambiar una tuberia con fuga',
    materials:['Tubería nueva', 'Llave de perico', 'Silicón o teflón'],
    steps:[
      {icon:'valve', action:'Cierra', target:'la llave de paso'},
      {icon:'bucket', action:'Pon', target:'un recipiente debajo'},
      {icon:'wrench', action:'Desconecta', target:'la tubería con fuga'},
      {icon:'move', action:'Coloca', target:'la tubería nueva'},
      {icon:'check', action:'Abre el agua', target:'y revisa que no gotee', warn:'Si sigue goteando, ajusta un poco más.'}
    ]
  },
  { id:'arreglar-puerta-chirriona', categoriaProfesional:'Carpintero', cat:'hogar', title:'Arreglar una puerta que chirría', summary:'Sin necesidad de cambiar bisagras.', time:'5 min', youtubeQuery:'como arreglar una puerta que chirria',
    materials:['Aceite WD-40 o aceite de cocina'],
    steps:[
      {icon:'wrench', action:'Ubica', target:'las bisagras que suenan'},
      {icon:'drop', action:'Aplica', target:'aceite en cada bisagra'},
      {icon:'check', action:'Abre y cierra', target:'varias veces'},
      {icon:'sponge', action:'Limpia', target:'el exceso de aceite con trapo'}
    ]
  },
  { id:'instalacion-aire-acondicionado', recordatorioMeses:3, categoriaProfesional:'Técnico en aire acondicionado', cat:'hogar', title:'Limpiar el filtro del aire acondicionado', summary:'Para que enfríe mejor y consuma menos.', time:'10 min', youtubeQuery:'como limpiar el filtro del aire acondicionado',
    materials:['Aspiradora', 'Agua', 'Trapo'],
    steps:[
      {icon:'plug', action:'Apaga', target:'el aire acondicionado'},
      {icon:'filter', action:'Saca', target:'el filtro cuidadosamente'},
      {icon:'cloud', action:'Limpia', target:'con aspiradora o cepillo suave'},
      {icon:'drop', action:'Lava', target:'con agua tibia si está muy sucio'},
      {icon:'clock', action:'Deja secar', target:'completamente antes de instalar de nuevo'}
    ]
  },
  { id:'instalar-cortinas', categoriaProfesional:'Carpintero', cat:'hogar', title:'Instalar cortinas en una ventana', summary:'Sin perforar si no quieres.', time:'20 min', youtubeQuery:'como instalar cortinas en una ventana',
    materials:['Cortinas', 'Barra telescópica o con soportes', 'Taladro (opcional)'],
    steps:[
      {icon:'ruler', action:'Mide', target:'el ancho y alto de la ventana'},
      {icon:'pin', action:'Marca', target:'dónde van los soportes'},
      {icon:'wrench', action:'Atornilla', target:'los soportes si son permanentes'},
      {icon:'move', action:'Coloca', target:'la barra o carril'},
      {icon:'check', action:'Cuelga', target:'las cortinas y prueba que corran bien'}
    ]
  },
  { id:'reparar-cremallera', cat:'hogar', title:'Reparar una cremallera atorada', summary:'Sin tener que cambiar la prenda.', time:'5 min', youtubeQuery:'como reparar una cremallera atorada',
    materials:['Grafito de lápiz o spray lubricante', 'Trapo'],
    steps:[
      {icon:'pin', action:'Aplica', target:'grafito o lubricante en la cremallera'},
      {icon:'wrench', action:'Intenta', target:'mover la cremallera lentamente'},
      {icon:'drop', action:'Si es tela', target:'aplica un poco más de lubricante'},
      {icon:'check', action:'Limpia', target:'el exceso cuando funcione'}
    ]
  },

  { id:'excel-tabla-basica', cat:'tec', title:'Hacer una tabla en Excel desde el celular', summary:'Lo básico para empezar a organizar datos.', time:'10 min', youtubeQuery:'como hacer una tabla en excel desde el celular',
    materials:['App de Excel (gratis)'],
    steps:[
      {icon:'search', action:'Abre', target:'Excel y toca "Libro en blanco"'},
      {icon:'check', action:'Toca', target:'una celda y escribe tus datos'},
      {icon:'search', action:'Selecciona', target:'el rango de celdas → "Insertar" → "Tabla"'},
      {icon:'check', action:'Guarda', target:'con nombre antes de salir'}
    ]
  },
  { id:'excel-formula-basica', cat:'tec', title:'Hacer una fórmula básica en Excel', summary:'Sumar y sacar promedio sin saber de fórmulas.', time:'10 min', youtubeQuery:'como hacer formulas basicas en excel suma promedio',
    materials:['Una tabla con números'],
    steps:[
      {icon:'search', action:'Toca', target:'la celda donde quieres el resultado'},
      {icon:'key', action:'Escribe', target:'=SUMA( y selecciona las celdas'},
      {icon:'check', action:'Cierra', target:'el paréntesis y presiona Enter'},
      {icon:'search', action:'Para promedio', target:'usa =PROMEDIO( en vez de =SUMA('}
    ]
  },
  { id:'word-documento-celular', cat:'tec', title:'Hacer un documento en Word desde el celular', summary:'Cartas, reportes, lo que necesites.', time:'10 min', youtubeQuery:'como hacer un documento en word desde el celular',
    materials:['App de Word (gratis)'],
    steps:[
      {icon:'search', action:'Abre', target:'Word y toca "Documento en blanco"'},
      {icon:'check', action:'Escribe', target:'tu texto normal'},
      {icon:'gear', action:'Selecciona', target:'texto y cambia tamaño o negrita arriba'},
      {icon:'check', action:'Guarda', target:'con nombre antes de salir'}
    ]
  },
  { id:'google-docs-equipo', cat:'tec', title:'Usar Google Docs para trabajar en equipo', summary:'Varias personas editando el mismo documento.', time:'8 min', youtubeQuery:'como usar google docs para trabajar en equipo',
    materials:['Cuenta de Google'],
    steps:[
      {icon:'search', action:'Entra a', target:'docs.google.com → "+" nuevo documento'},
      {icon:'key', action:'Toca', target:'"Compartir" (arriba a la derecha)'},
      {icon:'mail', action:'Escribe', target:'el correo de con quién compartir'},
      {icon:'check', action:'Elige', target:'si puede editar o solo ver'}
    ]
  },
  { id:'google-sheets-basico', cat:'tec', title:'Usar Google Sheets (hojas de cálculo)', summary:'Como Excel, pero todos editan a la vez.', time:'8 min', youtubeQuery:'como usar google sheets hojas de calculo',
    materials:['Cuenta de Google'],
    steps:[
      {icon:'search', action:'Entra a', target:'sheets.google.com → "+" nueva hoja'},
      {icon:'check', action:'Llena', target:'tus datos como en Excel'},
      {icon:'key', action:'Comparte', target:'igual que en Google Docs'},
      {icon:'check', action:'Revisa', target:'que se guarda solo, no hace falta guardar manual'}
    ]
  },
  { id:'word-a-pdf', cat:'tec', title:'Convertir un Word a PDF', summary:'Para que nadie te lo edite por accidente.', time:'2 min', youtubeQuery:'como convertir un word a pdf desde el celular',
    materials:['El documento de Word'],
    steps:[
      {icon:'search', action:'Abre', target:'el documento en Word'},
      {icon:'move', action:'Toca', target:'"Compartir" o "Archivo" → "Exportar"'},
      {icon:'check', action:'Elige', target:'"Guardar como PDF"'}
    ]
  },
  { id:'traductor-integrado', cat:'tec', title:'Usar el traductor integrado del celular', summary:'Traduce textos sin cambiar de app.', time:'3 min', youtubeQuery:'como usar el traductor integrado del celular',
    materials:['Ninguno'],
    steps:[
      {icon:'globe', action:'Selecciona', target:'el texto que quieres traducir'},
      {icon:'search', action:'Toca', target:'"Traducir" en el menú que aparece'},
      {icon:'check', action:'Elige', target:'el idioma de destino'}
    ]
  },
  { id:'nota-voz-transcribir', cat:'tec', title:'Grabar una nota de voz y transcribirla a texto', summary:'Para no escribir todo a mano.', time:'3 min', youtubeQuery:'como transcribir una nota de voz a texto',
    materials:['Teclado con dictado (la mayoría ya lo trae)'],
    steps:[
      {icon:'search', action:'Toca', target:'el micrófono en tu teclado'},
      {icon:'check', action:'Habla', target:'claro y con pausas entre ideas'},
      {icon:'check', action:'Revisa', target:'y corrige lo que se transcribió mal'}
    ]
  },
  { id:'calendario-juntas', cat:'tec', title:'Usar el calendario del celular para juntas', summary:'Para no se te olvide ni te empalmes.', time:'5 min', youtubeQuery:'como usar el calendario del celular para juntas',
    materials:['App de Calendario (ya la trae el celular)'],
    steps:[
      {icon:'search', action:'Abre', target:'Calendario y toca "+"'},
      {icon:'check', action:'Escribe', target:'el título, fecha y hora'},
      {icon:'mail', action:'Agrega', target:'invitados si es junta con más gente'},
      {icon:'check', action:'Activa', target:'un recordatorio antes de que empiece'}
    ]
  },
  { id:'google-drive-compartir', cat:'tec', title:'Usar Google Drive para guardar y compartir archivos', summary:'Tus archivos accesibles desde cualquier celular.', time:'5 min', youtubeQuery:'como usar google drive para guardar y compartir archivos',
    materials:['Cuenta de Google'],
    steps:[
      {icon:'cloud', action:'Abre', target:'Google Drive → toca "+"'},
      {icon:'move', action:'Sube', target:'el archivo desde tu celular'},
      {icon:'key', action:'Toca', target:'los tres puntos → "Compartir"'},
      {icon:'mail', action:'Escribe', target:'el correo de con quién compartir'}
    ]
  },
  { id:'dictado-por-voz', cat:'tec', title:'Escribir más rápido con dictado por voz', summary:'Para mensajes largos sin batallar con el teclado.', time:'2 min', youtubeQuery:'como activar el dictado por voz en mi celular',
    materials:['Ninguno'],
    steps:[
      {icon:'search', action:'Toca', target:'cualquier campo de texto'},
      {icon:'search', action:'Toca', target:'el ícono de micrófono en el teclado'},
      {icon:'check', action:'Habla', target:'y di "punto" o "coma" para puntuación'}
    ]
  },
  { id:'organizar-carpetas-celular', cat:'tec', title:'Organizar carpetas en el celular', summary:'Para encontrar tus archivos rápido.', time:'10 min', youtubeQuery:'como organizar carpetas en mi celular',
    materials:['App de "Archivos" (ya la trae el celular)'],
    steps:[
      {icon:'search', action:'Abre', target:'la app de "Archivos"'},
      {icon:'box', action:'Toca', target:'"Crear carpeta nueva"'},
      {icon:'move', action:'Mantén presionado', target:'un archivo para moverlo a esa carpeta'},
      {icon:'check', action:'Repite', target:'agrupando por tema (trabajo, fotos, etc.)'}
    ]
  },
  { id:'powerpoint-celular', cat:'tec', title:'Hacer una presentación desde el celular', summary:'PowerPoint sin necesitar computadora.', time:'15 min', youtubeQuery:'como hacer una presentacion en powerpoint desde el celular',
    materials:['App de PowerPoint (gratis)'],
    steps:[
      {icon:'search', action:'Abre', target:'PowerPoint → "Presentación en blanco"'},
      {icon:'check', action:'Toca', target:'"+" para agregar diapositivas'},
      {icon:'image', action:'Agrega', target:'texto e imágenes tocando cada espacio'},
      {icon:'check', action:'Guarda', target:'con nombre antes de salir'}
    ]
  },
  { id:'comprimir-zip', cat:'tec', title:'Comprimir varios archivos en un ZIP', summary:'Para mandar muchos archivos de un jalón.', time:'3 min', youtubeQuery:'como comprimir archivos en zip desde el celular',
    materials:['Los archivos a comprimir'],
    steps:[
      {icon:'search', action:'Abre', target:'la app de "Archivos"'},
      {icon:'check', action:'Selecciona', target:'los archivos (mantén presionado el primero)'},
      {icon:'compress', action:'Toca', target:'"Comprimir" o "Crear ZIP"'}
    ]
  },
  { id:'multitarea-pantalla-dividida', cat:'tec', title:'Usar dos apps a la vez (pantalla dividida)', summary:'Para copiar datos de una app a otra sin salir.', time:'2 min', youtubeQuery:'como usar pantalla dividida en el celular',
    materials:['Ninguno'],
    steps:[
      {icon:'search', action:'Toca', target:'el botón de apps recientes (□ o gesto)'},
      {icon:'search', action:'Mantén presionado', target:'el ícono de una app'},
      {icon:'check', action:'Elige', target:'"Pantalla dividida"'},
      {icon:'check', action:'Toca', target:'la segunda app para acompañarla'}
    ]
  },

  { id:'ahorro-navidad', cat:'dinero', title:'Crear un fondo para gastos de Navidad', summary:'Empieza a ahorrar desde ahora.', time:'5 min', youtubeQuery:'como ahorrar dinero para navidad',
    materials:['Cuenta bancaria o app de ahorro'],
    steps:[
      {icon:'piggy', action:'Calcula', target:'cuánto gastas en diciembre'},
      {icon:'cash', action:'Divide', target:'entre los meses que faltan'},
      {icon:'check', action:'Abre', target:'una cuenta de ahorro específica'},
      {icon:'clock', action:'Transfiere', target:'ese dinero automáticamente cada mes'}
    ]
  },
  { id:'reclamo-producto-defectuoso', cat:'dinero', title:'Reclamar un producto defectuoso', summary:'Tus derechos como consumidor.', time:'15 min', youtubeQuery:'como reclamar un producto defectuoso derechos del consumidor',
    materials:['Comprobante de compra', 'Producto defectuoso'],
    steps:[
      {icon:'search', action:'Toma foto', target:'del defecto del producto'},
      {icon:'receipt', action:'Reúne', target:'tu recibo o comprobante'},
      {icon:'globe', action:'Entra a', target:'profeco.gob.mx o CONUSUMER'},
      {icon:'check', action:'Presenta', target:'tu queja oficial'}
    ]
  },

  { id:'cambiar-aceite-carro', recordatorioMeses:4, producto:{ nombre:'Aceite de motor', link:'https://listado.mercadolibre.com.mx/aceite-de-motor' }, categoriaProfesional:'Mecánico', cat:'hogar', title:'Cambiar el aceite de tu carro', summary:'Mantenimiento esencial para principiantes.', time:'30 min', youtubeQuery:'como cambiar el aceite del carro paso a paso', costoPiezas:300, costoTaller:800,
    materials:['Aceite nuevo (según tu carro)', 'Filtro nuevo', 'Llave de tuerca', 'Bandeja para aceite', 'Trapos'],
    steps:[
      {icon:'car', action:'Calienta', target:'el motor 3 minutos y apágalo'},
      {icon:'wrench', action:'Levanta', target:'el carro con gato en lugar seguro'},
      {icon:'drop', action:'Ubica', target:'el tapón de drenaje debajo del motor'},
      {icon:'wrench', action:'Afloja', target:'el tapón con cuidado de no quemarte'},
      {icon:'drop', action:'Deja', target:'que escurra todo el aceite viejo'},
      {icon:'wrench', action:'Quita', target:'el filtro viejo girándolo'},
      {icon:'drop', action:'Coloca', target:'el filtro nuevo (con anillo de goma nuevo)'},
      {icon:'drop', action:'Vierte', target:'el aceite nuevo según la cantidad recomendada'},
      {icon:'check', action:'Verifica', target:'con la varilla que quede en el nivel correcto'}
    ]
  },
  { id:'cambiar-balatas-carro', recordatorioMeses:12, producto:{ nombre:'Balatas para auto', link:'https://listado.mercadolibre.com.mx/balatas-para-auto' }, categoriaProfesional:'Mecánico', cat:'hogar', title:'Cambiar las balatas del carro', summary:'Frenos frescos y seguros.', time:'45 min', youtubeQuery:'como cambiar las balatas del carro', costoPiezas:600, costoTaller:1500,
    materials:['Balatas nuevas', 'Llave de cruz', 'Llave de tuerca', 'Destornillador'],
    steps:[
      {icon:'car', action:'Estaciona', target:'en lugar seguro y aplica freno de mano'},
      {icon:'wrench', action:'Afloja', target:'los birlos antes de levantar'},
      {icon:'wrench', action:'Levanta', target:'el carro con gato'},
      {icon:'tire', action:'Quita', target:'la rueda completamente'},
      {icon:'wrench', action:'Localiza', target:'los tornillos que fijan la pastilla'},
      {icon:'trash', action:'Quita', target:'las balatas viejas'},
      {icon:'screwdriver', action:'Limpia', target:'el disco de freno con trapo seco'},
      {icon:'check', action:'Coloca', target:'las balatas nuevas en la misma posición'},
      {icon:'wrench', action:'Atornilla', target:'y aprieta bien'},
      {icon:'check', action:'Repite', target:'en las otras ruedas'}
    ]
  },
  { id:'revisar-presion-llantas', recordatorioMeses:1, cat:'hogar', title:'Revisar y ajustar la presión de las llantas', summary:'Cada mes para mejor rendimiento.', time:'10 min', youtubeQuery:'como revisar la presion de las llantas del carro', costoPiezas:0, costoTaller:50,
    materials:['Manómetro', 'Compresor de aire'],
    steps:[
      {icon:'car', action:'Estaciona', target:'en lugar plano'},
      {icon:'tire', action:'Ubica', target:'la tapa de la válvula en cada llanta'},
      {icon:'wrench', action:'Quita', target:'la tapa de la válvula'},
      {icon:'drop', action:'Conecta', target:'el manómetro a la válvula'},
      {icon:'check', action:'Lee', target:'la presión (la correcta viene en tu manual)'},
      {icon:'drop', action:'Si está baja', target:'usa el compresor para llenar'},
      {icon:'wrench', action:'Coloca', target:'la tapa de nuevo en todas'}
    ]
  },
  { id:'limpiar-filtro-aire-carro', recordatorioMeses:6, cat:'hogar', title:'Limpiar el filtro de aire del motor', summary:'Para que tu carro respire mejor.', time:'15 min', youtubeQuery:'como limpiar el filtro de aire del carro', costoPiezas:150, costoTaller:350,
    materials:['Aspiradora', 'Trapo seco'],
    steps:[
      {icon:'car', action:'Abre', target:'el cofre'},
      {icon:'search', action:'Localiza', target:'la caja de aire (suele estar arriba)'},
      {icon:'wrench', action:'Quita', target:'los clips o tornillos que la cierran'},
      {icon:'filter', action:'Saca', target:'el filtro viejo'},
      {icon:'cloud', action:'Limpia', target:'con aspiradora o soplador'},
      {icon:'check', action:'Si está muy sucio', target:'cámbialo por uno nuevo'},
      {icon:'wrench', action:'Cierra', target:'la caja de aire bien'}
    ]
  },
  { id:'revisar-correa-ventilador', recordatorioMeses:12, cat:'hogar', title:'Revisar la correa del ventilador', summary:'Señales de desgaste y cuándo cambiarla.', time:'10 min', youtubeQuery:'como revisar la correa del ventilador del carro', costoPiezas:0, costoTaller:150,
    materials:['Linterna', 'Trapo'],
    steps:[
      {icon:'car', action:'Abre', target:'el cofre con el motor apagado'},
      {icon:'search', action:'Ubica', target:'la correa (es larga y negra)'},
      {icon:'eye', action:'Revisa', target:'si hay grietas o deshilachados'},
      {icon:'hand', action:'Intenta', target:'moverla: no debe moverse más de 1 cm'},
      {icon:'trash', action:'Si está gastada', target:'llévalo a un mecánico'},
      {icon:'check', action:'Si se ve bien', target:'cierra el cofre'}
    ]
  },
  { id:'revisar-liquido-refrigerante', recordatorioMeses:6, cat:'hogar', title:'Revisar el nivel de refrigerante', summary:'Para evitar sobrecalentamiento.', time:'5 min', youtubeQuery:'como revisar el liquido refrigerante del carro', costoPiezas:100, costoTaller:250,
    materials:['Trapo', 'Refrigerante del mismo tipo si hace falta'],
    steps:[
      {icon:'car', action:'Deja', target:'que el motor se enfríe 10 minutos'},
      {icon:'search', action:'Localiza', target:'el depósito de refrigerante (transparente)'},
      {icon:'check', action:'Revisa', target:'que esté entre "Min" y "Max"'},
      {icon:'drop', action:'Si está bajo', target:'agrega refrigerante hasta el nivel'},
      {icon:'clock', action:'Si se consume rápido', target:'busca una fuga', warn:'Nunca abras la tapa con el motor caliente, ¡quema!'}
    ]
  },
  { id:'limpiar-bujias', recordatorioMeses:12, cat:'hogar', title:'Limpiar o cambiar las bujías', summary:'Para mejor arranque y consumo.', time:'40 min', youtubeQuery:'como limpiar o cambiar las bujias del carro', costoPiezas:100, costoTaller:300,
    materials:['Bujías nuevas (si lo necesita)', 'Llave de bujías', 'Trapo'],
    steps:[
      {icon:'car', action:'Apaga', target:'el motor completamente'},
      {icon:'search', action:'Ubica', target:'las bujías en la parte superior (cables de arriba)'},
      {icon:'wrench', action:'Quita', target:'los cables de las bujías con cuidado'},
      {icon:'wrench', action:'Saca', target:'las bujías con la llave especial'},
      {icon:'sponge', action:'Limpia', target:'la punta con trapo seco o cepillo suave'},
      {icon:'check', action:'Verifica', target:'la distancia entre los electrodos (pedir referencia)'},
      {icon:'wrench', action:'Si están muy gastadas', target:'cámbilas por nuevas'},
      {icon:'wrench', action:'Coloca', target:'las bujías de nuevo en su lugar'},
      {icon:'plug', action:'Conecta', target:'los cables bien en cada bujía'}
    ]
  },

  { id:'git-instalar', cat:'tec', title:'Instalar Git en tu computadora', summary:'El primer paso para usar control de versiones.', time:'5 min', youtubeQuery:'como instalar git en windows mac',
    materials:['Computadora con internet'],
    steps:[
      {icon:'globe', action:'Entra a', target:'git-scm.com'},
      {icon:'move', action:'Descarga', target:'la versión para tu sistema'},
      {icon:'check', action:'Instala', target:'con las opciones que vienen por defecto'},
      {icon:'terminal', action:'Verifica', target:'escribiendo: git --version'}
    ]
  },
  { id:'git-clonar', cat:'tec', title:'Clonar un repositorio con Git', summary:'Bajar una copia de un repo a tu computadora.', time:'3 min', youtubeQuery:'como clonar un repositorio de github con git clone',
    materials:['Git instalado', 'El link del repositorio'],
    steps:[
      {icon:'globe', action:'Copia', target:'la URL del repo (botón "Code" en GitHub)'},
      {icon:'terminal', action:'Abre', target:'la terminal en la carpeta donde quieras guardarlo'},
      {icon:'terminal', action:'Escribe', target:'git clone y pega la URL'},
      {icon:'check', action:'Espera', target:'a que termine de descargar'}
    ]
  },
  { id:'git-commit-push', cat:'tec', title:'Hacer commit y subir cambios (push)', summary:'Guardar y enviar tus cambios a GitHub.', time:'5 min', youtubeQuery:'como hacer commit y push en git',
    materials:['Repositorio ya clonado', 'Cambios guardados en tus archivos'],
    steps:[
      {icon:'terminal', action:'Escribe', target:'git add . (agrega todos los cambios)'},
      {icon:'terminal', action:'Escribe', target:'git commit -m "descripción corta"'},
      {icon:'terminal', action:'Escribe', target:'git push'},
      {icon:'check', action:'Revisa', target:'en GitHub que ya aparezcan tus cambios'}
    ]
  },
  { id:'git-rama', cat:'tec', title:'Crear una rama (branch) en Git', summary:'Para probar cosas sin afectar lo que ya funciona.', time:'5 min', youtubeQuery:'como crear una rama branch en git',
    materials:['Repositorio con Git'],
    steps:[
      {icon:'branch', action:'Escribe', target:'git checkout -b nombre-de-tu-rama'},
      {icon:'check', action:'Trabaja', target:'y haz tus commits normal en esa rama'},
      {icon:'cloudUpload', action:'Escribe', target:'git push -u origin nombre-de-tu-rama'},
      {icon:'check', action:'Cuando esté lista', target:'únela a main con un pull request'}
    ]
  },
  { id:'git-conflicto', cat:'tec', title:'Resolver un conflicto de Git', summary:'Cuando dos cambios chocan en el mismo archivo.', time:'10 min', youtubeQuery:'como resolver un conflicto de merge en git',
    materials:['Un conflicto ya detectado por Git'],
    steps:[
      {icon:'search', action:'Abre', target:'el archivo marcado en conflicto'},
      {icon:'search', action:'Busca', target:'las líneas con <<<<<<< y >>>>>>>'},
      {icon:'screwdriver', action:'Decide', target:'qué parte del código se queda'},
      {icon:'trash', action:'Borra', target:'las marcas de conflicto (<<<, ===, >>>)'},
      {icon:'terminal', action:'Escribe', target:'git add . y luego git commit'}
    ]
  },

  { id:'termux-instalar', cat:'tec', title:'Instalar Termux en Android', summary:'Terminal Linux directo en tu celular.', time:'5 min', youtubeQuery:'como instalar termux en android',
    materials:['Celular Android'],
    steps:[
      {icon:'globe', action:'Descarga', target:'Termux desde F-Droid (no Play Store, está desactualizado ahí)'},
      {icon:'check', action:'Instala', target:'como cualquier app'},
      {icon:'terminal', action:'Abre', target:'Termux y espera que configure todo'},
      {icon:'terminal', action:'Escribe', target:'pkg update && pkg upgrade'}
    ]
  },
  { id:'termux-basico', cat:'tec', title:'Comandos básicos de Termux', summary:'Lo mínimo para moverte sin perderte.', time:'10 min', youtubeQuery:'comandos basicos de termux para principiantes',
    materials:['Termux instalado'],
    steps:[
      {icon:'terminal', action:'Escribe', target:'ls (ver los archivos de la carpeta)'},
      {icon:'terminal', action:'Escribe', target:'cd nombre-carpeta (entrar a una carpeta)'},
      {icon:'terminal', action:'Escribe', target:'mkdir nombre (crear una carpeta nueva)'},
      {icon:'terminal', action:'Escribe', target:'pwd (ver en qué carpeta estás parado)'}
    ]
  },
  { id:'termux-node-python', cat:'tec', title:'Instalar Node.js o Python en Termux', summary:'Para programar directo desde tu celular.', time:'5 min', youtubeQuery:'como instalar node js o python en termux',
    materials:['Termux actualizado'],
    steps:[
      {icon:'terminal', action:'Para Node, escribe', target:'pkg install nodejs'},
      {icon:'terminal', action:'Para Python, escribe', target:'pkg install python'},
      {icon:'check', action:'Verifica', target:'con node -v o python --version'}
    ]
  },

  { id:'desplegar-vercel', cat:'tec', title:'Publicar un sitio en Vercel', summary:'Gratis, y con link en minutos.', time:'10 min', youtubeQuery:'como publicar mi sitio web en vercel',
    materials:['Cuenta de GitHub', 'Tu proyecto subido a un repo'],
    steps:[
      {icon:'globe', action:'Entra a', target:'vercel.com y conecta tu GitHub'},
      {icon:'key', action:'Toca', target:'"Add New" → "Project"'},
      {icon:'search', action:'Elige', target:'el repositorio que quieres publicar'},
      {icon:'check', action:'Toca', target:'"Deploy" y espera un par de minutos'}
    ]
  },
  { id:'desplegar-netlify', cat:'tec', title:'Publicar un sitio en Netlify', summary:'Otra opción gratis y fácil.', time:'10 min', youtubeQuery:'como publicar mi sitio web en netlify',
    materials:['Cuenta de GitHub', 'Tu proyecto subido a un repo'],
    steps:[
      {icon:'globe', action:'Entra a', target:'netlify.com y conecta tu GitHub'},
      {icon:'key', action:'Toca', target:'"Add new site" → "Import an existing project"'},
      {icon:'search', action:'Elige', target:'tu repositorio'},
      {icon:'check', action:'Toca', target:'"Deploy site"'}
    ]
  },
  { id:'conectar-dominio-vercel', cat:'tec', title:'Conectar tu propio dominio', summary:'Para que tu link se vea profesional.', time:'15 min', youtubeQuery:'como conectar mi dominio a vercel o netlify',
    materials:['Un dominio comprado', 'Tu sitio ya publicado'],
    steps:[
      {icon:'globe', action:'Ve a', target:'la configuración de dominio de tu proyecto'},
      {icon:'key', action:'Escribe', target:'tu dominio y agrégalo'},
      {icon:'search', action:'Copia', target:'los datos DNS que te dan'},
      {icon:'gear', action:'Pégalos', target:'donde compraste tu dominio'},
      {icon:'clock', action:'Espera', target:'unas horas a que se active'}
    ]
  },

  { id:'variables-entorno', cat:'tec', title:'Usar variables de entorno en tu proyecto', summary:'Para no exponer llaves ni datos sensibles.', time:'5 min', youtubeQuery:'que son las variables de entorno env',
    materials:['Un proyecto de código'],
    steps:[
      {icon:'key', action:'Crea', target:'un archivo llamado .env en tu proyecto'},
      {icon:'key', action:'Escribe', target:'NOMBRE=valor, una por línea'},
      {icon:'shield', action:'Agrega', target:'.env a tu archivo .gitignore', warn:'Si subes tu .env a GitHub, tus llaves quedan expuestas.'},
      {icon:'check', action:'Léelas', target:'en tu código con process.env.NOMBRE'}
    ]
  },
  { id:'env-vercel-netlify', cat:'tec', title:'Configurar variables de entorno en Vercel/Netlify', summary:'Para que tu sitio publicado también las use.', time:'5 min', youtubeQuery:'como agregar variables de entorno en vercel o netlify',
    materials:['Proyecto ya conectado a Vercel o Netlify'],
    steps:[
      {icon:'gear', action:'Ve a', target:'Settings → "Environment Variables"'},
      {icon:'key', action:'Agrega', target:'cada nombre y su valor'},
      {icon:'check', action:'Guarda', target:'y vuelve a publicar (redeploy)'}
    ]
  },

  { id:'consola-navegador', cat:'tec', title:'Usar la consola del navegador para ver errores', summary:'El primer lugar donde buscar cuando algo falla.', time:'5 min', youtubeQuery:'como abrir la consola del navegador para ver errores',
    materials:['Cualquier navegador (Chrome, Firefox)'],
    steps:[
      {icon:'search', action:'Presiona', target:'F12 (o clic derecho → "Inspeccionar")'},
      {icon:'bug', action:'Ve a', target:'la pestaña "Console"'},
      {icon:'search', action:'Busca', target:'el texto en rojo, ahí está el error'},
      {icon:'check', action:'Copia', target:'el mensaje y búscalo si no lo entiendes'}
    ]
  },
  { id:'inspector-elementos', cat:'tec', title:'Usar el inspector de elementos', summary:'Para ver y probar cambios de diseño en vivo.', time:'8 min', youtubeQuery:'como usar el inspector de elementos del navegador',
    materials:['Cualquier navegador'],
    steps:[
      {icon:'search', action:'Presiona', target:'F12 (o clic derecho → "Inspeccionar")'},
      {icon:'search', action:'Toca', target:'la flecha ↖ y luego el elemento que quieras ver'},
      {icon:'gear', action:'Cambia', target:'valores de CSS ahí mismo para probar'},
      {icon:'check', action:'Recuerda', target:'que esos cambios no se guardan, solo son de prueba'}
    ]
  },

  { id:'cuidados-basicos-perro', cat:'hogar', title:'Cuidados básicos de un perro', summary:'Lo esencial si acabas de adoptar uno.', time:'10 min', youtubeQuery:'cuidados basicos de un perro para principiantes',
    materials:['Croquetas', 'Agua fresca', 'Cama o tapete'],
    steps:[
      {icon:'paw', action:'Dale', target:'agua fresca disponible todo el día'},
      {icon:'clock', action:'Aliméntalo', target:'2 veces al día, a la misma hora'},
      {icon:'paw', action:'Sácalo a pasear', target:'al menos 20-30 min diarios'},
      {icon:'medkit', action:'Llévalo', target:'al veterinario para sus vacunas'}
    ]
  },
  { id:'cuidados-basicos-gato', cat:'hogar', title:'Cuidados básicos de un gato', summary:'Lo esencial si acabas de adoptar uno.', time:'10 min', youtubeQuery:'cuidados basicos de un gato para principiantes',
    materials:['Croquetas', 'Arena y arenero', 'Agua fresca'],
    steps:[
      {icon:'paw', action:'Coloca', target:'el arenero lejos de su comida'},
      {icon:'sponge', action:'Limpia', target:'el arenero una vez al día'},
      {icon:'paw', action:'Dale', target:'croquetas de buena calidad, sin cambiarlas seguido'},
      {icon:'medkit', action:'Llévalo', target:'al veterinario para sus vacunas y esterilización'}
    ]
  },
  { id:'primeros-auxilios-mascota', cat:'hogar', title:'Primeros auxilios básicos para tu mascota', summary:'Mientras llegas al veterinario.', time:'5 min', youtubeQuery:'primeros auxilios basicos para mascotas',
    materials:['Ninguno'],
    steps:[
      {icon:'shield', action:'Mantén la calma', target:'un animal asustado puede morder sin querer'},
      {icon:'paw', action:'Si sangra', target:'presiona con un trapo limpio'},
      {icon:'chat', action:'Llama', target:'a tu veterinario antes de dar cualquier medicamento', warn:'Nunca le des medicamento humano a una mascota sin indicación veterinaria.'},
      {icon:'car', action:'Trasládalo', target:'con cuidado, evitando moverlo de más si hay fractura'}
    ]
  },
  { id:'banar-perro-casa', cat:'hogar', title:'Bañar a tu perro en casa', summary:'Sin batallar ni que se escape.', time:'20 min', youtubeQuery:'como banar a mi perro en casa',
    materials:['Shampoo para perros', 'Toalla', 'Agua tibia'],
    steps:[
      {icon:'paw', action:'Cepíllalo', target:'antes de mojarlo, para quitar pelo suelto'},
      {icon:'drop', action:'Moja', target:'con agua tibia, evitando ojos y oídos'},
      {icon:'sponge', action:'Aplica', target:'shampoo especial para perros, nunca de humano'},
      {icon:'drop', action:'Enjuaga', target:'muy bien hasta que no quede jabón'},
      {icon:'check', action:'Sécalo', target:'con toalla y manténlo en lugar cálido'}
    ]
  },
  { id:'cortar-unas-mascota', cat:'hogar', title:'Cortar las uñas de tu mascota', summary:'Sin lastimarla.', time:'10 min', youtubeQuery:'como cortar las unas a mi perro o gato sin lastimarlo',
    materials:['Cortaúñas para mascotas'],
    steps:[
      {icon:'paw', action:'Sostén', target:'la pata con firmeza pero sin apretar'},
      {icon:'search', action:'Identifica', target:'la parte rosa de la uña (ahí no se corta)'},
      {icon:'wrench', action:'Corta', target:'solo la puntita blanca/transparente', warn:'Si sangra, aplica un poco de harina o polvo estíptico para detenerlo.'},
      {icon:'check', action:'Prémiala', target:'con una golosina al terminar'}
    ]
  },

  { id:'dormir-mejor', cat:'hogar', title:'Dormir mejor, hábitos básicos', summary:'Para descansar de verdad.', time:'5 min', youtubeQuery:'como dormir mejor habitos basicos',
    materials:['Ninguno'],
    steps:[
      {icon:'clock', action:'Duerme', target:'y despierta a la misma hora todos los días'},
      {icon:'plug', action:'Evita', target:'pantallas 30 min antes de dormir'},
      {icon:'drop', action:'Evita', target:'cafeína después de la tarde'},
      {icon:'check', action:'Mantén', target:'tu cuarto oscuro y fresco'}
    ]
  },
  { id:'tomar-presion-arterial', cat:'hogar', title:'Tomar tu presión arterial en casa', summary:'Con un baumanómetro digital.', time:'5 min', youtubeQuery:'como tomar la presion arterial en casa correctamente',
    materials:['Baumanómetro digital'],
    steps:[
      {icon:'clock', action:'Descansa', target:'sentado 5 minutos antes de medir'},
      {icon:'heart', action:'Coloca', target:'el brazalete a la altura del corazón'},
      {icon:'check', action:'Mantente quieto', target:'y en silencio durante la medición'},
      {icon:'search', action:'Anota', target:'el resultado y la hora, para llevarlo a tu doctor'}
    ]
  },
  { id:'medir-glucosa', cat:'hogar', title:'Medir tu glucosa con glucómetro', summary:'Paso a paso, sin complicarte.', time:'5 min', youtubeQuery:'como medir la glucosa con glucometro',
    materials:['Glucómetro', 'Tiras reactivas', 'Lanceta', 'Alcohol'],
    steps:[
      {icon:'sponge', action:'Limpia', target:'tu dedo con alcohol y deja secar'},
      {icon:'wrench', action:'Pica', target:'la punta del dedo con la lanceta'},
      {icon:'drop', action:'Coloca', target:'la gota de sangre en la tira reactiva'},
      {icon:'check', action:'Espera', target:'el resultado en pantalla y anótalo'}
    ]
  },
  { id:'rutina-ejercicio-casa', cat:'hogar', title:'Empezar una rutina de ejercicio en casa', summary:'Sin equipo, sin gimnasio.', time:'20 min', youtubeQuery:'rutina de ejercicio en casa para principiantes',
    materials:['Ropa cómoda', 'Un tapete'],
    steps:[
      {icon:'clock', action:'Calienta', target:'5 min moviendo brazos y piernas'},
      {icon:'check', action:'Haz', target:'3 series de sentadillas, lagartijas y abdominales'},
      {icon:'clock', action:'Descansa', target:'1 minuto entre cada serie'},
      {icon:'check', action:'Estira', target:'al final para no amanecer adolorido'}
    ]
  },
  { id:'manejar-estres', cat:'hogar', title:'Técnicas básicas para manejar el estrés', summary:'Para los días pesados.', time:'5 min', youtubeQuery:'tecnicas para manejar el estres rapido',
    materials:['Ninguno'],
    steps:[
      {icon:'clock', action:'Respira', target:'contando 4 segundos al inhalar, 4 al exhalar'},
      {icon:'check', action:'Identifica', target:'qué puedes controlar y qué no, en ese momento'},
      {icon:'chat', action:'Habla', target:'con alguien de confianza sobre lo que sientes'},
      {icon:'check', action:'Tómate', target:'pausas cortas durante el día, no solo al final'}
    ]
  },

  { id:'dar-de-alta-negocio', cat:'dinero', title:'Dar de alta tu negocio ante el SAT', summary:'Régimen Simplificado de Confianza (RESICO).', time:'20 min', youtubeQuery:'como darme de alta en el sat como resico',
    materials:['CURP', 'Comprobante de domicilio', 'Correo electrónico'],
    steps:[
      {icon:'globe', action:'Entra a', target:'sat.gob.mx → "Trámites del RFC"'},
      {icon:'idcard', action:'Llena', target:'tus datos personales y de actividad'},
      {icon:'briefcase', action:'Elige', target:'el régimen RESICO si tus ingresos son menores a 3.5 millones al año'},
      {icon:'check', action:'Agenda', target:'tu cita si te la piden para firmar'}
    ]
  },
  { id:'hacer-factura-electronica', cat:'dinero', title:'Hacer una factura electrónica simple', summary:'Con la herramienta gratis del SAT.', time:'10 min', youtubeQuery:'como hacer una factura electronica gratis sat',
    materials:['RFC y contraseña del SAT', 'e.firma (para algunos casos)'],
    steps:[
      {icon:'globe', action:'Entra a', target:'"Genera tu factura" en sat.gob.mx'},
      {icon:'idcard', action:'Ingresa', target:'los datos de quien te compró'},
      {icon:'cash', action:'Escribe', target:'el concepto y el monto'},
      {icon:'printer', action:'Descarga', target:'el PDF y el XML, mándaselos a tu cliente'}
    ]
  },
  { id:'calcular-precio-venta', cat:'dinero', title:'Calcular el precio de venta de un producto', summary:'Para no perder dinero sin darte cuenta.', time:'10 min', youtubeQuery:'como calcular el precio de venta de un producto',
    materials:['El costo de tu producto'],
    steps:[
      {icon:'cash', action:'Suma', target:'el costo del material y tu tiempo de trabajo'},
      {icon:'percent', action:'Agrega', target:'tu ganancia (normalmente 30-50% sobre el costo)'},
      {icon:'cash', action:'Suma', target:'gastos fijos (luz, empaque, envío) si aplica'},
      {icon:'check', action:'Compara', target:'con la competencia antes de fijarlo'}
    ]
  },
  { id:'abrir-cuenta-negocio', cat:'dinero', title:'Abrir una cuenta bancaria para tu negocio', summary:'Para separar tu dinero personal del negocio.', time:'30 min', youtubeQuery:'como abrir una cuenta bancaria para mi negocio',
    materials:['INE', 'Comprobante de domicilio', 'RFC de tu negocio'],
    steps:[
      {icon:'globe', action:'Compara', target:'comisiones entre bancos antes de elegir'},
      {icon:'idcard', action:'Lleva', target:'tus documentos a la sucursal o trámite en línea'},
      {icon:'card', action:'Solicita', target:'la cuenta tipo "Persona Física con Actividad Empresarial"'},
      {icon:'check', action:'Actívala', target:'y empieza a usarla solo para tu negocio'}
    ]
  },
  { id:'vender-en-redes-sociales', cat:'dinero', title:'Empezar a vender en redes sociales', summary:'Lo básico para tu primera publicación.', time:'15 min', youtubeQuery:'como empezar a vender en redes sociales',
    materials:['Fotos de tu producto', 'Cuenta de Facebook/Instagram'],
    steps:[
      {icon:'camera', action:'Toma fotos', target:'con buena luz natural, fondo limpio'},
      {icon:'search', action:'Escribe', target:'una descripción clara: qué es, precio, cómo comprar'},
      {icon:'chat', action:'Agrega', target:'tu WhatsApp o forma de contacto'},
      {icon:'check', action:'Publica', target:'seguido, no solo una vez'}
    ]
  },

  { id:'organizar-fiesta-cumpleanos', cat:'hogar', title:'Organizar una fiesta de cumpleaños económica', summary:'Sin gastar de más.', time:'30 min', youtubeQuery:'como organizar una fiesta de cumpleanos economica',
    materials:['Lista de invitados', 'Presupuesto definido'],
    steps:[
      {icon:'cash', action:'Define', target:'tu presupuesto total antes de comprar algo'},
      {icon:'cake', action:'Decide', target:'entre pastel comprado o hecho en casa (más barato)'},
      {icon:'check', action:'Decora', target:'con globos y papel picado, es lo más barato'},
      {icon:'chat', action:'Confirma', target:'invitados con unos días de anticipación'}
    ]
  },
  { id:'armar-ofrenda-dia-muertos', cat:'hogar', title:'Armar una ofrenda de Día de Muertos', summary:'Los elementos tradicionales básicos.', time:'30 min', youtubeQuery:'como armar una ofrenda de dia de muertos tradicional',
    materials:['Papel picado', 'Veladoras', 'Flores de cempasúchil', 'Foto del difunto', 'Comida y bebida que le gustaba'],
    steps:[
      {icon:'check', action:'Coloca', target:'la foto del difunto en el nivel más alto'},
      {icon:'cake', action:'Pon', target:'su comida y bebida favorita'},
      {icon:'check', action:'Agrega', target:'papel picado, flores y veladoras'},
      {icon:'search', action:'Incluye', target:'un vaso de agua, para calmar la sed del camino'}
    ]
  },
  { id:'decorar-arbol-navidad', cat:'hogar', title:'Decorar un árbol de Navidad', summary:'Que se vea parejo y bonito.', time:'40 min', youtubeQuery:'como decorar un arbol de navidad paso a paso',
    materials:['Árbol', 'Luces', 'Esferas', 'Listón o adornos'],
    steps:[
      {icon:'check', action:'Coloca', target:'las luces primero, de adentro hacia afuera'},
      {icon:'check', action:'Distribuye', target:'las esferas grandes primero, parejas por todo el árbol'},
      {icon:'check', action:'Agrega', target:'esferas chicas para rellenar espacios vacíos'},
      {icon:'check', action:'Termina', target:'con listones y la estrella o corona arriba'}
    ]
  }
];

let currentCat = 'all';
let currentDetail = null;
let currentTheme = 'light';

// ===== PERSISTENCIA DE DATOS EN localStorage =====
function loadProgress(id){
  try{ return JSON.parse(localStorage.getItem('progreso_'+id) || '[]'); }catch(e){ return []; }
}
function saveProgress(id, arr){
  localStorage.setItem('progreso_'+id, JSON.stringify(arr));
}

function loadState(){
  try{
    const state = JSON.parse(localStorage.getItem('appState') || '{}');
    return {
      cat: state.cat || 'all',
      historial: state.historial || [],
      favorites: state.favorites || [],
      notes: state.notes || {},
      theme: state.theme || 'light',
      lang: state.lang || 'es',
      fontSize: state.fontSize || 'normal'
    };
  }catch(e){
    return { cat: 'all', historial: [], favorites: [], theme: 'light', lang: 'es', fontSize: 'normal' };
  }
}

function saveState(){
  const state = loadState();
  state.cat = currentCat;
  state.theme = currentTheme;
  state.lang = currentLang;
  state.fontSize = currentFontSize;
  localStorage.setItem('appState', JSON.stringify(state));
}

function logMissedSearch(term){
  try{
    const key = 'busquedasSinResultado';
    const clean = term.trim().toLowerCase();
    if(!clean) return;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data[clean] = (data[clean] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(data));
  }catch(e){}
}

// ===== Generación de guías con IA (Gemini), guardada solo en este navegador =====
const ICONOS_VALIDOS = Object.keys(ICONS).join(', ');

function getGeminiKey(){ return localStorage.getItem('geminiApiKey') || ''; }
function setGeminiKey(k){ localStorage.setItem('geminiApiKey', k.trim()); }

function loadGuiasIA(){
  try{ return JSON.parse(localStorage.getItem('guiasGeneradasIA') || '[]'); }catch(e){ return []; }
}
function saveGuiaIA(tutorial){
  const lista = loadGuiasIA();
  lista.push(tutorial);
  localStorage.setItem('guiasGeneradasIA', JSON.stringify(lista));
}

function slugify(text){
  return 'ia-' + text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
    .slice(0,40) + '-' + Date.now().toString(36).slice(-4);
}

async function generarGuiaConIA(term){
  const apiKey = getGeminiKey();
  if(!apiKey){ mostrarFormularioClave(term); return; }

  const statusEl = document.getElementById('iaStatus');
  if(statusEl) statusEl.textContent = 'Generando tu guía, espera unos segundos...';

  const prompt = `Genera una guía paso a paso en español de México para: "${term}".
Responde SOLO con un JSON válido, sin texto extra ni bloques de código, con esta forma exacta:
{
  "title": "título corto y claro",
  "summary": "una línea, máximo 12 palabras",
  "time": "ej: 10 min",
  "cat": "tec" o "dinero" o "hogar" (el que mejor aplique),
  "materials": ["cosa 1", "cosa 2"],
  "steps": [
    {"icon": "uno de estos: ${ICONOS_VALIDOS}", "action": "verbo corto (Toca, Abre, Escribe...)", "target": "qué hacer, corto y directo", "warn": "opcional, solo si es importante advertir algo"}
  ]
}
Máximo 6 pasos. Nada de texto fuera del JSON.`;

  try{
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
    });
    if(!res.ok) throw new Error('Respuesta no válida de Gemini (revisa tu clave)');
    const data = await res.json();
    let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    raw = raw.trim().replace(/^```json/i,'').replace(/^```/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(raw);

    if(!parsed.title || !Array.isArray(parsed.steps) || parsed.steps.length===0){
      throw new Error('La IA no devolvió una guía completa, intenta de nuevo.');
    }

    const nuevo = {
      id: slugify(parsed.title),
      cat: CATS[parsed.cat] ? parsed.cat : 'tec',
      title: parsed.title,
      summary: parsed.summary || '',
      time: parsed.time || '',
      youtubeQuery: term,
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      steps: parsed.steps.map(s => ({
        icon: ICONS[s.icon] ? s.icon : 'check',
        action: s.action || 'Haz',
        target: s.target || '',
        warn: s.warn || undefined
      })),
      ai: true
    };

    TUTORIALS.push(nuevo);
    saveGuiaIA(nuevo);
    renderList();
    openDetail(nuevo.id);
  }catch(err){
    if(statusEl) statusEl.textContent = 'No se pudo generar la guía: ' + err.message;
    else alert('No se pudo generar la guía: ' + err.message);
  }
}

function mostrarFormularioClave(term){
  const container = document.getElementById('cardList');
  container.insertAdjacentHTML('beforeend', `
    <div class="ia-key-form" id="iaKeyForm">
      <p class="mono" style="font-size:.8rem;margin-bottom:8px;">Pega tu clave de Gemini (solo se guarda en tu celular, en ningún servidor):</p>
      <div style="display:flex;gap:8px;">
        <input type="text" id="iaKeyInput" placeholder="Pega tu clave aquí" style="flex:1;padding:10px;border:1px solid var(--line);border-radius:8px;">
        <button type="button" id="iaKeySave" style="padding:10px 14px;border:none;border-radius:8px;background:var(--ink);color:var(--paper);">Guardar</button>
      </div>
      <p id="iaStatus" class="mono" style="font-size:.78rem;margin-top:8px;color:var(--ink-soft);"></p>
    </div>`);
  document.getElementById('iaKeySave').addEventListener('click', function(){
    const val = document.getElementById('iaKeyInput').value;
    if(!val.trim()) return;
    setGeminiKey(val);
    document.getElementById('iaKeyForm').remove();
    generarGuiaConIA(term);
  });
}

// Para revisar qué está buscando la gente y no encuentra:
// abre la consola del navegador (F12) en tu propio celular/compu y escribe: verBusquedasSinResultado()
window.verBusquedasSinResultado = function(){
  try{
    const data = JSON.parse(localStorage.getItem('busquedasSinResultado') || '{}');
    const ordenado = Object.entries(data).sort((a,b) => b[1] - a[1]);
    if(ordenado.length === 0){ console.log('Todavía no hay búsquedas sin resultado registradas en este navegador.'); return []; }
    console.table(ordenado.map(([termino, veces]) => ({ termino, veces })));
    return ordenado;
  }catch(e){ console.log('No se pudo leer el registro.'); return []; }
};

// ===== Calificación de guías (¿te sirvió?) =====
function loadRatings(){
  try{ return JSON.parse(localStorage.getItem('calificacionesGuias') || '{}'); }catch(e){ return {}; }
}
function saveRating(id, vote){
  const data = loadRatings();
  data[id] = vote;
  localStorage.setItem('calificacionesGuias', JSON.stringify(data));
}

// Para revisar qué guías sirven y cuáles no:
// abre la consola (F12) y escribe: verCalificaciones()
window.verCalificaciones = function(){
  const data = loadRatings();
  const resumen = {};
  Object.entries(data).forEach(([id, vote]) => {
    if(!resumen[id]) resumen[id] = { si: 0, no: 0 };
    resumen[id][vote]++;
  });
  const filas = Object.entries(resumen).map(([id, v]) => {
    const t = TUTORIALS.find(x => x.id === id);
    return { guia: t ? t.title : id, sirvio: v.si, noSirvio: v.no };
  });
  if(filas.length === 0){ console.log('Todavía no hay calificaciones en este navegador.'); return []; }
  console.table(filas);
  return filas;
};

// ===== Clics en botones de "Comprar" (para saber qué producto genera más tráfico) =====
function logClicProducto(id, nombre){
  try{
    const data = JSON.parse(localStorage.getItem('clicsProductos') || '{}');
    if(!data[id]) data[id] = { nombre, clics: 0 };
    data[id].clics++;
    localStorage.setItem('clicsProductos', JSON.stringify(data));
  }catch(e){}
}

// Para revisar qué botones de compra se tocan más:
// abre la consola (F12) y escribe: verClicsProductos()
window.verClicsProductos = function(){
  try{
    const data = JSON.parse(localStorage.getItem('clicsProductos') || '{}');
    const filas = Object.values(data).sort((a,b) => b.clics - a.clics);
    if(filas.length === 0){ console.log('Todavía no hay clics registrados en este navegador.'); return []; }
    console.table(filas);
    return filas;
  }catch(e){ console.log('No se pudo leer el registro.'); return []; }
};

function loadNotes(id){
  return loadState().notes?.[id] || '';
}

function saveNote(id, text){
  const state = loadState();
  state.notes = state.notes || {};
  if(text.trim()) state.notes[id] = text;
  else delete state.notes[id];
  localStorage.setItem('appState', JSON.stringify(state));
}

function renderDetailNotes(){
  if(!currentDetail) return;
  const textarea = document.getElementById('noteText');
  if(textarea){ textarea.value = loadNotes(currentDetail.id); }
}

function addToHistorial(query){
  if(!query.trim()) return;
  let state = loadState();
  state.historial = [query, ...state.historial.filter(x=>x!==query)].slice(0, 5);
  localStorage.setItem('appState', JSON.stringify(state));
  renderHistory();
  return state.historial;
}

function getHistorial(){
  return loadState().historial;
}

function clearHistorial(){
  const state = loadState();
  state.historial = [];
  localStorage.setItem('appState', JSON.stringify(state));
  renderHistory();
}

function loadFavorites(){
  return loadState().favorites || [];
}

function saveFavorites(ids){
  const state = loadState();
  state.favorites = ids;
  localStorage.setItem('appState', JSON.stringify(state));
}

function isFavorite(id){
  return loadFavorites().includes(id);
}

function toggleFavorite(id){
  const favorites = loadFavorites();
  const next = favorites.includes(id)
    ? favorites.filter(x => x !== id)
    : [...favorites, id];
  saveFavorites(next);
  renderList();
  renderDetailFavorite();
}

function renderDetailFavorite(){
  const btn = document.querySelector('.favorite-detail');
  if(!btn || !currentDetail) return;
  const active = isFavorite(currentDetail.id);
  btn.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Agregar a favoritos');
  btn.classList.toggle('active', active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  btn.textContent = active ? '★ Favorita' : '☆ Favorita';
}

function renderMediaItem(item){
  const caption = item.caption ? `<div class="media-caption">${escapeHTML(item.caption)}</div>` : '';
  if(item.type === 'image'){
    return `<div class="detail-media-item"><img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.alt || item.caption || 'Imagen')}"/>${caption}</div>`;
  }
  if(item.type === 'video'){
    return `<div class="detail-media-item detail-media-video"><iframe src="${escapeHTML(item.src)}" title="${escapeHTML(item.caption || 'Video tutorial')}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>${caption}</div>`;
  }
  return '';
}

function renderDetailText(){
  const box = document.getElementById('detailText');
  if(!box || !currentDetail) return;
  const text = currentDetail.tutorial || currentDetail.content || currentDetail.description || '';
  if(text.trim()){
    box.classList.remove('hidden');
    box.innerHTML = `<h4>Guía escrita</h4>${escapeHTML(text)}`;
  } else {
    box.classList.add('hidden');
    box.innerHTML = '';
  }
}

function escapeHTML(str){
  return (str || '').toString().replace(/[&<>"']/g, function(ch){
    return {
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
    }[ch];
  });
}

function escapeRegExp(value){
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query){
  if(!query) return escapeHTML(text);
  const escapedQuery = escapeRegExp(query);
  const regex = new RegExp(escapedQuery, 'gi');
  const parts = text.split(regex);
  const matches = text.match(regex) || [];
  return parts.reduce((html, part, index) => {
    const safePart = escapeHTML(part);
    const match = matches[index];
    return html + safePart + (match ? `<span class="highlight">${escapeHTML(match)}</span>` : '');
  }, '');
}

function debounce(fn, wait){
  let timeout;
  return function(...args){
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

function applyTheme(){
  document.documentElement.dataset.theme = currentTheme;
  const themeBtn = document.querySelector('.theme-btn');
  if(themeBtn){ themeBtn.textContent = currentTheme === 'dark' ? '☀' : '🌙'; }
}

// ===== Tamaño de letra =====
let currentFontSize = 'normal';
function applyFontSize(){
  document.documentElement.dataset.fontsize = currentFontSize;
  if(fontsizeBtn) fontsizeBtn.classList.toggle('active', currentFontSize === 'grande');
}
function toggleFontSize(){
  currentFontSize = currentFontSize === 'grande' ? 'normal' : 'grande';
  applyFontSize();
  saveState();
}

// ===== Idioma de interfaz (solo textos fijos; las guías siguen en español) =====
let currentLang = 'es';
const CATS_EN = { tec:'Technology', dinero:'Money & Paperwork', hogar:'Home & Repairs' };
const UI_TEXT = {
  es: { subtitulo:'¿Cómo hacerlo?', placeholder:'Ej: correo, depósito, azulejo', todas:'Todas', mas:'+ Más actividades', menos:'– Menos', footer:'Guarda esta página en tu pantalla de inicio para abrirla como app. Ya funciona sin internet después de tu primera visita.', videoLabel:'Buscar el video en:', ratingQ:'¿Te sirvió esta guía?', volver:'← Volver a la lista' },
  en: { subtitulo:'How do I do this?', placeholder:'Ex: email, deposit, tile', todas:'All', mas:'+ More activities', menos:'– Less', footer:'Save this page to your home screen to open it like an app. It now works offline after your first visit.', videoLabel:'Search the video on:', ratingQ:'Was this guide helpful?', volver:'← Back to list' }
};

function catLabel(key){
  return currentLang === 'en' ? CATS_EN[key] : CATS[key].label;
}

function applyLanguage(){
  const t = UI_TEXT[currentLang];
  if(langBtn){ langBtn.textContent = currentLang === 'en' ? '🌐 ES' : '🌐 EN'; langBtn.classList.toggle('active', currentLang==='en'); }
  const subEl = document.querySelector('.brand-sub'); if(subEl) subEl.textContent = t.subtitulo;
  if(searchInput) searchInput.placeholder = t.placeholder;
  const footerEl = document.getElementById('footerTip'); if(footerEl) footerEl.textContent = t.footer;
  const videoLabelEl = document.querySelector('.yt-row-label'); if(videoLabelEl) videoLabelEl.textContent = t.videoLabel;
  const ratingQEl = document.querySelector('.rating-question'); if(ratingQEl) ratingQEl.textContent = t.ratingQ;
  const backBtnEl = document.querySelector('.back-btn'); if(backBtnEl) backBtnEl.textContent = t.volver;
}
function toggleLanguage(){
  currentLang = currentLang === 'en' ? 'es' : 'en';
  applyLanguage();
  renderChips();
  renderList();
  saveState();
}

function toggleTheme(){
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  saveState();
  applyTheme();
}

function renderHistory(){
  const historial = getHistorial();
  const row = document.getElementById('historyRow');
  if(!historial.length){
    row.classList.add('hidden');
    row.innerHTML = '';
    return;
  }
  row.classList.remove('hidden');
  row.innerHTML = `<span class="history-label">Búsquedas recientes:</span>` + historial.map(item =>
    `<button type="button" class="history-item" data-search="${item}">${item}</button>`
  ).join('') + `<button type="button" class="history-clear" aria-label="Borrar historial de búsqueda">Borrar</button>`;
}

let moreOpen = false;

function renderChips(){
  const chipsEl = document.getElementById('chips');
  const moreEl = document.getElementById('chipsMore');
  const t = UI_TEXT[currentLang];

  const primary = [
    {key:'tec', label: catLabel('tec')},
    {key:'hogar', label: catLabel('hogar')}
  ];
  const extra = [
    {key:'all', label:t.todas},
    {key:'favorites', label: currentLang==='en' ? 'Favorites' : 'Favoritos'},
    {key:'dinero', label: catLabel('dinero')}
  ];

  chipsEl.innerHTML = primary.map(c =>
    `<button type="button" class="chip" data-cat="${c.key}" aria-pressed="${c.key===currentCat}">${c.label}</button>`
  ).join('') + `<button type="button" class="chip more" data-more="true">${moreOpen ? t.menos : t.mas}</button>`;

  moreEl.classList.toggle('hidden', !moreOpen);
  moreEl.innerHTML = extra.map(c =>
    `<button type="button" class="chip" data-cat="${c.key}" aria-pressed="${c.key===currentCat}">${c.label}</button>`
  ).join('');
}

function toggleMore(){
  moreOpen = !moreOpen;
  renderChips();
}

function setCat(key){
  currentCat = key;
  saveState();
  renderChips();
  renderList();
}

function normalizeText(text){
  return (text || '').toString().toLowerCase();
}

function matchesSearch(t, q){
  if(!q) return true;
  const term = q.toLowerCase();
  const content = [
    t.title,
    t.summary,
    CATS[t.cat]?.label,
    ...(t.materials || []),
    ...(t.steps || []).map(s => [s.title, s.text, s.action, s.target].filter(Boolean).join(' '))
  ].join(' ').toLowerCase();
  return content.includes(term);
}

function renderList(){
  const q = document.getElementById('searchInput').value.trim();
  const list = TUTORIALS.filter(t => {
    if(currentCat === 'emergencia') return t.emergencia && matchesSearch(t, q);
    const catMatch = currentCat === 'all' || currentCat === 'favorites'
      ? currentCat !== 'favorites' || isFavorite(t.id)
      : t.cat === currentCat;
    return catMatch && matchesSearch(t, q);
  });

  const featuredRow = document.getElementById('featuredRow');
  if(featuredRow){
    const mostrarDestacadas = !q && currentCat === 'all';
    featuredRow.classList.toggle('hidden', !mostrarDestacadas);
    if(mostrarDestacadas){
      const destacadas = TUTORIALS.filter(t => t.destacada);
      featuredRow.innerHTML = destacadas.map(t => `
        <div class="featured-card" data-id="${t.id}">
          <span class="fc-star">⭐ POPULAR</span>
          <h4>${t.title}</h4>
        </div>`).join('');
    }
  }

  const container = document.getElementById('cardList');
  document.getElementById('countLine').textContent = list.length + (list.length===1 ? ' guía disponible' : ' guías disponibles');

  if(list.length===0){
    const term = q || 'como hacerlo paso a paso';
    if(q) logMissedSearch(q);
    const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(term);
    const fbUrl = 'https://www.facebook.com/search/videos/?q=' + encodeURIComponent(term);
    const ttUrl = 'https://www.tiktok.com/search?q=' + encodeURIComponent(term);
    container.innerHTML = `
      <div class="empty">
        <h3>Todavía no tenemos esa guía</h3>
        <p>Pero puedes buscarla en video mientras la agregamos aquí.</p>
        <div class="yt-row" style="justify-content:center;">
          <a class="yt-link primary" href="${ytUrl}" target="_blank" rel="noopener">
            <span class="yt-icon youtube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.8 15.5V8.5L15.8 12z"/></svg></span>
            <span class="yt-text">Ver en YouTube</span>
          </a>
          <a class="yt-link" href="${ttUrl}" target="_blank" rel="noopener">
            <span class="yt-icon tiktok"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.7 3.5 3.7 3.8v2.9c-1.4 0-2.7-.4-3.7-1.2v6.4a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.9a2.7 2.7 0 1 0 1.9 2.6V3z"/></svg></span>
            <span class="yt-text">TikTok</span>
          </a>
          <a class="yt-link" href="${fbUrl}" target="_blank" rel="noopener">
            <span class="yt-icon facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2 0-3.5 1.5-3.5 3.5V11H8v3h2.5v7H14v-7h2.5l.5-3H14V9.3c0-.2.1-.3.3-.3z"/></svg></span>
            <span class="yt-text">Facebook</span>
          </a>
        </div>
        ${q ? '<button type="button" class="ia-generate-btn" id="iaGenerateBtn">🤖 Generar esta guía con IA</button>' : ''}
      </div>`;
    if(q){
      document.getElementById('iaGenerateBtn').addEventListener('click', function(){
        this.disabled = true;
        this.textContent = 'Generando...';
        generarGuiaConIA(q);
      });
    }
    return;
  }

  container.innerHTML = list.map(t => {
    const c = CATS[t.cat];
    const cLabel = catLabel(t.cat);
    const active = isFavorite(t.id);
    return `
    <div class="card" data-id="${t.id}" role="button" tabindex="0" aria-label="${t.title}, categoría ${cLabel}, tiempo ${t.time}">
      <div class="tab ${c.class}" aria-hidden="true"></div>
      <div class="card-body">
        <div class="card-top">
          <h3>${highlightText(t.title, q)}</h3>
          <span class="card-meta mono">⏱ ${t.time}</span>
        </div>
        <p>${highlightText(t.summary, q)}</p>
        <span class="cat-label ${c.class}">${cLabel}</span>
      </div>
      <button type="button" class="favorite-btn ${active ? 'active' : ''}" data-fav="${t.id}" aria-label="${active ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-pressed="${active ? 'true' : 'false'}">${active ? '★' : '☆'}</button>
    </div>`;
  }).join('');
}

function openDetail(id){
  if(typeof detenerLectura === 'function') detenerLectura();
  const t = TUTORIALS.find(x=>x.id===id);
  if(!t) return;
  currentDetail = t;
  history.replaceState(null, '', '#' + t.id);
  document.getElementById('detailTitle').textContent = t.title;
  document.getElementById('detailTime').textContent = '⏱ ' + t.time;
  document.getElementById('detailCat').textContent = catLabel(t.cat);
  document.getElementById('iaDisclaimer').classList.toggle('hidden', !t.ai);

  const ratingBoxEl = document.getElementById('ratingBox');
  const ratingThanksEl = document.getElementById('ratingThanks');
  if(ratingBoxEl){
    const votoPrevio = loadRatings()[t.id];
    ratingBoxEl.querySelectorAll('.rating-btn').forEach(b => {
      b.disabled = !!votoPrevio;
      b.classList.toggle('voted', votoPrevio === b.dataset.vote);
    });
    ratingThanksEl.classList.toggle('hidden', !votoPrevio);
  }

  const searchTerm = t.youtubeQuery || t.title;
  document.getElementById('ytLink').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(searchTerm);
  document.getElementById('fbLink').href = 'https://www.facebook.com/search/videos/?q=' + encodeURIComponent(searchTerm);
  document.getElementById('ttLink').href = 'https://www.tiktok.com/search?q=' + encodeURIComponent(searchTerm);

  const mediaBox = document.getElementById('mediaBox');
  if(t.media && t.media.length){
    mediaBox.style.display = 'grid';
    mediaBox.innerHTML = t.media.map(renderMediaItem).join('');
  } else {
    mediaBox.style.display = 'none';
    mediaBox.innerHTML = '';
  }

  renderDetailText();

  const matBox = document.getElementById('materialsBox');
  if(t.materials && t.materials.length){
    matBox.style.display = 'block';
    document.getElementById('materialsList').innerHTML = t.materials.map(m=>`<li>${m}</li>`).join('');
  } else {
    matBox.style.display = 'none';
  }

  // ===== Producto comprable (Mercado Libre Afiliados) =====
  // Para activarlo: busca esta guía en TUTORIALS y pega tu link en producto.link
  // Ejemplo: producto: { nombre: 'Bisagras para puerta', link: 'https://mercadolibre.com/tu-link-de-afiliado' }
  const productoBox = document.getElementById('productoBox');
  if(t.producto && t.producto.link){
    productoBox.classList.remove('hidden');
    document.getElementById('productoNombre').textContent = t.producto.nombre;
    const productoLinkEl = document.getElementById('productoLink');
    productoLinkEl.href = t.producto.link;
    productoLinkEl.onclick = function(){ logClicProducto(t.id, t.producto.nombre); };
  } else {
    productoBox.classList.add('hidden');
  }

  // ===== Profesionales recomendados (directorio por oficio, ordenado por cercanía) =====
  const profesionalBox = document.getElementById('profesionalBox');
  const listaBase = t.categoriaProfesional ? (PROFESIONALES[t.categoriaProfesional] || []) : [];
  const listaProfesionales = ordenarPorCercania(listaBase);
  if(listaProfesionales.length > 0 || t.categoriaProfesional){
    profesionalBox.classList.remove('hidden');
    const msg = `Hola, vengo de la guía "${t.title}" en ¿Cómo le hago? y necesito ayuda con esto.`;
    let html = listaProfesionales.map(p => `
      <a class="profesional-link" href="https://wa.me/${p.whatsapp}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">
        <span class="profesional-icon">📞</span>
        <span class="profesional-text">
          <b>${p.nombre}</b>
          <span>${t.categoriaProfesional}${p.distancia != null ? ' · a ' + p.distancia.toFixed(1) + ' km' : ''}</span>
        </span>
      </a>`).join('');

    if(t.categoriaProfesional){
      const mapsQuery = encodeURIComponent(t.categoriaProfesional + ' cerca de mí');
      const mapsUrl = miUbicacion
        ? `https://www.google.com/maps/search/${mapsQuery}/@${miUbicacion.lat},${miUbicacion.lng},14z`
        : `https://www.google.com/maps/search/${mapsQuery}`;
      html += `<a class="maps-link" href="${mapsUrl}" target="_blank" rel="noopener">
        🗺️ Ver más de "${t.categoriaProfesional}" en Google Maps
      </a>`;
      if(!miUbicacion){
        html += `<button type="button" class="ubicacion-btn" id="ubicacionBtn">📍 Usar mi ubicación para ordenar por cercanía</button>`;
      }
    }
    document.getElementById('profesionalLista').innerHTML = html;
    const ubicacionBtn = document.getElementById('ubicacionBtn');
    if(ubicacionBtn) ubicacionBtn.addEventListener('click', pedirUbicacion);
  } else {
    profesionalBox.classList.add('hidden');
  }

  // ===== Consulta pagada contigo (para guías técnicas) =====
  // Pega tu número de WhatsApp en CONSULTA_WHATSAPP más abajo en este archivo para activarla
  const consultaBox = document.getElementById('consultaBox');
  if(t.cat === 'tec' && CONSULTA_WHATSAPP){
    consultaBox.classList.remove('hidden');
    const msgConsulta = `Hola, vi la guía "${t.title}" y me gustaría una consulta personalizada.`;
    document.getElementById('consultaLink').href = `https://wa.me/${CONSULTA_WHATSAPP}?text=${encodeURIComponent(msgConsulta)}`;
  } else {
    consultaBox.classList.add('hidden');
  }

  renderSteps();
  renderDetailFavorite();
  renderDetailNotes();

  const relacionadasBox = document.getElementById('relacionadasBox');
  if(relacionadasBox){
    const relacionadas = TUTORIALS
      .filter(x => x.cat === t.cat && x.id !== t.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    if(relacionadas.length > 0){
      relacionadasBox.classList.remove('hidden');
      document.getElementById('relacionadasLista').innerHTML = relacionadas.map(r => {
        const c = CATS[r.cat];
        return `<a class="relacionada-item" data-id="${r.id}"><span class="tab ${c.class}"></span><span>${r.title}</span></a>`;
      }).join('');
    } else {
      relacionadasBox.classList.add('hidden');
    }
  }

  document.getElementById('listView').classList.add('hidden');
  document.getElementById('detail').classList.add('open');
  document.getElementById('footerTip').style.display = 'none';
  window.scrollTo(0,0);
}

function renderSteps(){
  const t = currentDetail;
  const done = loadProgress(t.id);
  const stepsEl = document.getElementById('stepsList');
  stepsEl.innerHTML = t.steps.map((s, i) => {
    const isDone = done.includes(i);
    return `
    <div class="step ${isDone?'done':''}" data-n="${i+1}">
      <div class="step-row">
        <input type="checkbox" id="step-check-${i}" data-step="${i}" ${isDone?'checked':''} aria-label="Marcar como hecho: ${(s.target || s.title).replace(/"/g,'&quot;')}">
        <div class="step-icon" aria-hidden="true">${icon(s.icon)}</div>
        <div class="step-text">
          <span class="step-num">Paso ${i+1}</span>
          <h4>${s.action ? `<span class="tap-badge">${s.action}</span>` : ''}${s.target || s.title}</h4>
          ${s.text ? `<p>${s.text}</p>` : ''}
          ${s.warn ? `<div class="warn" role="alert">⚠ ${s.warn}</div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
  updateProgressBar();
}

function toggleStep(i){
  const t = currentDetail;
  let done = loadProgress(t.id);
  if(done.includes(i)) done = done.filter(x=>x!==i);
  else {
    done.push(i);
    // Integración con módulo de ahorro: cuando se completa todos los pasos
    if(done.length === t.steps.length && typeof AhorroModule !== 'undefined') {
      AhorroModule.addSavings(t.id);
    }
    if(done.length === t.steps.length) marcarGuiaCompletada(t.id);
    if(done.length === t.steps.length && t.recordatorioMeses) guardarRecordatorio(t.id, t.recordatorioMeses);
  }
  saveProgress(t.id, done);
  renderSteps();
}

// ===== Logros / insignias =====
const HITOS = [
  { cantidad:1, icono:'🌱', etiqueta:'Primera guía' },
  { cantidad:5, icono:'🔧', etiqueta:'5 guías' },
  { cantidad:10, icono:'⭐', etiqueta:'10 guías' },
  { cantidad:25, icono:'🏆', etiqueta:'25 guías' },
  { cantidad:50, icono:'💎', etiqueta:'50 guías' },
  { cantidad:100, icono:'👑', etiqueta:'100 guías' }
];

// ===== Racha diaria (como Duolingo: entra seguido y sube) =====
const HITOS_RACHA = [3, 7, 14, 30, 60, 100];

function fechaISO(date){ return date.toISOString().slice(0,10); }

function actualizarRacha(){
  try{
    const hoy = fechaISO(new Date());
    const data = JSON.parse(localStorage.getItem('rachaDiaria') || '{}');
    let { ultimaFecha, actual, mejor } = { ultimaFecha: data.ultimaFecha || null, actual: data.actual || 0, mejor: data.mejor || 0 };

    if(ultimaFecha === hoy){
      // Ya contamos hoy, no hacer nada más
    } else {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      if(ultimaFecha === fechaISO(ayer)){
        actual = actual + 1;
      } else {
        actual = 1;
      }
      mejor = Math.max(actual, mejor);
      localStorage.setItem('rachaDiaria', JSON.stringify({ ultimaFecha: hoy, actual, mejor }));

      if(HITOS_RACHA.includes(actual)){
        mostrarNotificacionLogro({ icono:'🔥', etiqueta: actual + ' días seguidos' });
      }
    }

    const el = document.getElementById('rachaCount');
    if(el) el.textContent = actual;
  }catch(e){}
}

function loadCompletadas(){
  try{ return JSON.parse(localStorage.getItem('guiasCompletadas') || '[]'); }catch(e){ return []; }
}

// ===== Bitácora de mantenimiento =====
function loadBitacora(){
  try{ return JSON.parse(localStorage.getItem('bitacoraMantenimiento') || '{}'); }catch(e){ return {}; }
}

function guardarRecordatorio(guiaId, meses){
  const bitacora = loadBitacora();
  const proxima = new Date();
  proxima.setMonth(proxima.getMonth() + meses);
  bitacora[guiaId] = { fechaProxima: fechaISO(proxima), meses };
  localStorage.setItem('bitacoraMantenimiento', JSON.stringify(bitacora));
  actualizarAlertaBitacora();
}

function actualizarAlertaBitacora(){
  const bitacora = loadBitacora();
  const hoy = fechaISO(new Date());
  const hayVencidos = Object.values(bitacora).some(item => item.fechaProxima <= hoy);
  const alerta = document.getElementById('bitacoraAlerta');
  if(alerta) alerta.classList.toggle('hidden', !hayVencidos);
}

function renderBitacoraModal(){
  const bitacora = loadBitacora();
  const lista = document.getElementById('bitacoraLista');
  const entradas = Object.entries(bitacora);

  if(entradas.length === 0){
    lista.innerHTML = '<p class="bitacora-vacio">Todavía no tienes nada en tu bitácora.<br>Completa una guía de mantenimiento (como "Cambiar el aceite") y aquí te avisaremos cuándo te toca otra vez.</p>';
    return;
  }

  const hoy = fechaISO(new Date());
  const ordenado = entradas.map(([id, item]) => {
    const t = TUTORIALS.find(x => x.id === id);
    return { id, titulo: t ? t.title : id, fechaProxima: item.fechaProxima, vencido: item.fechaProxima <= hoy };
  }).sort((a,b) => a.fechaProxima.localeCompare(b.fechaProxima));

  lista.innerHTML = ordenado.map(item => `
    <div class="bitacora-item ${item.vencido ? 'vencido' : ''}" data-id="${item.id}">
      <span class="bitacora-item-titulo">${item.titulo}</span>
      <span class="bitacora-item-fecha mono">${item.vencido ? '¡Ya te toca!' : item.fechaProxima}</span>
    </div>`).join('');
}

function marcarGuiaCompletada(id){
  const lista = loadCompletadas();
  if(lista.includes(id)) return;
  lista.push(id);
  localStorage.setItem('guiasCompletadas', JSON.stringify(lista));
  actualizarBadgesCount();

  const nuevoHito = HITOS.find(h => h.cantidad === lista.length);
  if(nuevoHito) mostrarNotificacionLogro(nuevoHito);
}

function actualizarBadgesCount(){
  const el = document.getElementById('badgesCount');
  if(el) el.textContent = loadCompletadas().length;
}

function mostrarNotificacionLogro(hito){
  const div = document.createElement('div');
  div.className = 'logro-notification';
  div.innerHTML = `<span style="font-size:1.4rem;">${hito.icono}</span><div><b>¡Nueva insignia!</b><br>${hito.etiqueta}</div>`;
  document.body.appendChild(div);
  requestAnimationFrame(() => div.classList.add('show'));
  setTimeout(() => { div.classList.remove('show'); setTimeout(() => div.remove(), 400); }, 3200);
}

function renderBadgesModal(){
  const completadas = loadCompletadas().length;
  document.getElementById('badgesTotal').textContent = completadas + (completadas===1 ? ' guía completada' : ' guías completadas');
  const grid = document.getElementById('badgesGrid');
  grid.innerHTML = HITOS.map(h => {
    const unlocked = completadas >= h.cantidad;
    return `<div class="badge-item ${unlocked?'unlocked':''}">
      <div class="badge-icon">${unlocked ? h.icono : '🔒'}</div>
      <span class="badge-label">${h.etiqueta}</span>
    </div>`;
  }).join('');
}

function updateProgressBar(){
  const t = currentDetail;
  const done = loadProgress(t.id);
  const pct = Math.round((done.length / t.steps.length) * 100);
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressText').textContent =
    done.length===t.steps.length && t.steps.length>0
      ? '¡Listo! Completaste esta guía.'
      : `${done.length} de ${t.steps.length} pasos completados`;
}

function resetProgress(){
  if(!currentDetail) return;
  saveProgress(currentDetail.id, []);
  renderSteps();
}

function closeDetail(){
  if(typeof detenerLectura === 'function') detenerLectura();
  document.getElementById('detail').classList.remove('open');
  document.getElementById('listView').classList.remove('hidden');
  document.getElementById('footerTip').style.display = 'block';
  currentDetail = null;
  history.replaceState(null, '', location.pathname + location.search);
}

const searchInput = document.getElementById('searchInput');
const clearBtn = document.querySelector('.clear-btn');
const micBtn = document.getElementById('micBtn');
const themeBtn = document.querySelector('.theme-btn');
const badgesBtn = document.getElementById('badgesBtn');
const fontsizeBtn = document.getElementById('fontsizeBtn');
const langBtn = document.getElementById('langBtn');
const chipsEl = document.getElementById('chips');
const chipsMoreEl = document.getElementById('chipsMore');
const cardList = document.getElementById('cardList');
const backBtn = document.querySelector('.back-btn');
const resetBtn = document.querySelector('.reset-row button');
const stepsList = document.getElementById('stepsList');
const noteText = document.getElementById('noteText');

// ===== Búsqueda por voz =====
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
if(micBtn){
  if(!SpeechRecognitionAPI){
    micBtn.style.display = 'none';
  } else {
    const recognizer = new SpeechRecognitionAPI();
    recognizer.lang = 'es-MX';
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    micBtn.addEventListener('click', function(){
      if(micBtn.classList.contains('listening')){
        recognizer.stop();
        return;
      }
      try{ recognizer.start(); }catch(e){}
    });
    recognizer.onstart = function(){ micBtn.classList.add('listening'); };
    recognizer.onend = function(){ micBtn.classList.remove('listening'); };
    recognizer.onerror = function(){ micBtn.classList.remove('listening'); };
    recognizer.onresult = function(event){
      const texto = event.results[0][0].transcript;
      searchInput.value = texto;
      renderList();
    };
  }
}

const debouncedRenderList = debounce(renderList, 180);
const debouncedSaveNote = debounce(function(){
  if(!currentDetail || !noteText) return;
  saveNote(currentDetail.id, noteText.value);
}, 350);

function updateClearButton(){
  clearBtn.classList.toggle('hidden', !searchInput.value.trim());
}

function clearSearch(){
  searchInput.value = '';
  updateClearButton();
  renderList();
}

searchInput.addEventListener('input', function(){
  updateClearButton();
  debouncedRenderList();
});

searchInput.addEventListener('keydown', function(e){
  if(e.key === 'Enter'){ 
    e.preventDefault();
    if(this.value.trim()){
      addToHistorial(this.value.trim());
    }
    renderList();
    this.blur(); 
  }
});

clearBtn.addEventListener('click', clearSearch);

noteText?.addEventListener('input', debouncedSaveNote);

document.querySelector('.search-btn').addEventListener('click', function(){
  if(searchInput.value.trim()){
    addToHistorial(searchInput.value.trim());
  }
  renderList();
});

themeBtn.addEventListener('click', toggleTheme);

document.getElementById('historyRow').addEventListener('click', function(e){
  const item = e.target.closest('[data-search]');
  if(item){
    searchInput.value = item.dataset.search;
    updateClearButton();
    renderList();
    return;
  }
  if(e.target.closest('.history-clear')){
    clearHistorial();
  }
});

chipsEl.addEventListener('click', function(e){
  const button = e.target.closest('button');
  if(!button) return;
  if(button.dataset.more){ toggleMore(); return; }
  if(button.dataset.cat){ setCat(button.dataset.cat); }
});

chipsMoreEl.addEventListener('click', function(e){
  const button = e.target.closest('button');
  if(!button) return;
  if(button.dataset.cat){ setCat(button.dataset.cat); }
});

cardList.addEventListener('click', function(e){
  const fav = e.target.closest('[data-fav]');
  if(fav){
    toggleFavorite(fav.dataset.fav);
    return;
  }
  const card = e.target.closest('.card');
  if(!card) return;
  openDetail(card.dataset.id);
});

cardList.addEventListener('keydown', function(e){
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.card');
  if(!card) return;
  e.preventDefault();
  openDetail(card.dataset.id);
});

const featuredRowEl = document.getElementById('featuredRow');
if(featuredRowEl){
  featuredRowEl.addEventListener('click', function(e){
    const card = e.target.closest('.featured-card');
    if(!card) return;
    openDetail(card.dataset.id);
  });
}

const relacionadasBoxEl = document.getElementById('relacionadasBox');
if(relacionadasBoxEl){
  relacionadasBoxEl.addEventListener('click', function(e){
    const item = e.target.closest('.relacionada-item');
    if(!item) return;
    openDetail(item.dataset.id);
  });
}

backBtn.addEventListener('click', closeDetail);
document.querySelector('.favorite-detail')?.addEventListener('click', function(){
  if(!currentDetail) return;
  toggleFavorite(currentDetail.id);
});

resetBtn.addEventListener('click', resetProgress);

if(fontsizeBtn){
  fontsizeBtn.addEventListener('click', toggleFontSize);
}
if(langBtn){
  langBtn.addEventListener('click', toggleLanguage);
}

const rachaBtn = document.getElementById('rachaBtn');

const bitacoraBtn = document.getElementById('bitacoraBtn');
const bitacoraModal = document.getElementById('bitacoraModal');
const bitacoraClose = document.getElementById('bitacoraClose');
if(bitacoraBtn){
  bitacoraBtn.addEventListener('click', function(){
    renderBitacoraModal();
    bitacoraModal.classList.remove('hidden');
  });
}
if(bitacoraClose) bitacoraClose.addEventListener('click', () => bitacoraModal.classList.add('hidden'));
if(bitacoraModal){
  bitacoraModal.addEventListener('click', function(e){
    if(e.target === bitacoraModal){ bitacoraModal.classList.add('hidden'); return; }
    const item = e.target.closest('.bitacora-item');
    if(item){ bitacoraModal.classList.add('hidden'); openDetail(item.dataset.id); }
  });
}

const emergenciaBtn = document.getElementById('emergenciaBtn');
if(emergenciaBtn){
  emergenciaBtn.addEventListener('click', function(){
    closeDetail();
    currentCat = 'emergencia';
    searchInput.value = '';
    renderChips();
    renderList();
    window.scrollTo(0,0);
  });
}
if(rachaBtn){
  rachaBtn.addEventListener('click', function(){
    try{
      const data = JSON.parse(localStorage.getItem('rachaDiaria') || '{}');
      alert(`Racha actual: ${data.actual || 0} días\nTu mejor racha: ${data.mejor || 0} días`);
    }catch(e){}
  });
}

const relacionadasListaEl = document.getElementById('relacionadasLista');
if(relacionadasListaEl){
  relacionadasListaEl.addEventListener('click', function(e){
    const item = e.target.closest('.relacionada-item');
    if(item) openDetail(item.dataset.id);
  });
}

if(badgesBtn){
  badgesBtn.addEventListener('click', function(){
    renderBadgesModal();
    document.getElementById('badgesModal').classList.remove('hidden');
  });
}
const badgesModal = document.getElementById('badgesModal');
const badgesClose = document.getElementById('badgesClose');
if(badgesClose) badgesClose.addEventListener('click', () => badgesModal.classList.add('hidden'));
if(badgesModal) badgesModal.addEventListener('click', function(e){ if(e.target === badgesModal) badgesModal.classList.add('hidden'); });

const resetAllBtn = document.getElementById('resetAllBtn');
if(resetAllBtn){
  resetAllBtn.addEventListener('click', function(){
    const ok = confirm('Esto borra favoritos, notas, progreso, calificaciones e insignias en este navegador. ¿Seguro que quieres continuar?');
    if(!ok) return;
    const claves = Object.keys(localStorage).filter(k =>
      k === 'appState' || k === 'guiasGeneradasIA' || k === 'guiasCompletadas' ||
      k === 'calificacionesGuias' || k === 'busquedasSinResultado' || k === 'clicsProductos' ||
      k === 'geminiApiKey' || k === 'rachaDiaria' || k === 'bitacoraMantenimiento' || k.startsWith('progreso_')
    );
    claves.forEach(k => localStorage.removeItem(k));
    location.reload();
  });
}

const ratingBox = document.getElementById('ratingBox');
if(ratingBox){
  ratingBox.addEventListener('click', function(e){
    const btn = e.target.closest('.rating-btn');
    if(!btn || !currentDetail) return;
    saveRating(currentDetail.id, btn.dataset.vote);
    ratingBox.querySelectorAll('.rating-btn').forEach(b => {
      b.disabled = true;
      if(b === btn) b.classList.add('voted');
    });
    document.getElementById('ratingThanks').classList.remove('hidden');
  });
}

stepsList.addEventListener('change', function(e){
  const checkbox = e.target.closest('input[type="checkbox"][data-step]');
  if(!checkbox) return;
  toggleStep(Number(checkbox.dataset.step));
});

TUTORIALS.push(...loadGuiasIA());

// ===== Fuente externa: permite que otra empresa conecte sus propias guías =====
// Uso: tuapp.com/?fuente=https://loquesea.com/mis-guias.json
// El JSON externo debe tener esta forma:
// { "appName": "Nombre de la empresa", "appTagline": "Su leyenda", "modo": "privado" o "agregado", "guias": [ ...mismos campos que TUTORIALS... ] }
async function cargarFuenteExterna(){
  const params = new URLSearchParams(location.search);
  const fuenteUrl = params.get('fuente');
  if(!fuenteUrl) return;

  try{
    const res = await fetch(fuenteUrl);
    if(!res.ok) throw new Error('No se pudo leer la fuente externa');
    const data = await res.json();
    if(!Array.isArray(data.guias)) throw new Error('El JSON externo no tiene el formato correcto');

    const guiasExternas = data.guias.map(g => ({ ...g, externa: true }));

    if(data.modo === 'privado'){
      TUTORIALS.length = 0;
      TUTORIALS.push(...guiasExternas);
    } else {
      TUTORIALS.push(...guiasExternas);
    }

    if(data.appName) document.querySelector('.brand h1').textContent = data.appName;
    if(data.appTagline) document.querySelector('.brand-sub').textContent = data.appTagline;
  }catch(err){
    console.log('No se pudo cargar la fuente externa:', err.message);
  }
}

async function iniciarApp(){
  await cargarFuenteExterna();

  const savedState = loadState();
  currentTheme = savedState.theme || 'light';
  currentCat = savedState.cat || 'all';
  currentLang = savedState.lang || 'es';
  currentFontSize = savedState.fontSize || 'normal';
  applyTheme();
  applyFontSize();
  applyLanguage();
  renderChips();
  renderHistory();
  renderList();
  actualizarBadgesCount();
  actualizarRacha();
  actualizarAlertaBitacora();
  cargarLivesVenta();

  const misVideosSection = document.getElementById('misVideosSection');
  if(misVideosSection && MIS_VIDEOS_PLAYLIST_ID){
    misVideosSection.classList.remove('hidden');
    document.getElementById('misVideosEmbed').src = `https://www.youtube.com/embed/videoseries?list=${MIS_VIDEOS_PLAYLIST_ID}`;
  }

  const donacionRow = document.getElementById('donacionRow');
  if(donacionRow && DONACION_LINK){
    donacionRow.classList.remove('hidden');
    document.getElementById('donacionLink').href = DONACION_LINK;
  }

  if(location.hash){
    const sharedId = location.hash.slice(1);
    if(TUTORIALS.some(t => t.id === sharedId)){
      openDetail(sharedId);
    } else if(sharedId.startsWith('live-')){
      setTimeout(() => {
        const el = document.getElementById(sharedId);
        if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
      }, 300);
    }
  }
}
iniciarApp();

const shareBtn = document.getElementById('shareBtn');
if(shareBtn){
  shareBtn.addEventListener('click', function(){
    if(!currentDetail) return;
    const base = location.origin + location.pathname.replace(/index\.html$/, '');
    const url = base + 'guias/' + currentDetail.id + '.html';
    const msg = `*${currentDetail.title}* — guía paso a paso:\n${url}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  });
}

const printBtn = document.getElementById('printBtn');
if(printBtn){
  printBtn.addEventListener('click', function(){ window.print(); });
}

// ===== Modo de voz: lee la guía paso por paso y resalta el paso actual =====
let leyendoVoz = false;
const voiceBtn = document.getElementById('voiceBtn');

function detenerLectura(){
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
  leyendoVoz = false;
  document.querySelectorAll('.step.reading').forEach(el => el.classList.remove('reading'));
  if(voiceBtn){ voiceBtn.textContent = '🔊 Leer en voz alta'; voiceBtn.classList.remove('reading'); }
}

function leerGuiaEnVoz(){
  if(!('speechSynthesis' in window)){
    alert('Tu navegador no soporta la lectura en voz alta.');
    return;
  }
  if(!currentDetail) return;

  if(leyendoVoz){ detenerLectura(); return; }

  leyendoVoz = true;
  voiceBtn.textContent = '⏹ Detener lectura';
  voiceBtn.classList.add('reading');

  const t = currentDetail;
  const textos = [t.title, ...t.steps.map((s,i) => `Paso ${i+1}. ${s.action || ''} ${s.target || s.title}. ${s.warn ? 'Cuidado: ' + s.warn : ''}`)];
  let idx = 0;

  function leerSiguiente(){
    document.querySelectorAll('.step.reading').forEach(el => el.classList.remove('reading'));
    if(!leyendoVoz || idx >= textos.length){ detenerLectura(); return; }
    if(idx > 0){
      const stepEl = document.querySelector(`.step[data-n="${idx}"]`);
      if(stepEl){ stepEl.classList.add('reading'); stepEl.scrollIntoView({behavior:'smooth', block:'center'}); }
    }
    const utterance = new SpeechSynthesisUtterance(textos[idx]);
    utterance.lang = 'es-MX';
    utterance.rate = 0.95;
    utterance.onend = function(){ idx++; leerSiguiente(); };
    utterance.onerror = function(){ detenerLectura(); };
    window.speechSynthesis.speak(utterance);
  }
  leerSiguiente();
}

if(voiceBtn){
  voiceBtn.addEventListener('click', leerGuiaEnVoz);
  if(!('speechSynthesis' in window)) voiceBtn.style.display = 'none';
}

if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  });
}
