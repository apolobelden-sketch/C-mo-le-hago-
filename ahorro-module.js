/*
  Calculadora de Ahorro — módulo independiente
  Reconstruido según AHORRO-DOCS.md
  Cuantifica el dinero que ahorra el usuario haciendo mantenimiento por su cuenta
  en vez de llevarlo a un taller. Usa localStorage, sin dependencias externas.
*/

const AhorroModule = (function(){

  const CLAVE_TOTAL = 'ahorroTotalAcumulado';
  const CLAVE_BANNER_CERRADO = 'ahorrobannerClosed';

  function formatCurrency(amount){
    const num = Math.round(Number(amount) || 0);
    return '$' + num.toLocaleString('es-MX');
  }

  function getTotal(){
    const val = parseFloat(localStorage.getItem(CLAVE_TOTAL));
    return isNaN(val) ? 0 : val;
  }

  function setTotal(nuevoTotal){
    localStorage.setItem(CLAVE_TOTAL, String(nuevoTotal));
  }

  function bannerCerrado(){
    return localStorage.getItem(CLAVE_BANNER_CERRADO) === 'true';
  }

  function crearBanner(){
    if(document.getElementById('ahorro-banner') || bannerCerrado()) return;

    const banner = document.createElement('div');
    banner.className = 'ahorro-banner';
    banner.id = 'ahorro-banner';
    banner.innerHTML = `
      <div class="ahorro-banner-content">
        <span class="ahorro-icon">💰</span>
        <div class="ahorro-text">
          <p class="ahorro-label">Llevas ahorrado</p>
          <p class="ahorro-amount" id="ahorro-counter">${formatCurrency(getTotal())}</p>
          <p class="ahorro-desc">Haciéndolo tú mismo en vez del taller</p>
        </div>
        <button type="button" class="ahorro-close" id="ahorro-close" aria-label="Cerrar">×</button>
      </div>`;

    document.body.insertBefore(banner, document.body.firstChild);

    document.getElementById('ahorro-close').addEventListener('click', function(){
      localStorage.setItem(CLAVE_BANNER_CERRADO, 'true');
      banner.remove();
    });
  }

  function actualizarBanner(){
    const counter = document.getElementById('ahorro-counter');
    if(!counter) return;
    counter.textContent = formatCurrency(getTotal());
    counter.classList.remove('updated');
    void counter.offsetWidth; // reinicia la animación
    counter.classList.add('updated');
  }

  function mostrarNotificacion(monto){
    const div = document.createElement('div');
    div.className = 'ahorro-notification';
    div.innerHTML = `
      <div class="ahorro-notification-content">
        <span class="ahorro-notification-icon">💰</span>
        <span>¡Ahorraste ${formatCurrency(monto)}!</span>
      </div>`;
    document.body.appendChild(div);
    requestAnimationFrame(() => div.classList.add('show'));
    setTimeout(() => {
      div.classList.remove('show');
      setTimeout(() => div.remove(), 400);
    }, 3000);
  }

  function addSavings(tutorialId){
    if(typeof TUTORIALS === 'undefined') return false;
    const t = TUTORIALS.find(x => x.id === tutorialId);
    if(!t || typeof t.costoPiezas !== 'number' || typeof t.costoTaller !== 'number') return false;
    if(t.costoTaller <= t.costoPiezas) return false;

    const ahorro = t.costoTaller - t.costoPiezas;
    const nuevoTotal = getTotal() + ahorro;
    setTotal(nuevoTotal);

    if(!bannerCerrado()){
      crearBanner();
      actualizarBanner();
    }
    mostrarNotificacion(ahorro);
    return true;
  }

  function reset(){
    localStorage.removeItem(CLAVE_TOTAL);
    localStorage.removeItem(CLAVE_BANNER_CERRADO);
    const banner = document.getElementById('ahorro-banner');
    if(banner) banner.remove();
  }

  function init(){
    crearBanner();
  }

  return { init, addSavings, getTotal, formatCurrency, reset };
})();

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', AhorroModule.init);
} else {
  AhorroModule.init();
}
