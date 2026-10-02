// NVR Space — shared PostCard builders (used by home feed, explore hot feed, etc.)

/* ---------- icons (inline SVG, fill: currentColor) ---------- */
const ICONS = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>'
};

function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

/* tolerate spaces in the safely-quoted attribute below */
function attr(s) { return esc(s); }

/* ---------- loading skeletons (DESIGN.md §7: "skeleton shimmer card") ----------
   Pages put static skeleton markup in their feed containers so something
   paints before JS runs; this clears it just before the real cards land. */
function skeletonCardHtml(withMedia) {
    const media = withMedia === false ? '' : '<div class="skeleton skeleton-media"></div>';
    return '<div class="skeleton-card" aria-hidden="true">' +
        media +
        '<div class="skeleton-row">' +
        '<div class="skeleton skeleton-avatar"></div>' +
        '<div class="skeleton-lines">' +
        '<div class="skeleton skeleton-line medium"></div>' +
        '<div class="skeleton skeleton-line short"></div>' +
        '</div></div></div>';
}

function skeletonListHtml(n, withMedia) {
    let out = '';
    for (let i = 0; i < n; i++) out += skeletonCardHtml(withMedia);
    return out;
}

function clearSkeletons(container) {
    if (!container) return;
    container.querySelectorAll('.skeleton-card').forEach(function (el) { el.remove(); });
}

/* ---------- PostCard builders (DESIGN.md §5.1) ---------- */
function metaHtml(p, withTitle) {
    const title = withTitle ? '<h3 class="post-title">' + esc(p.title) + '</h3>' : '';
    return '<div class="meta-row">' +
        '<img class="meta-avatar" src="' + attr(p.avatar || 'img/channels4_profile.jpg') + '" alt="' + attr(p.channel) + ' avatar">' +
        '<div class="meta-text">' + title +
        '<p class="post-meta">' + esc(p.channel) + ' · ' + esc(p.time) + '</p>' +
        '</div></div>';
}

/* muted clips played over a card's thumbnail on hover (§7: "video preview
   autoplays muted"). Rotated so repeated cards don't all show one clip. */
const PREVIEW_CLIPS = ['video/short1.mp4', 'video/short2.mp4', 'video/watch1.mp4'];
let previewIdx = 0;

function mediaHtml(p) {
    if (p.type === 'video') {
        const clip = PREVIEW_CLIPS[previewIdx++ % PREVIEW_CLIPS.length];
        return '<div class="post-media media-video" data-preview="' + clip + '">' +
            '<img src="' + attr(p.media) + '" alt="' + attr(p.title) + '" loading="lazy">' +
            '<span class="duration-badge">' + esc(p.duration || '') + '</span></div>';
    }
    if (p.type === 'short') {
        return '<div class="post-media media-short">' +
            '<span class="shorts-tag">Shorts</span>' +
            '<div class="short-frame"><img src="' + attr(p.media) + '" alt="' + attr(p.title) + '" loading="lazy"></div></div>';
    }
    if (p.type === 'photos') {
        return '<div class="post-media media-photos">' +
            '<img src="' + attr(p.media) + '" alt="' + attr(p.title) + '" loading="lazy">' +
            '<span class="photo-count">1/' + esc(p.count) + '</span></div>';
    }
    return '';
}

function actionsHtml(p) {
    return '<div class="action-bar">' +
        '<button class="act-btn like-btn" data-count="' + p.likes + '" aria-label="Like" aria-pressed="false">' + ICONS.heart + '<span class="act-count">' + fmt(p.likes) + '</span></button>' +
        '<button class="act-btn" aria-label="Comments">' + ICONS.comment + '<span class="act-count">' + fmt(p.comments) + '</span></button>' +
        '<button class="act-btn" aria-label="Share">' + ICONS.share + '<span class="act-count">' + fmt(p.shares) + '</span></button>' +
        '<button class="act-btn save-btn" aria-label="Save" aria-pressed="false">' + ICONS.bookmark + '</button>' +
        '</div>';
}

