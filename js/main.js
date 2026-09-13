'use strict';

const THEME_KEY = 'b4-1-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';
const themeToggle = document.querySelector('.theme-toggle');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

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

const updateThemeControl = (theme) => {
  if (!themeToggle) {
    return;
  }

  const isDark = theme === DARK_THEME;
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', isDark ? '밝은 테마로 전환' : '어두운 테마로 전환');
};

const applyTheme = (theme) => {
  const safeTheme = isTheme(theme) ? theme : preferredTheme();
  document.documentElement.dataset.theme = safeTheme;
  updateThemeControl(safeTheme);
};

const storeTheme = (theme) => {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
  }
};

applyTheme(preferredTheme());

themeToggle?.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
  applyTheme(nextTheme);
  storeTheme(nextTheme);
});

systemTheme.addEventListener('change', (event) => {
  if (readStoredTheme() === null) {
    applyTheme(event.matches ? DARK_THEME : LIGHT_THEME);
  }
});
