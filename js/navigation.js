import { HASH_HEADER_GAP, HEADER_SCROLL_THRESHOLD, REVEAL_THRESHOLD, TOP_BUTTON_SCROLL_THRESHOLD } from './config.js';

export const createNavigationController = ({ header, menuToggle, primaryNav, footer, topButton, reducedMotion }) => {
  const state = { menuOpen: false, headerActive: false, topVisible: false };
  const topButtonGap = topButton ? Number.parseFloat(window.getComputedStyle(topButton).bottom) || 16 : 16;
  let initialHashTarget = null;
  let initialHashCorrectionActive = false;
  let hashAlignmentFrame = 0;
  let previousScrollRestoration = null;

  const renderMenu = () => {
    primaryNav?.setAttribute('data-open', String(state.menuOpen));
    menuToggle?.setAttribute('aria-expanded', String(state.menuOpen));
    menuToggle?.setAttribute('aria-label', state.menuOpen ? '메뉴 닫기' : '메뉴 열기');
  };
  const setMenuOpen = (open) => {
    state.menuOpen = Boolean(open);
    renderMenu();
  };
  const updateTopButtonPosition = () => {
    if (!topButton || !footer) {
      return;
    }
    const footerTop = footer.getBoundingClientRect().top;
    const requiredBottom = window.innerHeight - footerTop + topButtonGap;
    const maximumBottom = Math.max(topButtonGap, window.innerHeight - topButton.offsetHeight - topButtonGap);
    topButton.style.bottom = `${Math.min(Math.max(topButtonGap, requiredBottom), maximumBottom)}px`;
  };
  const updateScrollState = () => {
    state.headerActive = window.scrollY > HEADER_SCROLL_THRESHOLD;
    state.topVisible = window.scrollY > TOP_BUTTON_SCROLL_THRESHOLD;
    header?.classList.toggle('is-scrolled', state.headerActive);
    if (topButton) {
      topButton.hidden = !state.topVisible;
      updateTopButtonPosition();
    }
  };
  const cancelInitialHashCorrection = () => {
    initialHashCorrectionActive = false;
    window.cancelAnimationFrame(hashAlignmentFrame);
    if (previousScrollRestoration) {
      window.history.scrollRestoration = previousScrollRestoration;
      previousScrollRestoration = null;
    }
  };
  const layoutTop = (element) => {
    let top = 0;
    let current = element;
    while (current) {
      top += current.offsetTop;
      current = current.offsetParent;
    }
    return top;
  };
  const alignInitialHashTarget = (complete = false) => {
    if (!initialHashCorrectionActive || !initialHashTarget) {
      return;
    }
    initialHashTarget.classList.add('is-visible');
    window.cancelAnimationFrame(hashAlignmentFrame);
    hashAlignmentFrame = window.requestAnimationFrame(() => {
      hashAlignmentFrame = window.requestAnimationFrame(() => {
        if (!initialHashCorrectionActive || !initialHashTarget) {
          return;
        }
        const headerOffset = (header?.getBoundingClientRect().height ?? 0) + HASH_HEADER_GAP;
        const targetTop = layoutTop(initialHashTarget) - headerOffset;
        const previousInlineBehavior = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
        document.documentElement.style.scrollBehavior = previousInlineBehavior;
        updateScrollState();
        if (complete) {
          cancelInitialHashCorrection();
        }
      });
    });
  };

  const targetId = window.location.hash.slice(1);
  initialHashTarget = targetId ? document.getElementById(targetId) : null;
  initialHashCorrectionActive = Boolean(initialHashTarget);
  if (initialHashCorrectionActive) {
    try {
      previousScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
    } catch {
      previousScrollRestoration = null;
    }
  }

  renderMenu();
  updateScrollState();
  menuToggle?.addEventListener('click', () => setMenuOpen(!state.menuOpen));
  document.addEventListener('click', (event) => {
    if (state.menuOpen && header && event.target instanceof Node && !header.contains(event.target)) {
      setMenuOpen(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      cancelInitialHashCorrection();
    }
    if (event.key === 'Escape' && state.menuOpen) {
      setMenuOpen(false);
      menuToggle?.focus();
    }
  });
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      const target = hash ? document.querySelector(hash) : null;
      if (target) {
        event.preventDefault();
        cancelInitialHashCorrection();
        setMenuOpen(false);
        target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', hash);
      }
    });
  });
  window.addEventListener('scroll', updateScrollState, { passive: true });
  window.addEventListener('resize', updateScrollState);
  window.addEventListener('wheel', cancelInitialHashCorrection, { passive: true, once: true });
  window.addEventListener('touchstart', cancelInitialHashCorrection, { passive: true, once: true });
  window.addEventListener('pointerdown', cancelInitialHashCorrection, { passive: true, once: true });
  topButton?.addEventListener('click', () => {
    cancelInitialHashCorrection();
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal-target').forEach((section) => section.classList.add('is-visible'));
  } else {
    const sectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: REVEAL_THRESHOLD });
    document.querySelectorAll('.reveal-target').forEach((section) => sectionObserver.observe(section));
  }
  if (initialHashCorrectionActive) {
    alignInitialHashTarget();
    window.addEventListener('load', () => alignInitialHashTarget(), { once: true });
  }
  return { completeInitialHashCorrection: () => alignInitialHashTarget(true) };
};
