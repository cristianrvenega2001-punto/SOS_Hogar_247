// SOS Hogar 24/7 · interacciones del sitio (sin JS en línea, compatible con CSP estricta)
(function () {
  'use strict';
  var WA = 'https://wa.me/56998428974';

  // Aparición suave al hacer scroll
  var aparecen = document.querySelectorAll('.aparece');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    aparecen.forEach(function (el) { io.observe(el); });
  } else {
    aparecen.forEach(function (el) { el.classList.add('visible'); });
  }

  // Servicios: en celular, abrir uno cierra los demás
  var servicios = document.querySelectorAll('.srv');
  servicios.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open && window.matchMedia('(max-width:640px)').matches) {
        servicios.forEach(function (o) { if (o !== d) o.open = false; });
      }
    });
  });

  // Galería: filtros y "ver más"
  var LIMITE = window.matchMedia('(max-width:640px)').matches ? 8 : 12;
  var filtro = 'todos';
  var expandida = false;
  var obrasGaleria = Array.prototype.slice.call(document.querySelectorAll('.galeria .obra'));
  var obrasAD = Array.prototype.slice.call(document.querySelectorAll('.antes-despues .obra'));
  var bloqueAD = document.querySelector('.antes-despues');
  var verMas = document.getElementById('ver-mas');

  function aplicar() {
    var n = 0;
    obrasGaleria.forEach(function (o) {
      var coincide = filtro === 'todos' || o.dataset.cat === filtro;
      var mostrar = coincide && (expandida || n < LIMITE);
      if (coincide) n++;
      o.hidden = !mostrar;
    });
    var adVisible = 0;
    obrasAD.forEach(function (o) {
      var ver = filtro === 'todos' || o.dataset.cat === filtro;
      o.hidden = !ver;
      if (ver) adVisible++;
    });
    bloqueAD.hidden = adVisible === 0;
    if (verMas) verMas.hidden = expandida || n <= LIMITE;
  }
  document.querySelectorAll('.filtro').forEach(function (b) {
    b.addEventListener('click', function () {
      filtro = b.dataset.filtro;
      document.querySelectorAll('.filtro').forEach(function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      aplicar();
    });
  });
  if (verMas) verMas.addEventListener('click', function () { expandida = true; aplicar(); });
  aplicar();

  // Visor de fotos y videos
  var visor = document.getElementById('visor');
  var media = document.getElementById('visor-media');
  var texto = document.getElementById('visor-txt');
  var lista = [];
  var actual = 0;
  var ultimoFoco = null;

  function visibles() {
    return obrasAD.concat(obrasGaleria).filter(function (o) { return !o.hidden && !o.closest('[hidden]'); });
  }
  function mostrar(i) {
    actual = (i + lista.length) % lista.length;
    var o = lista[actual];
    media.textContent = '';
    var el;
    if (o.dataset.tipo === 'video') {
      el = document.createElement('video');
      el.src = o.dataset.src;
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
      el.className = 'visor-v';
    } else {
      el = document.createElement('img');
      el.src = o.dataset.src;
      el.alt = o.dataset.titulo;
    }
    media.appendChild(el);
    texto.textContent = o.dataset.titulo;
  }
  function abrir(o) {
    lista = visibles();
    ultimoFoco = o;
    visor.classList.add('abierto');
    document.body.style.overflow = 'hidden';
    mostrar(lista.indexOf(o));
    visor.querySelector('.cerrar').focus();
  }
  function cerrar() {
    visor.classList.remove('abierto');
    media.textContent = '';
    document.body.style.overflow = '';
    if (ultimoFoco) ultimoFoco.focus();
  }
  obrasAD.concat(obrasGaleria).forEach(function (o) {
    o.addEventListener('click', function () { abrir(o); });
  });
  visor.querySelector('.cerrar').addEventListener('click', cerrar);
  visor.querySelector('.ant').addEventListener('click', function () { mostrar(actual - 1); });
  visor.querySelector('.sig').addEventListener('click', function () { mostrar(actual + 1); });
  visor.addEventListener('click', function (e) { if (e.target === visor) cerrar(); });
  document.addEventListener('keydown', function (e) {
    if (!visor.classList.contains('abierto')) return;
    if (e.key === 'Escape') cerrar();
    if (e.key === 'ArrowLeft') mostrar(actual - 1);
    if (e.key === 'ArrowRight') mostrar(actual + 1);
  });

  // Formulario: valida, exige consentimiento y abre WhatsApp con los datos
  var form = document.getElementById('form-cotiza');
  var error = document.getElementById('form-error');
  var ok = document.getElementById('form-ok');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements['bot-field'].value) return;
      var nombre = form.elements.nombre.value.trim();
      var telefono = form.elements.telefono.value.trim();
      var sector = form.elements.sector.value;
      var servicio = form.elements.servicio.value;
      var detalle = form.elements.detalle.value.trim();
      var falta = [];
      if (!nombre) falta.push('nombre');
      if (!/^[+\d\s()-]{8,20}$/.test(telefono)) falta.push('un teléfono válido');
      if (!sector) falta.push('tu comuna');
      if (!servicio) falta.push('el servicio');
      if (falta.length) {
        error.textContent = 'Falta ' + falta.join(', ') + '.';
        error.hidden = false;
        return;
      }
      if (!form.elements['acepta-privacidad'].checked) {
        error.textContent = 'Para enviar, acepta la Política de Privacidad.';
        error.hidden = false;
        return;
      }
      error.hidden = true;
      var msg = '*Solicitud de cotización · SOS Hogar 24/7*' +
        '\n*Nombre:* ' + nombre +
        '\n*Teléfono:* ' + telefono +
        '\n*Comuna:* ' + sector +
        '\n*Servicio:* ' + servicio +
        (detalle ? '\n*Detalle:* ' + detalle : '') +
        '\n*Acepta ofertas por WhatsApp:* ' + (form.elements['acepta-ofertas'].checked ? 'Sí' : 'No');
      window.open(WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      form.classList.add('listo');
      ok.classList.add('visible');
    });
  }
})();
