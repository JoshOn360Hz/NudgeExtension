(function () {
  var navToggle = document.querySelector('[data-menu-toggle]');
  var mobileNav = document.querySelector('[data-mobile-menu]');
  if (navToggle && mobileNav) {
    function closeNav() { mobileNav.hidden = true; navToggle.setAttribute('aria-expanded', 'false'); navToggle.setAttribute('aria-label', 'Open navigation'); }
    function openNav() { mobileNav.hidden = false; navToggle.setAttribute('aria-expanded', 'true'); navToggle.setAttribute('aria-label', 'Close navigation'); }
    navToggle.addEventListener('click', function () { mobileNav.hidden ? openNav() : closeNav(); });
    mobileNav.addEventListener('click', function (event) { if (event.target.closest('a')) closeNav(); });
    document.addEventListener('click', function (event) { if (!mobileNav.hidden && !mobileNav.contains(event.target) && !navToggle.contains(event.target)) closeNav(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !mobileNav.hidden) { closeNav(); navToggle.focus(); } });
  }

  var tablist = document.querySelector('[role="tablist"]');
  if (tablist) {
    var tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    var panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));
    function activateTab(tab, focus) {
      tabs.forEach(function (item) {
        var active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      panels.forEach(function (panel) { panel.hidden = panel.dataset.panel !== tab.dataset.tab; });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab) { tab.addEventListener('click', function () { activateTab(tab, false); }); });
    tablist.addEventListener('keydown', function (event) {
      var current = tabs.indexOf(document.activeElement);
      var next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activateTab(tabs[next], true); }
    });
  }

  document.querySelectorAll('[data-current-year]').forEach(function (node) { node.textContent = new Date().getFullYear(); });
  var header = document.querySelector('[data-header]');
  if (header) window.addEventListener('scroll', function () { header.classList.toggle('is-scrolled', window.scrollY > 10); }, { passive: true });

  var reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveals.forEach(function (node) { node.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (node) { observer.observe(node); });
  }
}());
