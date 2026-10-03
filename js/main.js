/* =================================================================
   MAIN.JS · Análisis de PedidosYa
   Todo el código está dentro de una función que se ejecuta sola
   (así las variables no se mezclan con otras páginas o librerías).
   Cada parte está separada en funciones "init..." y se ejecutan
   dentro de safe(): si una falla, las demás siguen funcionando.
   ================================================================= */
(function () {
  'use strict';

  // ¿Cargó GSAP desde internet? Si no, el sitio funciona igual pero sin animaciones.
  var hayGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  // Ejecuta una función y, si da error, lo muestra en la consola sin romper el resto.
  function safe(fn, nombre) {
    try { fn(); } catch (err) { console.warn('[PedidosYa] Falló ' + nombre + ':', err); }
  }

  /* ---------------------------------------------------------------
     1. MENÚ: sombra al bajar, barra de progreso, menú de celular
     y resaltar la sección en la que estás.
     --------------------------------------------------------------- */
  function initNav() {
    var nav = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    var progreso = document.getElementById('navProgress');
    var links = document.querySelectorAll('.nav__menu a');

    // Al hacer scroll: sombra en el menú + barrita de progreso
    function alScrollear() {
      var y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 20);
      var total = document.documentElement.scrollHeight - window.innerHeight;
      progreso.style.transform = 'scaleX(' + (total > 0 ? y / total : 0) + ')';
    }
    window.addEventListener('scroll', alScrollear, { passive: true });
    alScrollear();

    // Botón hamburguesa (celular): abre y cierra el menú
    toggle.addEventListener('click', function () {
      var abierto = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });

    // Al tocar un link del menú, se cierra (en celular)
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Resaltar en el menú la sección que se está viendo
    if ('IntersectionObserver' in window) {
      var observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

      links.forEach(function (a) {
        var seccion = document.querySelector(a.getAttribute('href'));
        if (seccion) observador.observe(seccion);
      });
    }
  }

  /* ---------------------------------------------------------------
     2. PESTAÑAS de las 4P
     --------------------------------------------------------------- */
  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (tabs) {
      var botones = tabs.querySelectorAll('.tabs__btn');
      var paneles = tabs.querySelectorAll('.tabs__panel');

      // Avisamos al CSS que el JS funciona: recién ahí se ocultan las pestañas no elegidas
      tabs.classList.add('js-tabs');

      function mostrar(boton) {
        botones.forEach(function (b) {
          var activo = b === boton;
          b.classList.toggle('is-active', activo);
          b.setAttribute('aria-selected', activo ? 'true' : 'false');
          b.setAttribute('tabindex', activo ? '0' : '-1');
        });
        paneles.forEach(function (p) {
          var activo = p.id === boton.getAttribute('aria-controls');
          p.classList.toggle('is-active', activo);
          // Pequeña animación al cambiar de pestaña
          if (activo && hayGSAP) {
            gsap.fromTo(p.children, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .5, stagger: .06, ease: 'power2.out', overwrite: true });
            // Las animaciones de las tarjetas de acciones
            gsap.fromTo(p.querySelectorAll('.action'), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: .45, stagger: .07, delay: .15, ease: 'power2.out' });
          }
        });
        if (hayGSAP) ScrollTrigger.refresh(); // recalcula posiciones porque cambió el alto de la página
      }

      botones.forEach(function (b, i) {
        b.addEventListener('click', function () { mostrar(b); });
        // Flechas del teclado para moverse entre pestañas
        b.addEventListener('keydown', function (e) {
          var sig = null;
          if (e.key === 'ArrowRight') sig = botones[(i + 1) % botones.length];
          if (e.key === 'ArrowLeft') sig = botones[(i - 1 + botones.length) % botones.length];
          if (sig) { e.preventDefault(); sig.focus(); mostrar(sig); }
        });
      });
    });
  }

  /* ---------------------------------------------------------------
     3. ACORDEONES del FODA: animación suave al abrir
     (abrir/cerrar ya funciona solo gracias a <details>)
     --------------------------------------------------------------- */
  function initAcordeones() {
    if (!hayGSAP) return;
    document.querySelectorAll('.acc').forEach(function (acc) {
      acc.addEventListener('toggle', function () {
        if (acc.open) {
          gsap.fromTo(acc.querySelector('.acc__body'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out' });
        }
        ScrollTrigger.refresh();
      });
    });
  }

  /* ---------------------------------------------------------------
     4. CONTADORES animados (28%, 181,5 millones, 21%, 60%, 31%)
     El número final ya está escrito en el HTML. Acá solo lo hacemos
     "contar" desde 0 cuando aparece en pantalla.
     --------------------------------------------------------------- */
  function initContadores() {
    var contadores = document.querySelectorAll('.counter');
    if (!contadores.length || !('IntersectionObserver' in window)) return;

    // Formato argentino: coma para decimales (181,5)
    function formatear(valor, decimales) {
      return valor.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    }

    function animar(el) {
      var objetivo = parseFloat(el.getAttribute('data-target'));
      var decimales = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var duracion = 1800; // milisegundos
      var inicio = null;

      function paso(t) {
        if (!inicio) inicio = t;
        var avance = Math.min((t - inicio) / duracion, 1);
        var suave = 1 - Math.pow(1 - avance, 3);   // empieza rápido y frena al final
        el.textContent = formatear(objetivo * suave, decimales);
        if (avance < 1) requestAnimationFrame(paso);
        else el.textContent = formatear(objetivo, decimales); // asegura el número exacto
      }
      requestAnimationFrame(paso);
    }

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { animar(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0 });
    contadores.forEach(function (c) { obs.observe(c); });

    // Barras de 60% y 31%: crecen desde 0
    if (hayGSAP) {
      document.querySelectorAll('.bar__fill').forEach(function (barra) {
        gsap.from(barra, {
          width: 0, duration: 1.6, ease: 'power3.out',
          scrollTrigger: { trigger: barra, start: 'top 95%', once: true }
        });
      });
    }
  }

  /* ---------------------------------------------------------------
     5. HERO: animación de entrada al abrir la página
     --------------------------------------------------------------- */
  function initHero() {
    if (!hayGSAP) return;
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-anim', { y: 30, opacity: 0, duration: .8, stagger: .1 })
      .from('#heroLogo', { scale: .85, rotate: -8, opacity: 0, duration: 1 }, '-=.8');

    // El logo "flota" suavemente
    gsap.to('#heroLogo', { y: -12, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1 });

    // Las manchas de color se mueven un poco al bajar (parallax)
    gsap.to('.hero__blob--1', { y: 120, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__blob--2', { y: -80, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------------------------------------------------------------
     6. APARICIÓN AL HACER SCROLL (.reveal)
     Los elementos suben y aparecen suavemente cuando entran en pantalla.
     --------------------------------------------------------------- */
  function initReveal() {
    if (!hayGSAP) return; // sin GSAP todo queda visible desde el principio

    gsap.set('.reveal', { opacity: 0, y: 30 });
    ScrollTrigger.batch('.reveal', {
      start: 'top 92%',
      once: true,
      onEnter: function (grupo) {
        // clearProps: al terminar borra los estilos de GSAP para que los efectos :hover del CSS sigan funcionando
        gsap.to(grupo, { opacity: 1, y: 0, duration: .75, stagger: .09, ease: 'power2.out', overwrite: true, clearProps: 'transform,opacity' });
      }
    });

    // Red de seguridad: si por algún motivo algo quedó invisible, a los 6 segundos se muestra.
    setTimeout(function () {
      document.querySelectorAll('.reveal').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && getComputedStyle(el).opacity === '0') {
          gsap.to(el, { opacity: 1, y: 0, duration: .4 });
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------------
     7. LÍNEA DE TIEMPO: la línea roja se "llena" mientras bajás
     --------------------------------------------------------------- */
  function initTimeline() {
    if (!hayGSAP) return;
    // Hay dos líneas de tiempo (Segmentación e Investigación): animamos cada una por separado
    document.querySelectorAll('.timeline').forEach(function (linea) {
      var progreso = linea.querySelector('.timeline__progress');
      if (!progreso) return;
      gsap.fromTo(progreso, { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: linea, start: 'top 70%', end: 'bottom 60%', scrub: true }
      });
    });
  }

  /* ---------------------------------------------------------------
     ARRANQUE: cuando el HTML terminó de cargar, se ejecuta todo.
     --------------------------------------------------------------- */
  function iniciar() {
    if (hayGSAP) gsap.registerPlugin(ScrollTrigger);
    safe(initNav, 'menú');
    safe(initTabs, 'pestañas');
    safe(initAcordeones, 'acordeones');
    safe(initHero, 'hero');
    safe(initReveal, 'aparición al scroll');
    safe(initTimeline, 'línea de tiempo');
    safe(initContadores, 'contadores');

    // Cuando terminan de cargar las imágenes cambia el alto de la página: recalculamos.
    window.addEventListener('load', function () {
      if (hayGSAP) ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
