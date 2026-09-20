const THEME_KEY = 'b4-1-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

const isTheme = (value) => value === DARK_THEME || value === LIGHT_THEME;

export const createThemeController = ({ toggle, systemTheme }) => {
  let current = LIGHT_THEME;

  const readStored = () => {
    try {
      const storedTheme = window.localStorage.getItem(THEME_KEY);
      return isTheme(storedTheme) ? storedTheme : null;
    } catch {
      return null;
    }
  };

  const preferred = () => readStored() ?? (systemTheme.matches ? DARK_THEME : LIGHT_THEME);

  const render = () => {
    const isDark = current === DARK_THEME;
    document.documentElement.dataset.theme = current;
    toggle?.setAttribute('aria-pressed', String(isDark));
    toggle?.setAttribute('aria-label', isDark ? '밝은 테마로 전환' : '어두운 테마로 전환');
  };

  const set = (theme, persist = false) => {
    current = isTheme(theme) ? theme : preferred();
    render();
    if (persist) {
      try {
        window.localStorage.setItem(THEME_KEY, current);
      } catch {
      }
    }
  };

  set(preferred());
  toggle?.addEventListener('click', () => set(current === DARK_THEME ? LIGHT_THEME : DARK_THEME, true));
  systemTheme.addEventListener?.('change', (event) => {
    if (readStored() === null) {
      set(event.matches ? DARK_THEME : LIGHT_THEME);
    }
  });
};
