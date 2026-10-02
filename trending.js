// NVR Space — global trending panel (DESIGN.md §3.3): ranked topics + who to follow
// Rendered into <aside id="trending-panel"> on every page; visible on ≥1600px screens.

(function () {
    const panel = document.getElementById('trending-panel');
    if (!panel) return;

    const TREND_TOPICS = [
        { title: '#BuildInPublic', count: '24.5k posts' },
        { title: 'CSS Nesting', count: '18.2k posts' },
        { title: 'Vanilla JS', count: '16.9k posts' },
        { title: '#100DaysOfCode', count: '14.7k posts' },
        { title: 'Indie Hackers', count: '12.3k posts' },
        { title: 'Design Systems', count: '9.8k posts' },
        { title: 'WebGPU', count: '7.4k posts' },
        { title: 'Open Source', count: '6.1k posts' }
    ];
    const VISIBLE_TOPICS = 6;

    const WHO_TO_FOLLOW = [
        { name: 'Aurora Pixel', handle: '@aurorapixel', avatar: 'img/profile-picture.png' },
        { name: 'Loop & Learn', handle: '@loopandlearn', avatar: 'img/channels4_profile.jpg' },
        { name: 'ByteSized', handle: '@bytesized', avatar: 'img/profile-picture.png' },
        { name: 'The CSS Pod', handle: '@thecsspod', avatar: 'img/channels4_profile.jpg' }
    ];

    let html = '<h2 class="trend-heading">Trending Now</h2><div class="trend-list">';
    TREND_TOPICS.forEach(function (t, i) {
        const extra = i >= VISIBLE_TOPICS ? ' extra' : '';
        html += '<a href="explore.html?q=' + encodeURIComponent(t.title.replace(/^#/, '')) + '" class="trend-item' + extra + '">' +
            '<span class="trend-rank">' + (i + 1) + '</span>' +
            '<span class="trend-text">' +
            '<span class="trend-title">' + t.title + '</span>' +
            '<span class="trend-count">' + t.count + '</span>' +
            '</span></a>';
    });
    html += '</div>' +
        '<button class="trend-more" id="trend-more" aria-expanded="false">Show more</button>' +
        '<div class="side-divider"></div>' +
        '<h2 class="trend-heading">Who to follow</h2><div class="follow-list">';
    WHO_TO_FOLLOW.forEach(function (f) {
        html += '<div class="follow-row">' +
            '<img class="follow-avatar" src="' + f.avatar + '" alt="' + f.name + ' avatar">' +
            '<span class="follow-text">' +
            '<span class="follow-name">' + f.name + '</span>' +
            '<span class="follow-handle">' + f.handle + '</span>' +
            '</span>' +
            '<button class="follow-btn-sm" aria-pressed="false">' +
            '<span class="lbl-follow">Follow</span>' +
            '<span class="lbl-following">Following</span>' +
            '<span class="lbl-unfollow">Unfollow</span>' +
            '</button></div>';
    });
    html += '</div>';
    panel.innerHTML = html;

    const moreBtn = document.getElementById('trend-more');
    moreBtn.addEventListener('click', function () {
        const expanded = panel.classList.toggle('expanded');
        moreBtn.setAttribute('aria-expanded', String(expanded));
        moreBtn.textContent = expanded ? 'Show less' : 'Show more';
    });

    panel.addEventListener('click', function (e) {
        const btn = e.target.closest('.follow-btn-sm');
        if (!btn) return;
        const on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(on));
        btn.classList.toggle('following', on);
        const row = btn.closest('.follow-row');
        const name = row ? row.querySelector('.follow-name') : null;
        if (name && (window.location.protocol !== 'file:')) {
            fetch('/api/subscribe', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel: name.textContent.trim() }),
            }).catch(function () { });
        }
    });
})();
