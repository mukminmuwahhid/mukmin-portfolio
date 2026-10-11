// ============================================
// MUHAMMAD MUKMIN AIDIL — PORTFOLIO
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Preloader ---------- */
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('done'), 350);
  });
  // fallback in case 'load' already fired
  setTimeout(() => preloader.classList.add('done'), 2200);

  /* ---------- Dark / light theme toggle ---------- */
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const root = document.documentElement;

    function applyTheme(theme, announce) {
      root.setAttribute('data-theme', theme);
      themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
      themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
      if (announce) window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);

    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('theme', next); } catch (e) {}
      applyTheme(next, true);
    });

    const mql = window.matchMedia('(prefers-color-scheme: light)');
    mql.addEventListener('change', (e) => {
      let hasSaved = false;
      try { hasSaved = !!localStorage.getItem('theme'); } catch (err) {}
      if (!hasSaved) applyTheme(e.matches ? 'light' : 'dark', true);
    });
  }

  /* ---------- Profile photo fallback ---------- */
  const aboutPhoto = document.querySelector('.about-photo');
  const aboutPhotoImg = aboutPhoto ? aboutPhoto.querySelector('img') : null;
  if (aboutPhotoImg) {
    if (aboutPhotoImg.complete && aboutPhotoImg.naturalWidth === 0) {
      aboutPhoto.classList.add('img-error');
    } else {
      aboutPhotoImg.addEventListener('error', () => aboutPhoto.classList.add('img-error'));
    }
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Custom cursor (desktop / fine pointer only) ---------- */
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cursorDot = document.getElementById('cursorDot');
  const cursorRing = document.getElementById('cursorRing');

  if (isFinePointer && cursorDot && cursorRing) {
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top = mouseY + 'px';
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    const hoverables = document.querySelectorAll('a, button, .project-card, .stat, .pill-group span, .exp-row, .orch-node, .social-btn, .theme-toggle');
    hoverables.forEach(el => {
      el.addEventListener('mouseenter', () => cursorRing.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursorRing.classList.remove('hover'));
    });

    document.addEventListener('mouseleave', () => {
      cursorDot.style.opacity = '0'; cursorRing.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      cursorDot.style.opacity = '1'; cursorRing.style.opacity = '1';
    });
  } else if (cursorDot && cursorRing) {
    cursorDot.style.display = 'none';
    cursorRing.style.display = 'none';
  }

  /* ---------- Mobile nav toggle ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');

  function closeMobileNav() {
    menuToggle.classList.remove('open');
    mobileNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    menuToggle.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));

  /* ---------- Scroll-reveal animations ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));

  /* ---------- Animated stat counters ---------- */
  const statNums = document.querySelectorAll('.stat-num');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-count'), 10) || 0;
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1400;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  statNums.forEach(el => counterObserver.observe(el));

  /* ---------- Active section nav highlighting ---------- */
  const sections = document.querySelectorAll('main .section, .contact');
  const sideLinks = document.querySelectorAll('.side-nav a');
  const mobileLinks = document.querySelectorAll('.mobile-nav a');

  function setActive(id) {
    sideLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    mobileLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { threshold: 0.4, rootMargin: '-80px 0px -40% 0px' });

  sections.forEach(sec => { if (sec.id) sectionObserver.observe(sec); });

  /* ---------- Experience row mini-visualizers (repeatable, works without hover) ---------- */
  const expRows = document.querySelectorAll('.exp-row');
  const expObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    });
  }, { threshold: 0.45 });

  expRows.forEach(row => expObserver.observe(row));


  /* Audit reporting workflow: native buttons support mouse, touch and keyboard. */
  const auditStages = [["Course Configuration", "Audit SIC ? Duplication Form", "Capture course details, item/programme IDs, required LMS reports, completion dates and employee-status filters.", "Translate each course?s reporting requirements into a repeatable tracker configuration."], ["Report Ingestion", "LMS ? Power Automate ? OneDrive", "Schedule Learning History, Programme Status and examination reports as required; organise incoming files in dedicated course folders.", "Consolidate the required inputs before downstream processing begins."], ["Cloud Transformation", "Power BI Dataflows", "Clean, consolidate and filter LMS records in a dedicated course Dataflow using course-specific rules.", "Centralise data preparation separately from the Excel tracker."], ["Refresh Orchestration", "Power Automate ? Microsoft Entra ID", "Once required reports are available, initiate an authenticated Dataflow refresh and coordinate completion before the source-file refresh.", "Manage upstream dependencies so later steps use refreshed data."], ["Source-File Refresh", "Power Automate Desktop ? Excel", "Refresh the Excel source file after the Dataflow completes successfully to retrieve the latest transformed records.", "Keep the course tracker aligned with the cloud-prepared data."], ["SIC Quality Check", "Outlook ? Audit SIC", "Notify the course SIC that refreshed data is ready. The SIC reviews completion records, discrepancies and unexpected results.", "Preserve a human quality-control checkpoint before learner communications."], ["Learner Notification", "Power Automate ? Outlook", "Use the validated tracker for course reminders, deadline extensions or incomplete-course notices, according to course rules.", "Communicate relevant outcomes to staff and partners after review."]];
  const auditButtons = document.querySelectorAll('.audit-stage');
  function selectAuditStage(index) {
    const [title, tools, description, purpose] = auditStages[index];
    auditButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    document.getElementById('audit-selected').textContent = 'Selected stage ' + (index + 1);
    document.getElementById('audit-title').textContent = title;
    document.getElementById('audit-tools').textContent = tools;
    document.getElementById('audit-description').textContent = description;
    document.getElementById('audit-purpose').textContent = purpose;
  }
  auditButtons.forEach((button, index) => {
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') selectAuditStage(index);
    });
    button.addEventListener('click', () => selectAuditStage(index));
    button.addEventListener('focus', () => selectAuditStage(index));
    button.addEventListener('keydown', (event) => {
      const delta = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}[event.key];
      if (delta) {
        event.preventDefault();
        auditButtons[(index + delta + auditButtons.length) % auditButtons.length].focus();
      }
    });
  });

  /* ---------- Interactive architecture diagrams (reused across project cards) ---------- */
  document.querySelectorAll('.orchestration').forEach((orchestration) => {
    const caption = orchestration.querySelector('.orch-caption');
    if (!caption) return;
    const defaultText = caption.getAttribute('data-default');
    const nodes = orchestration.querySelectorAll('.orch-node');
    const links = orchestration.querySelectorAll('.orch-link');
    let activeRole = null;

    function linkMatches(link, role) {
      if (!role) return false;
      const forAttr = link.getAttribute('data-for');
      if (forAttr) return forAttr === role;
      const left = link.getAttribute('data-left');
      const right = link.getAttribute('data-right');
      return left === role || right === role;
    }

    function highlight(role) {
      nodes.forEach(n => n.classList.toggle('active', n.getAttribute('data-role') === role));
      links.forEach(l => l.classList.toggle('lit', linkMatches(l, role)));
      orchestration.classList.toggle('has-active', !!role);
      if (role) {
        const node = orchestration.querySelector(`.orch-node[data-role="${role}"]`);
        caption.textContent = node ? node.getAttribute('data-desc') : defaultText;
      } else {
        caption.textContent = defaultText;
      }
    }

    nodes.forEach(node => {
      const role = node.getAttribute('data-role');
      node.addEventListener('mouseenter', () => highlight(role));
      node.addEventListener('mouseleave', () => { if (activeRole !== role) highlight(activeRole); });
      node.addEventListener('click', () => {
        activeRole = activeRole === role ? null : role;
        highlight(activeRole);
      });
      node.addEventListener('focus', () => highlight(role));
      node.addEventListener('blur', () => highlight(activeRole));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activeRole = activeRole === role ? null : role;
          highlight(activeRole);
        }
      });
    });

    const orchObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => orchestration.classList.toggle('playing', entry.isIntersecting));
    }, { threshold: 0.3 });
    orchObserver.observe(orchestration);
  });

  /* ---------- Smooth anchor scrolling for browsers needing JS assist ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').slice(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
