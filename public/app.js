(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  // Photos are served through /api/photo so only signed-in viewers can load them.
  const photoUrl = (id, size = 'md') =>
    window.__PHOTOS ? window.__PHOTOS[id] : `/api/photo?id=${encodeURIComponent(id)}&size=${size}`;


  let photos = [];   // ordered list from the server; also the slideshow order

  // =======================================================================
  // Rendering
  // =======================================================================
  function photoButton(photo, index, { wide = false, sizes, eager = false } = {}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'photo' + (wide ? ' is-wide' : '');
    btn.dataset.photo = photo.id;
    btn.dataset.index = String(index);
    btn.setAttribute('aria-haspopup', 'dialog');

    const img = document.createElement('img');
    img.alt = photo.alt;
    img.width = 1600;
    img.height = 1067;
    img.decoding = 'async';
    img.loading = eager ? 'eager' : 'lazy';
    if (eager) img.fetchPriority = 'high';
    img.sizes = sizes;
    img.src = photoUrl(photo.id, 'md');
    const reveal = () => img.classList.add('is-loaded');
    if (img.complete && img.naturalWidth) reveal();
    else img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });

    btn.append(img);
    btn.addEventListener('click', () => slideshow.open(index, btn));
    return btn;
  }

  function renderGroup(container, group) {
    const items = photos.map((p, i) => ({ p, i })).filter(({ p }) => p.group === group);
    const halfSizes = '(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw';
    const wideSizes = '(max-width: 900px) 100vw, 66vw';
    // Rhythm: one wide photo, then pairs; a lone photo at the end runs wide.
    items.forEach(({ p, i }, n) => {
      const isLastOdd = n === items.length - 1 && (items.length - 1) % 2 === 1;
      const wide = n === 0 || isLastOdd;
      const btn = photoButton(p, i, { wide, sizes: wide ? wideSizes : halfSizes });
      if (group === 'floorplan') btn.classList.add('photo--plan');
      container.append(btn);
    });
  }

  function render(data) {
    photos = data.photos;
    const { copy, headings } = data;
    const text = (id, value) => { $(id).textContent = value; };

    text('#viewer-name', data.viewer.name);
    text('#property-name', data.property.name);
    text('#topbar-mark', data.property.name);
    text('#footer-mark', data.property.footer || data.property.name);
    const address = $('#property-address');
    address.textContent = data.property.address || '';
    address.hidden = !data.property.address;

    const agent = data.agent;
    $('#agent').hidden = !agent;
    if (agent) {
      text('#agent-label', agent.label);
      text('#agent-name', agent.name);
      const phone = $('#agent-phone');
      phone.textContent = agent.phone;
      phone.href = `tel:${agent.tel}`;
    }
    text('#copy-title', copy.title);
    text('#copy-intro', copy.intro);
    text('#copy-interiors', copy.interiors);
    text('#copy-outdoors', copy.outdoors);
    text('#copy-closing', copy.closing);
    text('#copy-more', copy.more || '');
    $('#copy-more').hidden = !copy.more;
    text('#h-interiors', headings.interiors);
    text('#h-outdoors', headings.outdoors);
    text('#h-features', headings.features);
    text('#h-more', headings.more);
    text('#h-location', headings.location);
    text('#h-floorplan', headings.floorplan || 'Floor plan');

    // Sections with nothing to show are left out
    const hasGroup = (g) => photos.some((p) => p.group === g);
    $('#section-more').hidden = !copy.more && !hasGroup('more');
    $('#section-floorplan').hidden = !data.floorplanPdf && !hasGroup('floorplan');

    const pdf = $('#floorplan-pdf');
    pdf.hidden = !data.floorplanPdf;
    if (data.floorplanPdf) { pdf.href = data.floorplanPdf; pdf.download = `${data.property.name}-floor-plan.pdf`; }

    const disclaimer = $('#disclaimer');
    disclaimer.textContent = data.disclaimer || '';
    $('#disclaimer-wrap').hidden = !data.disclaimer;

    const stats = $('#copy-stats');
    stats.replaceChildren(...copy.stats.map((s) => Object.assign(document.createElement('li'), { textContent: s })));
    const features = $('#copy-features');
    features.replaceChildren(...copy.features.map((f) => Object.assign(document.createElement('li'), { textContent: f })));

    // Decorative backdrop behind the features list (not tracked as a photo view)
    const backdrop = $('#features-backdrop');
    if (data.featuresBackdrop) backdrop.src = photoUrl(data.featuresBackdrop, 'md');
    else backdrop.hidden = true;

    const heroIndex = photos.findIndex((p) => p.group === 'hero');
    const hero = $('#hero');
    hero.querySelector('.photo')?.remove(); // keep the wordmark overlay, replace only the photo
    if (heroIndex >= 0) hero.prepend(photoButton(photos[heroIndex], heroIndex, { sizes: '100vw', eager: true }));

    for (const el of $$('[data-group]')) {
      el.replaceChildren();
      renderGroup(el, el.dataset.group);
    }
  }

  // =======================================================================
  // Full-screen slideshow
  // =======================================================================
  const slideshow = (() => {
    const box = $('#lightbox');
    const img = $('#lb-img');
    const caption = $('#lb-caption');
    const count = $('#lb-count');
    let index = 0;
    let opener = null;
    let fullTimer = null;

    const isOpen = () => !box.hidden;

    function show(i) {
      index = (i + photos.length) % photos.length;
      const p = photos[index];

      img.classList.add('is-switching');
      img.alt = p.alt;
      img.src = photoUrl(p.id, 'md'); // usually already cached from the gallery
      img.onload = () => img.classList.remove('is-switching');
      caption.textContent = p.title;
      count.textContent = `${index + 1} of ${photos.length}`;

      // Load the full-resolution file once a photo has been on screen briefly,
      // so quickly flicking through doesn't download every large file.
      clearTimeout(fullTimer);
      fullTimer = setTimeout(() => {
        const hi = new Image();
        hi.onload = () => { if (photos[index].id === p.id) img.src = hi.src; };
        hi.src = photoUrl(p.id, 'full');
      }, 400);
    }

    function open(i, trigger) {
      opener = trigger || document.activeElement;
      box.hidden = false;
      document.body.classList.add('no-scroll');
      requestAnimationFrame(() => box.classList.add('is-open'));
      show(i);
      $('#lb-close').focus();
    }

    function close() {
      if (!isOpen()) return;
      clearTimeout(fullTimer);
      box.classList.remove('is-open');
      box.hidden = true;
      document.body.classList.remove('no-scroll');
      img.removeAttribute('src');
      opener?.focus?.();
    }

    const next = () => show(index + 1);
    const prev = () => show(index - 1);

    $('#lb-close').addEventListener('click', close);
    $('#lb-next').addEventListener('click', next);
    $('#lb-prev').addEventListener('click', prev);
    $('#lb-stage').addEventListener('click', (e) => { if (e.target.id === 'lb-stage') close(); });

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'Tab') {
        // keep focus inside the dialog
        const focusables = $$('button', box);
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Touch swipe
    let touchX = null, touchY = null;
    box.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { touchX = null; return; }
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      touchX = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) close(); // swipe down to close
    }, { passive: true });

    return { open, close };
  })();

  // =======================================================================
  // Sign-in / session
  // =======================================================================
  function showLogin(message = '') {
    slideshow.close();
    $('#site').hidden = true;
    $('#login').hidden = false;
    $('#login-error').textContent = message;
    document.body.classList.remove('is-booting');
    $('#first-name').focus();
  }

  function showSite(data) {
    render(data);
    $('#login').hidden = true;
    $('#site').hidden = false;
    document.body.classList.remove('is-booting');
    window.scrollTo(0, 0);
  }

  async function loadContent() {
    const res = await fetch('/api/content', { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`Content request failed (${res.status})`);
    return res.json();
  }

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = { firstName: $('#first-name'), lastName: $('#last-name'), passcode: $('#passcode') };
    const errEl = $('#login-error');
    const submit = $('#login-submit');
    const hasLetter = (v) => /\p{L}/u.test(v);
    Object.values(fields).forEach((f) => f.removeAttribute('aria-invalid'));
    const fail = (field, message) => {
      errEl.textContent = message;
      fields[field].setAttribute('aria-invalid', 'true');
      fields[field].focus();
    };

    const firstName = fields.firstName.value.trim();
    const lastName = fields.lastName.value.trim();
    if (!hasLetter(firstName)) return fail('firstName', 'Enter your first name.');
    if (!hasLetter(lastName)) return fail('lastName', 'Enter your last name.');
    if (!fields.passcode.value) return fail('passcode', 'Enter the passcode.');

    submit.disabled = true;
    submit.textContent = 'Signing in…';
    errEl.textContent = '';
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ firstName, lastName, passcode: fields.passcode.value }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        fail(fields[result.field] ? result.field : 'passcode', result.error || 'Sign-in failed. Try again.');
        if (result.field === 'passcode') fields.passcode.select();
        return;
      }
      fields.passcode.value = '';
      const data = await loadContent();
      if (!data) throw new Error('Signed in, but the session cookie was not kept. Check that cookies are allowed.');
      showSite(data);
    } catch (err) {
      errEl.textContent = err.message || 'Could not reach the server. Check your connection and try again.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'View the home';
    }
  });

  for (const btn of $$('[data-signout]')) {
    btn.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
      $('#first-name').value = '';
      $('#last-name').value = '';
      showLogin('');
    });
  }

  // Boot
  loadContent()
    .then((data) => (data ? showSite(data) : showLogin()))
    .catch(() => showLogin('Could not reach the server. Refresh the page to try again.'));
})();
