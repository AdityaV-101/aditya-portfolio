(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------------- Ambient particle-network background ---------------- */
  (function bgCanvas() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let w, h, particles;
    const mouse = { x: null, y: null };

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = reduceMotion ? 0 : Math.min(90, Math.floor((w * h) / 18000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    }

    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('resize', resize);
    resize();

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (mouse.x != null) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140) {
            p.x -= dx / dist * 0.15;
            p.y -= dy / dist * 0.15;
          }
        }
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      }
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = 'rgba(79,209,255,0.5)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(139,92,246,${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  })();

  /* ---------------- Custom cursor: rocket with exhaust fumes ---------------- */
  if (!isTouch) {
    const rocket = document.getElementById('cursor-rocket');
    const fumeCanvas = document.getElementById('rocket-fumes');
    const fctx = fumeCanvas.getContext('2d');
    const ROCKET_LEN = 31;
    let mx = -100, my = -100, px = -100, py = -100, angle = 0, targetAngle = 0, seen = false;
    const puffs = [];

    function sizeFumes() {
      fumeCanvas.width = window.innerWidth;
      fumeCanvas.height = window.innerHeight;
    }
    sizeFumes();
    window.addEventListener('resize', sizeFumes);

    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!seen) { px = mx; py = my; seen = true; }
    });

    function spawn(x, y, dirX, dirY, speed) {
      const n = Math.min(4, 1 + Math.floor(speed / 8));
      for (let i = 0; i < n; i++) {
        const spread = 0.7;
        const vx = -dirX * (0.6 + Math.random() * 1.2) + (Math.random() - 0.5) * spread;
        const vy = -dirY * (0.6 + Math.random() * 1.2) + (Math.random() - 0.5) * spread;
        puffs.push({
          x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4,
          vx, vy, r: 2 + Math.random() * 3, life: 0, max: 28 + Math.random() * 20
        });
      }
    }

    /* ---- Asteroids ---- */
    const asteroids = [];
    const blasts = [];
    const shockwaves = [];
    const asteroidCount = window.innerWidth < 900 ? 3 : 4;
    let dead = false, respawnAt = 0, invulnUntil = 0;

    function makeAsteroid(avoidX, avoidY) {
      const r = 16 + Math.random() * 14;
      let x, y, tries = 0;
      do {
        x = 60 + Math.random() * (window.innerWidth - 120);
        y = 90 + Math.random() * (window.innerHeight - 160);
        tries++;
      } while (tries < 20 && Math.hypot(x - avoidX, y - avoidY) < 220);
      const a = Math.random() * Math.PI * 2;
      const v = 0.3 + Math.random() * 0.5;
      const n = 9 + Math.floor(Math.random() * 4);
      const shape = [];
      for (let i = 0; i < n; i++) shape.push(0.74 + Math.random() * 0.4);
      const craters = [];
      for (let i = 0; i < 3; i++) {
        const ca = Math.random() * Math.PI * 2, cd = Math.random() * 0.5;
        craters.push({ x: Math.cos(ca) * cd, y: Math.sin(ca) * cd, r: 0.12 + Math.random() * 0.14 });
      }
      return { x, y, r, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6.28,
               spin: (Math.random() - 0.5) * 0.02, shape, craters };
    }
    for (let i = 0; i < asteroidCount; i++) asteroids.push(makeAsteroid(-999, -999));

    function explodeRocket(now, cx, cy) {
      dead = true;
      respawnAt = now + 1400;
      rocket.style.opacity = '0';
      rocket.classList.remove('blink');
      const fire = reduceMotion ? 18 : 60;
      for (let i = 0; i < fire; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 7;
        blasts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          r: 2 + Math.random() * 4, life: 0, max: 24 + Math.random() * 24, kind: 'fire' });
      }
      for (let i = 0; i < (reduceMotion ? 6 : 18); i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 5;
        blasts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          r: 1.5 + Math.random() * 2, life: 0, max: 40 + Math.random() * 25,
          kind: 'debris', col: ['255,255,255', '255,95,196', '79,209,255', '139,92,246'][i % 4] });
      }
      for (let i = 0; i < (reduceMotion ? 4 : 12); i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 0.4 + Math.random() * 1.8;
        blasts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.3,
          r: 6 + Math.random() * 6, life: 0, max: 45 + Math.random() * 25, kind: 'smoke' });
      }
      shockwaves.push({ x: cx, y: cy, life: 0, max: 28 });
    }

    function drawAsteroid(s) {
      const n = s.shape.length;
      fctx.save();
      fctx.translate(s.x, s.y);
      fctx.rotate(s.rot);
      fctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = s.r * s.shape[i];
        const px2 = Math.cos(a) * rr, py2 = Math.sin(a) * rr;
        if (i === 0) fctx.moveTo(px2, py2); else fctx.lineTo(px2, py2);
      }
      fctx.closePath();
      const g = fctx.createRadialGradient(-s.r * 0.35, -s.r * 0.4, s.r * 0.1, 0, 0, s.r * 1.1);
      g.addColorStop(0, '#8a8f9e');
      g.addColorStop(1, '#2b2f3d');
      fctx.fillStyle = g;
      fctx.fill();
      fctx.strokeStyle = 'rgba(200,210,235,0.25)';
      fctx.lineWidth = 1.2;
      fctx.stroke();
      fctx.fillStyle = 'rgba(15,18,30,0.45)';
      for (const c of s.craters) {
        fctx.beginPath(); fctx.arc(c.x * s.r, c.y * s.r, c.r * s.r, 0, Math.PI * 2); fctx.fill();
      }
      fctx.restore();
    }

    function raf() {
      const dx = mx - px, dy = my - py;
      const speed = Math.hypot(dx, dy);
      if (speed > 1.5) {
        targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
      }
      let diff = targetAngle - angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      angle += diff * 0.22;
      rocket.style.transform = `translate(${mx - 12}px, ${my}px) rotate(${angle}rad)`;

      if (!dead && !reduceMotion && speed > 1.5) {
        const hx = Math.sin(angle), hy = -Math.cos(angle);
        spawn(mx - hx * (ROCKET_LEN + 4), my - hy * (ROCKET_LEN + 4), hx, hy, speed);
      }
      px = mx; py = my;

      fctx.clearRect(0, 0, fumeCanvas.width, fumeCanvas.height);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life++;
        if (p.life >= p.max) { puffs.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
        const t = p.life / p.max;
        const radius = p.r * (1 + t * 2.2);
        const alpha = (1 - t) * 0.55;
        const g = Math.round(210 - t * 110);
        const b = Math.round(90 + t * 90);
        const rch = Math.round(255 - t * 80);
        fctx.beginPath();
        fctx.fillStyle = `rgba(${rch},${g},${b},${alpha})`;
        fctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        fctx.fill();
      }

      // asteroids: move, hit test against the rocket, draw
      const now = performance.now();
      const hx2 = Math.sin(angle), hy2 = -Math.cos(angle);
      if (dead && now >= respawnAt) {
        dead = false;
        invulnUntil = now + 1600;
        rocket.style.opacity = '';
        rocket.classList.add('blink');
        setTimeout(() => rocket.classList.remove('blink'), 1600);
      }
      for (const s of asteroids) {
        s.x += s.vx; s.y += s.vy; s.rot += s.spin;
        const m = s.r + 20;
        if (s.x < -m) s.x = window.innerWidth + m; else if (s.x > window.innerWidth + m) s.x = -m;
        if (s.y < -m) s.y = window.innerHeight + m; else if (s.y > window.innerHeight + m) s.y = -m;
        if (!dead && seen && now >= invulnUntil) {
          const hitR = s.r * 0.85 + 6;
          const bx = mx - hx2 * 15, by = my - hy2 * 15;
          if (Math.hypot(mx - s.x, my - s.y) < hitR || Math.hypot(bx - s.x, by - s.y) < hitR) {
            explodeRocket(now, bx, by);
          }
        }
        drawAsteroid(s);
      }

      // explosion particles and shockwaves
      fctx.save();
      for (let i = blasts.length - 1; i >= 0; i--) {
        const p = blasts[i];
        p.life++;
        if (p.life >= p.max) { blasts.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.93; p.vy *= 0.93;
        const t = p.life / p.max;
        fctx.globalCompositeOperation = p.kind === 'fire' ? 'lighter' : 'source-over';
        fctx.beginPath();
        if (p.kind === 'smoke') {
          fctx.fillStyle = `rgba(90,96,115,${(1 - t) * 0.35})`;
          fctx.arc(p.x, p.y, p.r * (1 + t * 2), 0, Math.PI * 2);
        } else if (p.kind === 'debris') {
          fctx.fillStyle = `rgba(${p.col},${1 - t})`;
          fctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        } else {
          fctx.fillStyle = `rgba(255,${Math.round(200 - t * 140)},${Math.round(70 - t * 50)},${(1 - t) * 0.9})`;
          fctx.arc(p.x, p.y, p.r * (1 - t * 0.5), 0, Math.PI * 2);
        }
        fctx.fill();
      }
      fctx.globalCompositeOperation = 'source-over';
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        s.life++;
        if (s.life >= s.max) { shockwaves.splice(i, 1); continue; }
        const t = s.life / s.max;
        fctx.strokeStyle = `rgba(255,210,63,${(1 - t) * 0.8})`;
        fctx.lineWidth = 3 * (1 - t) + 1;
        fctx.beginPath(); fctx.arc(s.x, s.y, 10 + t * 80, 0, Math.PI * 2); fctx.stroke();
      }
      fctx.restore();
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    document.querySelectorAll('a, button, .tilt-card').forEach(el => {
      el.addEventListener('mouseenter', () => rocket.classList.add('active'));
      el.addEventListener('mouseleave', () => rocket.classList.remove('active'));
    });
  }

  /* ---------------- Magnetic buttons ---------------- */
  if (!isTouch && !reduceMotion) {
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------- Tilt cards ---------------- */
  if (!isTouch && !reduceMotion) {
    document.querySelectorAll('.tilt-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y / rect.height) - 0.5) * -8;
        const rotateY = ((x / rect.width) - 0.5) * 8;
        card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
        card.style.setProperty('--gx', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--gy', `${(y / rect.height) * 100}%`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(700px) rotateX(0) rotateY(0)';
      });
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  (function scrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (reduceMotion) { els.forEach(el => el.classList.add('in-view')); return; }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('in-view'), i * 60);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => observer.observe(el));
  })();

  /* ---------------- Hero role-cycling text ---------------- */
  (function heroCycle() {
    const el = document.getElementById('hero-cycle');
    const roles = ['AI systems', 'machine learning systems that ship', 'computer vision pipelines'];
    if (reduceMotion) { el.textContent = roles[0]; return; }
    let roleIdx = 0, charIdx = 0, deleting = false;

    function tick() {
      const current = roles[roleIdx];
      if (!deleting) {
        charIdx++;
        el.textContent = current.slice(0, charIdx);
        if (charIdx === current.length) {
          deleting = true;
          setTimeout(tick, 1600);
          return;
        }
      } else {
        charIdx--;
        el.textContent = current.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          roleIdx = (roleIdx + 1) % roles.length;
        }
      }
      setTimeout(tick, deleting ? 35 : 65);
    }
    tick();
  })();

  /* ---------------- Scroll progress bar ---------------- */
  (function scrollProgress() {
    const bar = document.getElementById('scroll-progress');
    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  /* ---------------- Sticky nav + active section ---------------- */
  (function nav() {
    const navEl = document.getElementById('nav');
    const links = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('main section[id]');

    function onScroll() {
      navEl.classList.toggle('scrolled', window.scrollY > 20);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.toggle('active', l.dataset.section === entry.target.id));
        }
      });
    }, { threshold: 0.4, rootMargin: '-80px 0px -50% 0px' });
    sections.forEach(s => observer.observe(s));
  })();

  /* ---------------- Mobile hamburger menu ---------------- */
  (function mobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('mobile-menu');
    hamburger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  })();

  /* ---------------- Contact: copy email + toast ---------------- */
  (function contact() {
    const emailCard = document.getElementById('email-card');
    const toast = document.getElementById('toast');
    let toastTimer;
    emailCard.addEventListener('click', async () => {
      const email = 'aditya.sodagudi@gmail.com';
      try {
        await navigator.clipboard.writeText(email);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = email;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    });
  })();

  /* ---------------- Back to top ---------------- */
  (function backToTop() {
    document.getElementById('back-to-top').addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  })();

})();
