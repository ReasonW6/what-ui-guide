(function () {
  var preference = "light";
  try {
    var saved = localStorage.getItem("what-ui-theme");
    if (["light", "dark", "system"].includes(saved)) preference = saved;
  } catch { /* Storage may be disabled; the default stays usable. */ }
  var dark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = preference;
})();
