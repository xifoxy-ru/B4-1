'use strict';

document.documentElement.classList.add('js');

const THEME_KEY = 'b4-1-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';
const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;
const EMAIL_DOMAIN_LABEL_MAX_LENGTH = 63;
const EMAIL_UNSAFE_CHARACTER_PATTERN = /[\s<>"()[\]\\,;:\u0000-\u001f\u007f]/u;
const DOMAIN_LABEL_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;
const DOMAIN_SUFFIX_PATTERN = /^(?:\p{L}{2,}|xn--[a-z0-9-]{2,})$/iu;

const themeToggle = document.querySelector('.theme-toggle');
const menuToggle = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('.primary-nav');
const siteHeader = document.querySelector('.site-header');
const topButton = document.querySelector('.top-button');
const heroDescription = document.querySelector('.hero-description');
const heroDescriptionStatic = document.querySelector('.hero-description-static');
const heroDescriptionTyping = document.querySelector('.hero-description-typing');
const contactForm = document.querySelector('.contact-form');
const formResult = document.querySelector('.form-result');
const projectsSection = document.querySelector('#projects');
const githubStatus = document.querySelector('.github-status');
const repoGrid = document.querySelector('.repo-grid');
const retryButton = document.querySelector('.retry-button');
const repositoryLanguageFilter = document.querySelector('#repository-language-filter');
const messageTextarea = document.querySelector('#contact-message');
const textareaResizeCorner = document.querySelector('.textarea-resize-corner');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const githubUsername = projectsSection?.dataset.githubUsername?.trim() ?? '';
const ALL_LANGUAGES = 'all';
const NO_LANGUAGE = 'none';

const appState = {
  theme: { current: LIGHT_THEME },
  menu: { open: false },
  scroll: { headerActive: false, topVisible: false },
  form: { status: 'idle', errors: {} },
  api: { status: 'idle', repositories: [], message: '', filter: ALL_LANGUAGES },
};

let apiRequestId = 0;
let initialHashTarget = null;
let initialHashCorrectionActive = false;
let hashAlignmentFrame = 0;
let previousScrollRestoration = null;
let typingTimer = 0;

const completeHeroTyping = () => {
  if (!heroDescription || !heroDescriptionStatic || !heroDescriptionTyping) {
    return;
  }
  window.clearTimeout(typingTimer);
  heroDescriptionTyping.textContent = heroDescriptionStatic.textContent;
  heroDescriptionTyping.classList.remove('is-typing');
  heroDescription.dataset.typingState = 'complete';
};

const startHeroTyping = () => {
  if (!heroDescription || !heroDescriptionStatic || !heroDescriptionTyping) {
    return;
  }
  const fullText = heroDescriptionStatic.textContent;
  heroDescription.classList.add('typing-ready');
  if (reducedMotion.matches) {
    completeHeroTyping();
    return;
  }

  const segments = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(fullText)].map(({ segment }) => segment)
    : Array.from(fullText);
  let index = 0;
  heroDescriptionTyping.textContent = '';
  heroDescriptionTyping.classList.add('is-typing');
  heroDescription.dataset.typingState = 'running';

  const typeNextSegment = () => {
    if (reducedMotion.matches) {
      completeHeroTyping();
      return;
    }
    heroDescriptionTyping.textContent += segments[index];
    index += 1;
    if (index >= segments.length) {
      completeHeroTyping();
      return;
    }
    typingTimer = window.setTimeout(typeNextSegment, 28);
  };
  typeNextSegment();
};

const getHashTarget = () => {
  const targetId = window.location.hash.slice(1);
  return targetId ? document.getElementById(targetId) : null;
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
      const headerOffset = (siteHeader?.getBoundingClientRect().height ?? 0) + 16;
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

initialHashTarget = getHashTarget();
initialHashCorrectionActive = Boolean(initialHashTarget);
if (initialHashCorrectionActive) {
  try {
    previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
  } catch {
    previousScrollRestoration = null;
  }
}

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

const isPracticalEmail = (value) => {
  if (value.length > EMAIL_MAX_LENGTH || EMAIL_UNSAFE_CHARACTER_PATTERN.test(value)) {
    return false;
  }

  const parts = value.split('@');
  if (parts.length !== 2) {
    return false;
  }

  const [local, domain] = parts;
  if (!local || !domain || local.length > EMAIL_LOCAL_MAX_LENGTH || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return false;
  }

  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.length < 2 || labels.some((label) => label.length > EMAIL_DOMAIN_LABEL_MAX_LENGTH || !DOMAIN_LABEL_PATTERN.test(label))) {
    return false;
  }

  return DOMAIN_SUFFIX_PATTERN.test(labels.at(-1));
};