function cardHtml(p) {
    if (p.type === 'text') {
        return '<article class="post-card post-text"' + (p.id ? ' data-id="' + attr(p.id) + '"' : '') + '>' +
            metaHtml(p, false) +
            '<p class="post-text-body">' + esc(p.title) + '</p>' +
            actionsHtml(p) + '</article>';
    }
    const caption = p.text ? '<p class="post-caption">' + esc(p.text) + '</p>' : '';
    /* video cards open the watch page, shorts open the shorts page (§6 routes) */
    let dest = p.type === 'video' ? 'watch.html' : (p.type === 'short' ? 'shorts.html' : '');
    if (dest && p.id) dest += '?id=' + encodeURIComponent(p.id);
    const navAttr = dest ? ' data-href="' + dest + '"' : '';
    const idAttr = p.id ? ' data-id="' + attr(p.id) + '"' : '';
    return '<div class="post-card post-' + attr(p.type) + '"' + navAttr + idAttr + '>' +
        metaHtml(p, true) + mediaHtml(p) + caption +
        actionsHtml(p) + '</div>';
}

/* ---------- like / save interactions (§7) ---------- */
function toggleLike(btn) {
    const base = parseInt(btn.dataset.count, 10);
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('liked', on);
    btn.querySelector('.act-count').textContent = fmt(base + (on ? 1 : 0));
    if (on) {
        btn.classList.remove('pop');
        void btn.offsetWidth;
        btn.classList.add('pop');
    }
}

/* Delegated like/save handling for any feed container.
   Cards carrying data-href also navigate — but never when a button was hit,
   so like/save still work without nested interactive elements. */
function attachPostActions(container) {
    container.addEventListener('click', function (e) {
        const like = e.target.closest('.like-btn');
        if (like) {
            toggleLike(like);
            const card = like.closest('[data-id]');
            if (card) fetch('/api/videos/' + encodeURIComponent(card.dataset.id) + '/like', { method: 'POST', credentials: 'same-origin' }).catch(function () { });
            return;
        }
        const save = e.target.closest('.save-btn');
        if (save) {
            const on = save.getAttribute('aria-pressed') !== 'true';
            save.setAttribute('aria-pressed', String(on));
            save.classList.toggle('saved', on);
            const card = save.closest('[data-id]');
            if (card) fetch('/api/videos/' + encodeURIComponent(card.dataset.id) + '/save', { method: 'POST', credentials: 'same-origin' }).catch(function () { });
            return;
        }
        if (e.target.closest('button, a')) return;

        const card = e.target.closest('.post-card[data-href]');
        if (card) location.href = card.dataset.href;
    });

    /* keyboard parity: cards that navigate must be reachable without a mouse */
    container.querySelectorAll('.post-card[data-href]').forEach(function (card) {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'link');
        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                location.href = card.dataset.href;
            }
        });

        /* hover preview (§7): swap in a muted looping clip, pull it on leave */
        const media = card.querySelector('.media-video[data-preview]');
        if (!media) return;
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            window.matchMedia('(hover: none)').matches;
        if (calm) return;

        let vid = null;
        card.addEventListener('mouseenter', function () {
            if (vid) return;
            vid = document.createElement('video');
            vid.className = 'preview-video';
            vid.src = media.dataset.preview;
            vid.muted = true;
            vid.loop = true;
            vid.playsInline = true;
            vid.setAttribute('aria-hidden', 'true');
            vid.addEventListener('error', function () { if (vid) { vid.remove(); vid = null; } });
            media.insertBefore(vid, media.firstChild);
            const p = vid.play();
            /* AbortError here just means the browser paused background media;
               the frame still shows, so only a load failure removes the clip */
            if (p && p.catch) p.catch(function () { });
        });
        card.addEventListener('mouseleave', function () {
            if (!vid) return;
            vid.pause();
            vid.removeAttribute('src');
            vid.load();
            vid.remove();
            vid = null;
        });
    });
}
