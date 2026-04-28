(() => {
  // =========================================================
  //  NAV
  // =========================================================
  const nav    = document.getElementById('nav');
  const toggle = nav.querySelector('.nav__toggle');
  const menu   = document.getElementById('navmenu');

  const isMobile = () => window.matchMedia('(max-width: 960px)').matches;

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Nav — sticky scrolled state
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // =========================================================
  //  BOAT — plovi tačno po putanji reke; nos uvek u smeru skrola
  // =========================================================
  const boat     = document.querySelector('.boat');
  const riverDiv = document.querySelector('.river');
  const riverPath= document.getElementById('riverPath');

  if (boat && riverDiv && riverPath && typeof riverPath.getTotalLength === 'function') {
    // viewBox reke: 0 0 60 1000 (preserveAspectRatio="none")
    const VB_W = 60, VB_H = 1000;
    const totalLen = riverPath.getTotalLength();

    let lastY = window.scrollY;
    let dir = 1; // 1 = dole, -1 = gore

    const sample = (t) => {
      // t u [0,1] po dužini putanje
      const len = totalLen * Math.max(0, Math.min(1, t));
      return riverPath.getPointAtLength(len);
    };

    const updateBoat = () => {
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ratio = Math.max(0, Math.min(1, y / max));

      // pravac sa hysteresis-om
      const delta = y - lastY;
      if (Math.abs(delta) > 2) {
        dir = delta > 0 ? 1 : -1;
        lastY = y;
      }

      // tačka na putanji + tangenta (dva uzorka po dužini)
      const eps = 0.002;
      const tA = Math.max(0, Math.min(1, ratio - eps));
      const tB = Math.max(0, Math.min(1, ratio + eps));
      const pMid = sample(ratio);
      const pA   = sample(tA);
      const pB   = sample(tB);

      // skala iz viewBox-a u DOM (preserveAspectRatio="none")
      const rw = riverDiv.clientWidth;
      const rh = riverDiv.clientHeight;
      const sx = rw / VB_W;
      const sy = rh / VB_H;

      // centar brodića u DOM koordinatama unutar .river (fixed box)
      const cx = pMid.x * sx;
      const cy = pMid.y * sy;

      // tangenta u DOM prostoru
      let dx = (pB.x - pA.x) * sx;
      let dy = (pB.y - pA.y) * sy;
      if (dir < 0) { dx = -dx; dy = -dy; } // skrol nagore → tangenta obrnuta

      // ugao: nos brodića je „dole" u prirodnoj orijentaciji (0deg)
      //       Da nos gleda u (dx,dy): rotate = atan2(dy,dx) - 90°
      const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI - 90;

      boat.style.left = cx + 'px';
      boat.style.top  = cy + 'px';
      boat.style.setProperty('--r', angleDeg.toFixed(2) + 'deg');
    };

    updateBoat();
    window.addEventListener('scroll', updateBoat, { passive: true });
    window.addEventListener('resize', updateBoat);
  }

  // =========================================================
  //  DROPDOWN — stabilna state-mašina (fix: ne zabaguje)
  // =========================================================
  const dropdowns = Array.from(document.querySelectorAll('.has-dropdown'));

  const setDropdownOpen = (dd, open) => {
    dd.classList.toggle('is-open', !!open);
    const trig = dd.querySelector('.has-dropdown__trigger');
    if (trig) trig.setAttribute('aria-expanded', open ? 'true' : 'false');
    // JS safety net: force correct styles on mobile so no CSS specificity can break it
    if (isMobile()) {
      const dropEl = dd.querySelector('.dropdown');
      if (dropEl) {
        dropEl.style.setProperty('position', 'static', 'important');
        dropEl.style.setProperty('transform', 'none', 'important');
        dropEl.style.setProperty('left', 'auto', 'important');
        dropEl.style.setProperty('top', 'auto', 'important');
        dropEl.style.setProperty('width', '100%', 'important');
        dropEl.style.setProperty('min-width', '0', 'important');
      }
    }
  };

  const closeAllDropdowns = (except = null) => {
    dropdowns.forEach(dd => {
      if (dd !== except) setDropdownOpen(dd, false);
    });
  };

  dropdowns.forEach(dd => {
    const trigger = dd.querySelector('.has-dropdown__trigger');
    let closeTimer = null;

    const clearClose = () => {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    };
    const scheduleClose = () => {
      clearClose();
      closeTimer = setTimeout(() => setDropdownOpen(dd, false), 160);
    };

    // Hover (desktop) — otvori odmah, zatvori sa malim delay-em
    dd.addEventListener('mouseenter', () => {
      if (isMobile()) return;
      clearClose();
      closeAllDropdowns(dd);
      setDropdownOpen(dd, true);
    });
    dd.addEventListener('mouseleave', () => {
      if (isMobile()) return;
      scheduleClose();
    });

    // Klik na trigger
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (isMobile()) {
        const willOpen = !dd.classList.contains('is-open');
        closeAllDropdowns(dd);
        setDropdownOpen(dd, willOpen);
        return;
      }
      // Desktop: klik — skroluj na sekciju (data-href) i zatvori dropdown
      const href = trigger.getAttribute('data-href');
      setDropdownOpen(dd, false);
      if (href) {
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // ESC zatvara
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setDropdownOpen(dd, false);
    });
  });

  // Klik van bilo kog dropdown-a zatvara sve
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.has-dropdown')) closeAllDropdowns();
  });

  // Promena veličine — resetuj stanje (sprečava zaglavljivanje)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      closeAllDropdowns();
      if (!isMobile()) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    }, 120);
  });

  // Zatvori mobile meni pri kliku na običan link (ne trigger)
  menu.addEventListener('click', (e) => {
    const t = e.target.closest('a');
    if (!t) return;
    if (isMobile()) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      closeAllDropdowns();
    }
  });

  // =========================================================
  //  CUSTOM CURSOR
  // =========================================================
  const cursor = document.querySelector('.cursor');
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  if (cursor && hasFinePointer) {
    const ring = cursor.querySelector('.cursor__ring');
    const dot  = cursor.querySelector('.cursor__dot');

    let mx = 0, my = 0;
    let rx = 0, ry = 0;
    let rafId = null;

    const render = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ring) ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      if (dot)  dot.style.transform  = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!cursor.classList.contains('is-active')) cursor.classList.add('is-active');
      if (rafId == null) rafId = requestAnimationFrame(render);
    }, { passive: true });

    document.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
    document.addEventListener('mouseenter', () => cursor.classList.add('is-active'));

    const hoverSel = 'a, button, [role="button"], [data-lightbox-item], .album, .lang__btn, .lb__nav, .lb__close, input, textarea, select, label';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverSel)) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverSel)) cursor.classList.remove('is-hover');
    });
  }

  // =========================================================
  //  REVEAL on scroll
  // =========================================================
  const revealTargets = document.querySelectorAll(
    '.section__head, .about, .entry, .race, .medals-together, .hero__title, .hero__lead, .hero__cta, .hero__ornament, .hero__deco'
  );
  revealTargets.forEach(el => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-in'));
  }

  // =========================================================
  //  YEAR
  // =========================================================
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // =========================================================
  //  I18N
  // =========================================================
  const I18N = window.I18N || {};
  const SUPPORTED = ['sr', 'en', 'it'];
  const STORAGE_KEY = 'site-lang';

  const getInitialLang = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
    const nav2 = (navigator.language || 'sr').slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav2) ? nav2 : 'sr';
  };

  const applyLang = (lang) => {
    if (!SUPPORTED.includes(lang)) lang = 'sr';
    const dict = I18N[lang] || {};
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = dict[key];
      if (val == null) return;
      const attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });

    if (dict['meta.title']) document.title = dict['meta.title'];

    document.querySelectorAll('.lang__btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.lang === lang);
    });

    localStorage.setItem(STORAGE_KEY, lang);
  };

  document.querySelectorAll('.lang__btn').forEach(btn => {
    btn.addEventListener('click', () => applyLang(btn.dataset.lang));
  });

  applyLang(getInitialLang());
  document.documentElement.classList.add('i18n-ready');

  // =========================================================
  //  LIGHTBOX  (slike + video)
  // =========================================================
  const lb        = document.getElementById('lb');
  const lbImg     = lb.querySelector('.lb__img');
  const lbVideo   = lb.querySelector('.lb__video');
  const lbCap     = lb.querySelector('.lb__caption');
  const lbPrev    = lb.querySelector('.lb__nav--prev');
  const lbNext    = lb.querySelector('.lb__nav--next');
  const lbClose   = lb.querySelector('.lb__close');
  const lbCounter = lb.querySelector('.lb__counter');

  let currentList = [];   // [{type, src, alt, caption}]
  let currentIndex = 0;

  const buildItemFromFigure = (fig) => {
    const type = fig.getAttribute('data-type') || 'image';
    if (type === 'video') {
      const src = fig.getAttribute('data-src')
               || fig.querySelector('source')?.getAttribute('src')?.replace(/#.*$/, '')
               || '';
      const cap = fig.querySelector('figcaption');
      return { type: 'video', src, alt: '', caption: cap ? cap.textContent.trim() : '' };
    }
    const img = fig.querySelector('img');
    const cap = fig.querySelector('figcaption');
    return {
      type: 'image',
      src: img ? img.getAttribute('src') : fig.getAttribute('href') || '',
      alt: img ? (img.getAttribute('alt') || '') : '',
      caption: cap ? cap.textContent.trim() : ''
    };
  };

  const buildItemFromSource = (a) => ({
    type: 'image',
    src: a.getAttribute('href'),
    alt: '',
    caption: a.textContent.trim()
  });

  const collectGalleryItems = (galleryKey) => {
    const figs = document.querySelectorAll(`[data-lightbox-item][data-gallery="${galleryKey}"]`);
    return Array.from(figs).map(buildItemFromFigure);
  };

  const collectAlbumItems = (albumKey) => {
    const src = document.querySelector(`[data-album-src="${albumKey}"]`);
    if (!src) return [];
    return Array.from(src.querySelectorAll('a')).map(buildItemFromSource);
  };

  const stopLbVideo = () => {
    if (!lbVideo) return;
    try { lbVideo.pause(); } catch(_) {}
    lbVideo.removeAttribute('src');
    lbVideo.load?.();
  };

  const openLightbox = (items, index = 0) => {
    if (!items.length) return;
    currentList = items;
    currentIndex = index;
    render();
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-open');
  };

  const closeLightbox = () => {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-open');
    if (lbImg) lbImg.src = '';
    stopLbVideo();
  };

  const render = () => {
    const it = currentList[currentIndex];
    if (!it) return;

    stopLbVideo();

    if (it.type === 'video') {
      if (lbImg)   { lbImg.hidden = true; lbImg.src = ''; }
      if (lbVideo) {
        lbVideo.hidden = false;
        lbVideo.src = it.src;
        lbVideo.controls = true;
        lbVideo.setAttribute('playsinline', '');
        const p = lbVideo.play?.();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } else {
      if (lbVideo) lbVideo.hidden = true;
      if (lbImg) {
        lbImg.hidden = false;
        lbImg.src = it.src;
        lbImg.alt = it.alt || '';
      }
    }

    lbCap.textContent = it.caption || '';

    if (currentList.length > 1) {
      lbPrev.hidden = false;
      lbNext.hidden = false;
      lbCounter.hidden = false;
      lbCounter.textContent = `${currentIndex + 1} / ${currentList.length}`;
    } else {
      lbPrev.hidden = true;
      lbNext.hidden = true;
      lbCounter.hidden = true;
    }
  };

  const prev = () => {
    currentIndex = (currentIndex - 1 + currentList.length) % currentList.length;
    render();
  };
  const next = () => {
    currentIndex = (currentIndex + 1) % currentList.length;
    render();
  };

  lbPrev.addEventListener('click', prev);
  lbNext.addEventListener('click', next);
  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft')  prev();
    else if (e.key === 'ArrowRight') next();
  });

  // Touch swipe
  let touchStartX = 0;
  lb.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) (dx > 0 ? prev() : next());
  }, { passive: true });

  // Binding — klik na pojedinačnu stavku (slika ili video)
  document.querySelectorAll('[data-lightbox-item]').forEach(fig => {
    fig.addEventListener('click', (e) => {
      e.preventDefault();
      const galleryKey = fig.getAttribute('data-gallery');
      const items = collectGalleryItems(galleryKey);

      const type = fig.getAttribute('data-type') || 'image';
      let currentSrc;
      if (type === 'video') {
        currentSrc = fig.getAttribute('data-src')
                  || fig.querySelector('source')?.getAttribute('src')?.replace(/#.*$/, '');
      } else {
        currentSrc = fig.querySelector('img')?.getAttribute('src');
      }
      const idx = items.findIndex(it => it.src === currentSrc);
      openLightbox(items, Math.max(idx, 0));
    });
    fig.style.cursor = 'zoom-in';
  });

  // Binding — klik na album
  document.querySelectorAll('.album[data-album]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-album');
      const items = collectAlbumItems(key);
      openLightbox(items, 0);
    });
  });

  // Postavi count na album-ima iz HTML-a
  document.querySelectorAll('[data-album-count]').forEach(el => {
    const key = el.getAttribute('data-album-count');
    const items = collectAlbumItems(key);
    if (items.length) el.textContent = items.length;
  });
})();
