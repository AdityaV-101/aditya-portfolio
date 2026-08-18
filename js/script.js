(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------------- Loader ---------------- */
  (function loader() {
    const loaderEl = document.getElementById('loader');
    const statusText = document.getElementById('loader-status-text');
    const barFill = document.getElementById('loader-bar-fill');
    const percentEl = document.getElementById('loader-percent');
    const rings = document.querySelectorAll('.ring');

    const phrases = ['Initializing system', 'Compiling components', 'Connecting neurons', 'Ready'];
    let phraseIdx = 0;
    const phraseInterval = setInterval(() => {
      phraseIdx = (phraseIdx + 1) % phrases.length;
      statusText.textContent = phrases[phraseIdx];
    }, 650);

    const duration = reduceMotion ? 300 : 2500;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      barFill.style.width = pct + '%';
      percentEl.textContent = pct + '%';
      if (elapsed < duration) {
        requestAnimationFrame(tick);
      } else {
        statusText.textContent = 'Ready';
        clearInterval(phraseInterval);
        rings.forEach(r => r.classList.add('spin'));
        setTimeout(finish, 350);
      }
    }
    requestAnimationFrame(tick);

    function finish() {
      loaderEl.classList.add('hide');
      document.body.classList.add('loaded');
      setTimeout(() => { loaderEl.style.display = 'none'; }, 750);
    }
  })();

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

  /* ---------------- Loader grid background ---------------- */
  (function loaderGrid() {
    const canvas = document.getElementById('loader-grid');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    }
    function draw() {
      const w = canvas.width, h = canvas.height, gap = 42;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(79,209,255,0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    }
    window.addEventListener('resize', resize);
    resize();
  })();

  /* ---------------- Custom cursor ---------------- */
  if (!isTouch) {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    let dotX = 0, dotY = 0, ringX = 0, ringY = 0;
    window.addEventListener('mousemove', e => {
      dotX = e.clientX; dotY = e.clientY;
      dot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%,-50%)`;
    });
    function raf() {
      ringX += (dotX - ringX) * 0.18;
      ringY += (dotY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    document.querySelectorAll('a, button, .tilt-card').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('active'));
      el.addEventListener('mouseleave', () => ring.classList.remove('active'));
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
    const roles = ['AI systems', 'machine learning models', 'computer vision pipelines'];
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
      const email = 'asodagudi@binghamton.edu';
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
