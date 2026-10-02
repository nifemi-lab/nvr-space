// NVR Space — app shell behavior (menu button, drawer)
const menuBtn = document.getElementById('menu-btn');
const overlay = document.getElementById('drawer-overlay');

if (menuBtn) {
    menuBtn.addEventListener('click', function () {
        if (window.innerWidth >= 1200) {
            document.body.classList.toggle('sidebar-collapsed');
        } else {
            document.body.classList.toggle('drawer-open');
        }
    });
}

if (overlay) {
    overlay.addEventListener('click', function () {
        document.body.classList.remove('drawer-open');
    });
}

/* ===== search: every header gets a real search that routes to Explore ===== */
(function () {
    var inputs = document.querySelectorAll('.header-search .search-input');
    inputs.forEach(function (input) {
        function go() {
            var q = input.value.trim();
            location.href = q ? 'explore.html?q=' + encodeURIComponent(q) : 'explore.html';
        }
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
        var btn = input.parentElement.querySelector('.search-btn');
        if (btn) btn.addEventListener('click', go);
    });
})();

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.body.classList.remove('drawer-open');
    }
});

/* ===== theme toggle (dark <-> light, persisted) ===== */
(function () {
    var root = document.documentElement;
    var btn = document.getElementById('theme-btn');
    if (!btn) return;

    function syncLabel() {
        var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        btn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
        btn.setAttribute('title', 'Switch to ' + next + ' theme');
    }

    syncLabel();
    btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) { }
        syncLabel();
    });
})();
