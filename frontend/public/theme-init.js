(function () {
  var key = 'heatshift.theme'
  var stored = null
  try {
    stored = window.localStorage.getItem(key)
  } catch {
    stored = null
  }
  var theme = stored === 'dark' || stored === 'light' ? stored : null
  if (theme === null) {
    theme =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
  }
  document.documentElement.dataset.theme = theme
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d141c' : '#0f766e')
})()