// NVR Space — shorts page: rail like/save, follow, caption expand

function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

const feed = document.querySelector('.shorts-feed');

feed.addEventListener('click', function (e) {
    const like = e.target.closest('.rail-like');
    if (like) {
        const base = parseInt(like.dataset.count, 10);
        const on = like.getAttribute('aria-pressed') !== 'true';
        like.setAttribute('aria-pressed', String(on));
        like.classList.toggle('liked', on);
        like.querySelector('.rail-count').textContent = fmt(base + (on ? 1 : 0));
        if (on) {
            like.classList.remove('pop');
            void like.offsetWidth;
            like.classList.add('pop');
        }
        return;
    }

    const save = e.target.closest('.rail-save');
    if (save) {
        const on = save.getAttribute('aria-pressed') !== 'true';
        save.setAttribute('aria-pressed', String(on));
        save.classList.toggle('saved', on);
        return;
    }

    const follow = e.target.closest('.follow-btn');
    if (follow) {
        const on = follow.getAttribute('aria-pressed') !== 'true';
        follow.setAttribute('aria-pressed', String(on));
        follow.classList.toggle('following', on);
        return;
    }

    const more = e.target.closest('.caption-more');
    if (more) {
        const cap = more.closest('.short-caption');
        cap.classList.toggle('expanded');
        more.textContent = cap.classList.contains('expanded') ? 'less' : 'more';
    }
});

/* only the short you're actually looking at should play */
(function () {
    const vids = Array.from(document.querySelectorAll('.short-stage .short-video'));
    if (!('IntersectionObserver' in window) || !vids.length) return;
    const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            const v = en.target;
            if (en.isIntersecting && en.intersectionRatio >= 0.6) {
                vids.forEach(function (o) { if (o !== v) o.pause(); });
                const p = v.play();
                if (p && p.catch) p.catch(function () { });
            } else {
                v.pause();
            }
        });
    }, { threshold: [0, 0.6, 1] });
    vids.forEach(function (v) { io.observe(v); });
})();

/* §7: "Short swipe — loading: spinner centred" — shown until a short has
   its first frame, then pulled so the video takes over cleanly */
document.querySelectorAll('.short-stage').forEach(function (stage) {
    const vid = stage.querySelector('.short-video');
    if (!vid) return;

    const done = function () {
        const s = stage.querySelector('.short-spinner');
        if (s) s.remove();
    };

    if (vid.readyState >= 2) return;

    const spin = document.createElement('span');
    spin.className = 'short-spinner';
    spin.setAttribute('aria-hidden', 'true');
    stage.appendChild(spin);

    vid.addEventListener('loadeddata', done, { once: true });
    vid.addEventListener('error', done, { once: true });
});