const fieldMessage = (name, value) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    const prompts = { name: '이름을', email: '이메일을', message: '메시지를' };
    return `${prompts[name]} 입력해 주세요.`;
  }
  if (name === 'email' && !isPracticalEmail(value)) {
    return '올바른 이메일 형식을 입력해 주세요.';
  }
  return '';
};

const textareaHeightLimits = () => {
  if (!messageTextarea) {
    return { minimum: 0, maximum: 0 };
  }
  const styles = window.getComputedStyle(messageTextarea);
  return {
    minimum: Number.parseFloat(styles.minHeight) || 0,
    maximum: Number.parseFloat(styles.maxHeight) || Number.POSITIVE_INFINITY,
  };
};

const renderTextareaHeight = (requestedHeight) => {
  if (!messageTextarea || !textareaResizeCorner) {
    return;
  }
  const { minimum, maximum } = textareaHeightLimits();
  const height = Math.min(maximum, Math.max(minimum, requestedHeight));
  messageTextarea.style.height = `${height}px`;
  textareaResizeCorner.setAttribute('aria-valuemin', String(Math.round(minimum)));
  textareaResizeCorner.setAttribute('aria-valuemax', String(Math.round(maximum)));
  textareaResizeCorner.setAttribute('aria-valuenow', String(Math.round(height)));
  textareaResizeCorner.setAttribute('aria-valuetext', `메시지 입력창 높이 ${Math.round(height)}픽셀`);
};

let textareaResizeStart = null;

textareaResizeCorner?.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || !messageTextarea) {
    return;
  }
  event.preventDefault();
  textareaResizeCorner.focus({ preventScroll: true });
  textareaResizeStart = { pointerId: event.pointerId, y: event.clientY, height: messageTextarea.getBoundingClientRect().height };
  textareaResizeCorner.setPointerCapture(event.pointerId);
  textareaResizeCorner.classList.add('is-resizing');
});

textareaResizeCorner?.addEventListener('pointermove', (event) => {
  if (!textareaResizeStart || event.pointerId !== textareaResizeStart.pointerId) {
    return;
  }
  renderTextareaHeight(textareaResizeStart.height + event.clientY - textareaResizeStart.y);
});

const finishTextareaResize = (event) => {
  if (!textareaResizeStart || event.pointerId !== textareaResizeStart.pointerId) {
    return;
  }
  if (textareaResizeCorner?.hasPointerCapture(event.pointerId)) {
    textareaResizeCorner.releasePointerCapture(event.pointerId);
  }
  textareaResizeStart = null;
  textareaResizeCorner?.classList.remove('is-resizing');
};

textareaResizeCorner?.addEventListener('pointerup', finishTextareaResize);
textareaResizeCorner?.addEventListener('pointercancel', finishTextareaResize);
textareaResizeCorner?.addEventListener('lostpointercapture', finishTextareaResize);

textareaResizeCorner?.addEventListener('keydown', (event) => {
  if (!messageTextarea) {
    return;
  }
  const step = event.shiftKey ? 48 : 16;
  const { minimum, maximum } = textareaHeightLimits();
  const currentHeight = messageTextarea.getBoundingClientRect().height;
  const requestedHeights = {
    ArrowUp: currentHeight - step,
    ArrowDown: currentHeight + step,
    Home: minimum,
    End: maximum,
  };
  if (!(event.key in requestedHeights)) {
    return;
  }
  event.preventDefault();
  renderTextareaHeight(requestedHeights[event.key]);
});

if (messageTextarea && textareaResizeCorner) {
  renderTextareaHeight(messageTextarea.getBoundingClientRect().height);
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => renderTextareaHeight(messageTextarea.getBoundingClientRect().height)).observe(messageTextarea);
  }
}

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

const repositoryLanguageKey = ({ language }) => {
  const normalizedLanguage = typeof language === 'string' ? language.trim() : '';
  return normalizedLanguage ? `language:${normalizedLanguage}` : NO_LANGUAGE;
};

const repositoryLanguageOptions = (repositories) => {
  const namedLanguages = [...new Set(repositories
    .map(({ language }) => typeof language === 'string' ? language.trim() : '')
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'ko'));
  const options = namedLanguages.map((language) => ({ value: `language:${language}`, label: language }));
  if (repositories.some((repository) => repositoryLanguageKey(repository) === NO_LANGUAGE)) {
    options.push({ value: NO_LANGUAGE, label: '언어 미지정' });
  }
  return [{ value: ALL_LANGUAGES, label: '전체' }, ...options];
};

