'use strict';

document.documentElement.classList.add('js');

const THEME_KEY = 'b4-1-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const themeToggle = document.querySelector('.theme-toggle');
const menuToggle = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('.primary-nav');
const siteHeader = document.querySelector('.site-header');
const topButton = document.querySelector('.top-button');
const contactForm = document.querySelector('.contact-form');
const formResult = document.querySelector('.form-result');
const projectsSection = document.querySelector('#projects');
const githubStatus = document.querySelector('.github-status');
const repoGrid = document.querySelector('.repo-grid');
const retryButton = document.querySelector('.retry-button');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const githubUsername = projectsSection?.dataset.githubUsername?.trim() ?? '';

const appState = {
  theme: { current: LIGHT_THEME },
  menu: { open: false },
  scroll: { headerActive: false, topVisible: false },
  form: { status: 'idle', errors: {} },
  api: { status: 'idle', repositories: [], message: '' },
};

let apiRequestId = 0;

const isTheme = (value) => value === DARK_THEME || value === LIGHT_THEME;

const readStoredTheme = () => {
  try {
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
};

const preferredTheme = () => readStoredTheme() ?? (systemTheme.matches ? DARK_THEME : LIGHT_THEME);

const renderTheme = () => {
  const isDark = appState.theme.current === DARK_THEME;
  document.documentElement.dataset.theme = appState.theme.current;
  themeToggle?.setAttribute('aria-pressed', String(isDark));
  themeToggle?.setAttribute('aria-label', isDark ? '밝은 테마로 전환' : '어두운 테마로 전환');
};

const setTheme = (theme, persist = false) => {
  appState.theme.current = isTheme(theme) ? theme : preferredTheme();
  renderTheme();

  if (persist) {
    try {
      window.localStorage.setItem(THEME_KEY, appState.theme.current);
    } catch {
    }
  }
};

const renderMenu = () => {
  primaryNav?.setAttribute('data-open', String(appState.menu.open));
  menuToggle?.setAttribute('aria-expanded', String(appState.menu.open));
  menuToggle?.setAttribute('aria-label', appState.menu.open ? '메뉴 닫기' : '메뉴 열기');
};

const setMenuOpen = (open) => {
  appState.menu.open = Boolean(open);
  renderMenu();
};

const renderScrollState = () => {
  siteHeader?.classList.toggle('is-scrolled', appState.scroll.headerActive);
  if (topButton) {
    topButton.hidden = !appState.scroll.topVisible;
  }
};

const updateScrollState = () => {
  appState.scroll.headerActive = window.scrollY > 60;
  appState.scroll.topVisible = window.scrollY > 300;
  renderScrollState();
};

const scrollToTarget = (target) => {
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
};

const fieldMessage = (name, value) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    const prompts = { name: '이름을', email: '이메일을', message: '메시지를' };
    return `${prompts[name]} 입력해 주세요.`;
  }
  if (name === 'email' && !EMAIL_PATTERN.test(trimmedValue)) {
    return '올바른 이메일 형식을 입력해 주세요.';
  }
  return '';
};

const validateForm = () => {
  if (!contactForm) {
    return {};
  }

  return ['name', 'email', 'message'].reduce((errors, name) => {
    const field = contactForm.elements.namedItem(name);
    const message = field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
      ? fieldMessage(name, field.value)
      : '입력 항목을 확인해 주세요.';
    if (message) {
      errors[name] = message;
    }
    return errors;
  }, {});
};

const renderForm = () => {
  if (!contactForm || !formResult) {
    return;
  }

  ['name', 'email', 'message'].forEach((name) => {
    const field = contactForm.elements.namedItem(name);
    const error = contactForm.querySelector(`[data-error-for="${name}"]`);
    const message = appState.form.errors[name] ?? '';
    field?.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) {
      error.textContent = message;
    }
  });

  const messages = {
    idle: '',
    error: '입력 내용을 확인해 주세요.',
    success: '로컬 데모 확인이 완료되었습니다. 메시지는 전송되거나 저장되지 않았습니다.',
  };
  formResult.textContent = messages[appState.form.status];
};

const safeRepositoryUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : null;
  } catch {
    return null;
  }
};

