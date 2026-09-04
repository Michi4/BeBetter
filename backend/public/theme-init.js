(function () {
  try {
    var saved = localStorage.getItem('theme');
    var light;
    if (saved === 'light') light = true;
    else if (saved === 'dark') light = false;
    else light = window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.classList.toggle('light', light);
    document.documentElement.classList.toggle('dark', !light);
  } catch (e) {}
})();