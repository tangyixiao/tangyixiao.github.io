(() => {
  const root = document.documentElement;
  const button = document.querySelector('.theme-toggle');
  if (!button) return;
  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    button.textContent = theme === 'dark' ? '☼' : '☾';
    button.setAttribute('aria-label', theme === 'dark' ? '切换到浅色模式' : '切换到深色模式');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080b10' : '#f5f5f0');
  };
  try {
    const theme = localStorage.getItem('site-theme');
    if (theme === 'light' || theme === 'dark') applyTheme(theme);
  } catch { /* Reading remains available when browser storage is blocked. */ }
  button.hidden = false;
  button.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem('site-theme', theme); } catch { /* Preference is optional. */ }
  });
})();