const createRepositoryCard = (repository) => {
  const { name, description, html_url: repositoryUrl, language } = repository;
  const article = document.createElement('article');
  const title = document.createElement('h4');
  const summary = document.createElement('p');
  const meta = document.createElement('p');
  const safeUrl = safeRepositoryUrl(repositoryUrl);

  article.className = 'repo-card';
  title.textContent = typeof name === 'string' && name.trim() ? name : '이름 없는 저장소';
  summary.textContent = typeof description === 'string' && description.trim() ? description : '설명이 없습니다.';
  meta.className = 'repo-meta';
  meta.textContent = `주요 언어: ${typeof language === 'string' && language.trim() ? language : '미지정'}`;
  article.append(title, summary, meta);

  if (safeUrl) {
    const link = document.createElement('a');
    link.href = safeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'GitHub에서 보기';
    article.append(link);
  }

  return article;
};

const renderRepositories = () => {
  if (!githubStatus || !repoGrid || !retryButton) {
    return;
  }

  repoGrid.replaceChildren();
  retryButton.hidden = appState.api.status !== 'error';

  const statusMessages = {
    idle: 'GitHub 계정 정보가 아직 준비되지 않았습니다. 설정 후 공개 저장소가 이곳에 표시됩니다.',
    loading: '공개 저장소를 불러오는 중입니다…',
    empty: '표시할 공개 저장소가 없습니다.',
    error: `공개 저장소를 불러오지 못했습니다. ${appState.api.message}`,
    success: `최근 업데이트 순으로 공개 저장소 ${appState.api.repositories.length}개를 표시합니다. 최대 100개까지 요청합니다.`,
  };
  githubStatus.textContent = statusMessages[appState.api.status];

  if (appState.api.status === 'success') {
    const cards = appState.api.repositories.map(createRepositoryCard);
    repoGrid.append(...cards);
  }
};

const loadRepositories = async () => {
  if (!githubUsername) {
    appState.api = { status: 'idle', repositories: [], message: '' };
    renderRepositories();
    return;
  }

  const requestId = ++apiRequestId;
  appState.api = { status: 'loading', repositories: [], message: '' };
  renderRepositories();

  try {
    const endpoint = `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?sort=updated&per_page=100`;
    const response = await fetch(endpoint, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error('응답 형식 오류');
    }
    if (requestId !== apiRequestId) {
      return;
    }

    appState.api = payload.length === 0
      ? { status: 'empty', repositories: [], message: '' }
      : { status: 'success', repositories: payload.slice(0, 100), message: '' };
  } catch (error) {
    if (requestId !== apiRequestId) {
      return;
    }
    appState.api = {
      status: 'error',
      repositories: [],
      message: error instanceof Error ? error.message : '네트워크 오류',
    };
  }
  renderRepositories();
};

setTheme(preferredTheme());
renderMenu();
updateScrollState();
renderForm();
renderRepositories();

themeToggle?.addEventListener('click', () => {
  setTheme(appState.theme.current === DARK_THEME ? LIGHT_THEME : DARK_THEME, true);
});

systemTheme.addEventListener?.('change', (event) => {
  if (readStoredTheme() === null) {
    setTheme(event.matches ? DARK_THEME : LIGHT_THEME);
  }
});

menuToggle?.addEventListener('click', () => setMenuOpen(!appState.menu.open));

document.addEventListener('click', (event) => {
  if (appState.menu.open && siteHeader && event.target instanceof Node && !siteHeader.contains(event.target)) {
    setMenuOpen(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && appState.menu.open) {
    setMenuOpen(false);
    menuToggle?.focus();
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const targetId = link.getAttribute('href');
    const target = targetId ? document.querySelector(targetId) : null;
    if (target) {
      event.preventDefault();
      setMenuOpen(false);
      scrollToTarget(target);
      history.replaceState(null, '', targetId);
    }
  });
});

window.addEventListener('scroll', updateScrollState, { passive: true });
topButton?.addEventListener('click', () => {
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
  }, { threshold: 0.2 });
  document.querySelectorAll('.reveal-target').forEach((section) => sectionObserver.observe(section));
}

contactForm?.addEventListener('input', (event) => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || !field.name) {
    return;
  }
  const { [field.name]: ignoredError, ...remainingErrors } = appState.form.errors;
  appState.form.errors = remainingErrors;
  appState.form.status = 'idle';
  renderForm();
});

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  appState.form.errors = validateForm();
  appState.form.status = Object.keys(appState.form.errors).length === 0 ? 'success' : 'error';
  renderForm();

  if (appState.form.status === 'error') {
    const firstInvalidName = Object.keys(appState.form.errors)[0];
    contactForm.elements.namedItem(firstInvalidName)?.focus();
  } else {
    contactForm.reset();
  }
});

retryButton?.addEventListener('click', loadRepositories);
loadRepositories();