const renderRepositoryFilter = () => {
  if (!repositoryLanguageFilter) {
    return;
  }
  if (appState.api.status === 'loading' || appState.api.status === 'error') {
    repositoryLanguageFilter.disabled = true;
    return;
  }
  const options = appState.api.status === 'success'
    ? repositoryLanguageOptions(appState.api.repositories)
    : [{ value: ALL_LANGUAGES, label: '전체' }];
  if (!options.some(({ value }) => value === appState.api.filter)) {
    appState.api.filter = ALL_LANGUAGES;
  }
  repositoryLanguageFilter.replaceChildren(...options.map(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }));
  repositoryLanguageFilter.value = appState.api.filter;
  repositoryLanguageFilter.disabled = appState.api.status !== 'success';
};

const renderRepositories = () => {
  if (!githubStatus || !repoGrid || !retryButton) {
    return;
  }

  repoGrid.replaceChildren();
  retryButton.hidden = appState.api.status !== 'error';
  renderRepositoryFilter();

  const statusMessages = {
    idle: 'GitHub 계정 정보가 아직 준비되지 않았습니다. 설정 후 공개 저장소가 이곳에 표시됩니다.',
    loading: '공개 저장소를 불러오는 중입니다…',
    empty: '표시할 공개 저장소가 없습니다.',
    error: `공개 저장소를 불러오지 못했습니다. ${appState.api.message}`,
    success: `최근 업데이트 순으로 공개 저장소 ${appState.api.repositories.length}개를 표시합니다. 최대 100개까지 요청합니다.`,
  };
  githubStatus.textContent = statusMessages[appState.api.status];

  if (appState.api.status === 'success') {
    const filteredRepositories = appState.api.filter === ALL_LANGUAGES
      ? appState.api.repositories
      : appState.api.repositories.filter((repository) => repositoryLanguageKey(repository) === appState.api.filter);
    if (filteredRepositories.length === 0) {
      githubStatus.textContent = '선택한 언어에 해당하는 저장소가 없습니다.';
      return;
    }
    if (appState.api.filter !== ALL_LANGUAGES) {
      githubStatus.textContent = `공개 저장소 ${appState.api.repositories.length}개 중 ${filteredRepositories.length}개를 표시합니다.`;
    }
    const cards = filteredRepositories.map(createRepositoryCard);
    repoGrid.append(...cards);
  }
};

const loadRepositories = async () => {
  if (!githubUsername) {
    appState.api = { status: 'idle', repositories: [], message: '', filter: ALL_LANGUAGES };
    renderRepositories();
    alignInitialHashTarget(true);
    return;
  }

  const requestId = ++apiRequestId;
  appState.api = { status: 'loading', repositories: [], message: '', filter: appState.api.filter };
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
      ? { status: 'empty', repositories: [], message: '', filter: ALL_LANGUAGES }
      : { status: 'success', repositories: payload.slice(0, 100), message: '', filter: appState.api.filter };
  } catch (error) {
    if (requestId !== apiRequestId) {
      return;
    }
    appState.api = {
      status: 'error',
      repositories: [],
      message: error instanceof Error ? error.message : '네트워크 오류',
      filter: appState.api.filter,
    };
  }
  renderRepositories();
  alignInitialHashTarget(true);
};

setTheme(preferredTheme());
startHeroTyping();
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

reducedMotion.addEventListener?.('change', (event) => {
  if (event.matches) {
    completeHeroTyping();
  }
});

menuToggle?.addEventListener('click', () => setMenuOpen(!appState.menu.open));

document.addEventListener('click', (event) => {
  if (appState.menu.open && siteHeader && event.target instanceof Node && !siteHeader.contains(event.target)) {
    setMenuOpen(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
    cancelInitialHashCorrection();
  }
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
      cancelInitialHashCorrection();
      setMenuOpen(false);
      scrollToTarget(target);
      history.replaceState(null, '', targetId);
    }
  });
});

window.addEventListener('scroll', updateScrollState, { passive: true });
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
repositoryLanguageFilter?.addEventListener('change', () => {
  appState.api.filter = repositoryLanguageFilter.value;
  renderRepositories();
});
if (initialHashCorrectionActive) {
  alignInitialHashTarget();
  window.addEventListener('load', () => alignInitialHashTarget(), { once: true });
}
loadRepositories();
