// NVR Space — watch page: VideoInfo actions, description, comments, UpNext rail
// DESIGN.md §5.6 (VideoInfo), §5.7 (CommentSection), §4 (UpNextRail)

/* ---------- resolve which video this page is showing ---------- */
const VIDEO_ID = new URLSearchParams(location.search).get('id') || '';
function api(path, method, body) {
    return fetch('/api' + path, {
        method: method || 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
    }).then(function (r) { return r.json().then(function (j) { return { status: r.status, ok: r.ok, json: j }; }); })
      .catch(function () { return { status: 0, ok: false, json: {} }; });
}

/* hydrate the player + info from the catalog; fall back to the baked-in page */
if (VIDEO_ID) {
    api('/videos/' + encodeURIComponent(VIDEO_ID), 'GET').then(function (r) {
        if (!r.ok || !r.json.video) return;
        const v = r.json.video;
        document.title = v.title + ' · NVR Space';
        const tt = document.getElementById('watch-title'); if (tt) tt.textContent = v.title;
        const vid = document.getElementById('watch-video');
        if (vid && v.video) {
            vid.setAttribute('poster', v.media || '');
            vid.innerHTML = '<source src="' + v.video + '" type="video/mp4">Your browser does not support the video tag.';
            vid.load();
        }
        const name = document.querySelector('.watch-info .channel-name'); if (name && v.channel) name.textContent = v.channel;
        const av = document.querySelector('.watch-info .channel-avatar'); if (av && v.avatar) av.src = v.avatar;
        const desc = document.getElementById('desc-text');
        if (desc && v.text) desc.textContent = v.text;
        if (typeof v.likes === 'number') {
            likeCount.textContent = fmt(v.likes);
            LIKE_BASE = v.likes;
        }
        if (v.likedByMe) setRating('like');
        const saveLabel = document.querySelector('#save-btn span');
        if (v.savedByMe && saveLabel) {
            saveBtn.setAttribute('aria-pressed', 'true');
            saveBtn.classList.add('on');
            saveLabel.textContent = 'Saved';
        }
        if (v.subscribedToChannel) {
            subscribeBtn.setAttribute('aria-pressed', 'true');
            subscribeBtn.classList.add('subscribed');
        }
    });
}

/* ---------- VideoInfo: subscribe (§5.6: gradient when not subscribed → --surface-2) ---------- */
const subscribeBtn = document.getElementById('subscribe-btn');
subscribeBtn.addEventListener('click', function () {
    const on = subscribeBtn.getAttribute('aria-pressed') !== 'true';
    subscribeBtn.setAttribute('aria-pressed', String(on));
    subscribeBtn.classList.toggle('subscribed', on);
    const name = document.querySelector('.watch-info .channel-name');
    if (name) fetch('/api/subscribe', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: name.textContent.trim() }),
    }).catch(function () { });
});

/* ---------- like / dislike segmented pill (§5.6) ---------- */
const likeBtn = document.getElementById('like-btn');
const dislikeBtn = document.getElementById('dislike-btn');
const likeCount = document.getElementById('like-count');
let LIKE_BASE = 12400;

function setRating(state) {
    // state: 'like' | 'dislike' | null
    const liked = state === 'like';
    const disliked = state === 'dislike';

    likeBtn.setAttribute('aria-pressed', String(liked));
    likeBtn.classList.toggle('on', liked);
    likeCount.textContent = fmt(LIKE_BASE + (liked ? 1 : 0));

    dislikeBtn.setAttribute('aria-pressed', String(disliked));
    dislikeBtn.classList.toggle('on', disliked);

    if (liked) {
        likeBtn.classList.remove('pop');
        void likeBtn.offsetWidth;
        likeBtn.classList.add('pop');
    }
}

likeBtn.addEventListener('click', function () {
    setRating(likeBtn.getAttribute('aria-pressed') === 'true' ? null : 'like');
    if (VIDEO_ID) fetch('/api/videos/' + encodeURIComponent(VIDEO_ID) + '/like', { method: 'POST', credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && typeof j.likes === 'number') { LIKE_BASE = j.likes; likeCount.textContent = fmt(j.likes); } })
        .catch(function () { });
});
dislikeBtn.addEventListener('click', function () {
    setRating(dislikeBtn.getAttribute('aria-pressed') === 'true' ? null : 'dislike');
});

/* ---------- share (§7: toast) ---------- */
const shareBtn = document.getElementById('share-btn');
shareBtn.addEventListener('click', function () {
    const label = shareBtn.querySelector('span');
    const original = label.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href).catch(function () { /* ignore */ });
    }
    label.textContent = 'Link copied';
    shareBtn.classList.add('flash');
    setTimeout(function () {
        label.textContent = original;
        shareBtn.classList.remove('flash');
    }, 1600);
});

/* ---------- save toggle (§7: bookmark fills --text) ---------- */
const saveBtn = document.getElementById('save-btn');
saveBtn.addEventListener('click', function () {
    const on = saveBtn.getAttribute('aria-pressed') !== 'true';
    saveBtn.setAttribute('aria-pressed', String(on));
    saveBtn.classList.toggle('on', on);
    saveBtn.querySelector('span').textContent = on ? 'Saved' : 'Save';
    if (VIDEO_ID) fetch('/api/videos/' + encodeURIComponent(VIDEO_ID) + '/save', { method: 'POST', credentials: 'same-origin' }).catch(function () { });
});

/* ---------- description collapse (§5.6: collapsed 2 lines) ---------- */
const descText = document.getElementById('desc-text');
const descMore = document.getElementById('desc-more');
descMore.addEventListener('click', function () {
    const open = descText.classList.toggle('expanded');
    descMore.textContent = open ? 'less' : 'more';
    descMore.setAttribute('aria-expanded', String(open));
});

/* ---------- comments (§5.7) ---------- */
const COMMENTS = [
    { name: 'Aurora Pixel', handle: '@aurorapixel', avatar: 'img/profile-picture.png', time: '1d', text: 'The bit where you rebuild the layout live instead of hiding the mistakes is why I keep coming back. Genuinely useful.', likes: 1820, replies: 24, top: 1, age: 1 },
    { name: 'ByteSized', handle: '@bytesized', avatar: 'img/channels4_profile.jpg', time: '1d', text: '03:45 the grid explanation finally made CSS grid click for me. Watched it three times.', likes: 940, replies: 11, top: 2, age: 2 },
    { name: 'Loop & Learn', handle: '@loopandlearn', avatar: 'img/profile-picture.png', time: '22h', text: 'No framework, no build step, and it still scores 98. People overcomplicate this stuff.', likes: 610, replies: 8, top: 3, age: 3 },
    { name: 'The CSS Pod', handle: '@thecsspod', avatar: 'img/channels4_profile.jpg', time: '16h', text: 'Sending this to every person who asks me how to start. No fluff, straight to the work.', likes: 388, replies: 5, top: 4, age: 4 },
    { name: 'Dev Tips', handle: '@devtips', avatar: 'img/channels4_profile.jpg', time: '9h', text: 'The design tokens section at 04:10 is the part most tutorials skip. That is the whole trick.', likes: 205, replies: 3, top: 5, age: 5 },
    { name: 'pixelwaves', handle: '@pixelwaves', avatar: 'img/profile-picture.png', time: '3h', text: 'First! Also — can you do a follow-up on the deploy setup?', likes: 42, replies: 1, top: 6, age: 6 }
];

const commentList = document.getElementById('comment-list');
const commentCount = document.getElementById('comment-count');
let commentSort = 'top';

function escText(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

function commentHtml(c) {
    return '<article class="comment">' +
        '<img class="comment-avatar" src="' + escText(c.avatar || 'img/channels4_profile.jpg') + '" alt="' + escText(c.name) + ' avatar">' +
        '<div class="comment-body">' +
        '<p class="comment-meta"><strong>' + escText(c.handle || ('@' + String(c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ''))) + '</strong> <span class="comment-time">' + escText(c.time || '') + '</span></p>' +
        '<p class="comment-text">' + escText(c.text) + '</p>' +
        '<div class="comment-actions">' +
        '<button class="comment-act comment-like" data-count="' + c.likes + '" aria-label="Like comment" aria-pressed="false">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>' +
        '<span>' + fmt(c.likes) + '</span></button>' +
        '<button class="comment-act">Reply</button>' +
        '<button class="comment-act comment-act-icon" aria-label="More">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/></svg></button>' +
        (c.replies ? '<button class="comment-replies">' + c.replies + ' replies</button>' : '') +
        '</div></div></article>';
}

function renderComments() {
    const sorted = COMMENTS.slice().sort(function (a, b) {
        return commentSort === 'top' ? (a.top != null ? a.top : 1e9) - (b.top != null ? b.top : 1e9) || (b.ts - a.ts) : a.age - b.age;
    });
    commentList.innerHTML = sorted.map(commentHtml).join('');
    commentCount.textContent = COMMENTS.length + (COMMENTS.length === 1 ? ' Comment' : ' Comments');
}
renderComments();

/* load the real comment thread for this video, if any */
function loadComments() {
    if (!VIDEO_ID) return;
    fetch('/api/videos/' + encodeURIComponent(VIDEO_ID) + '/comments', { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
            if (!j || !Array.isArray(j.comments)) return;
            COMMENTS.length = 0;
            j.comments.forEach(function (c, i) {
                COMMENTS.push({
                    name: c.name, handle: c.handle, avatar: c.avatar, text: c.text, likes: c.likes || 0,
                    ts: c.ts, top: i + 1, age: i + 1, time: 'recent', replies: 0,
                });
            });
            commentSort = 'new';
            document.querySelectorAll('.sort-chip').forEach(function (c) {
                const on = c.dataset.sort === 'new';
                c.classList.toggle('active', on);
                c.setAttribute('aria-selected', String(on));
            });
            renderComments();
        })
        .catch(function () { });
}
if (VIDEO_ID) loadComments();

document.querySelector('.comment-sort').addEventListener('click', function (e) {
    const chip = e.target.closest('.sort-chip');
    if (!chip) return;
    this.querySelectorAll('.sort-chip').forEach(function (c) {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
    });
    chip.classList.add('active');
    chip.setAttribute('aria-selected', 'true');
    commentSort = chip.dataset.sort;
    renderComments();
});

/* comment like (optimistic, §7) */
commentList.addEventListener('click', function (e) {
    const like = e.target.closest('.comment-like');
    if (!like) return;
    const base = parseInt(like.dataset.count, 10);
    const on = like.getAttribute('aria-pressed') !== 'true';
    like.setAttribute('aria-pressed', String(on));
    like.classList.toggle('on', on);
    like.querySelector('span').textContent = fmt(base + (on ? 1 : 0));
    if (on) {
        like.classList.remove('pop');
        void like.offsetWidth;
        like.classList.add('pop');
    }
});

/* composer: Post disabled until text (§5.7) */
const commentForm = document.getElementById('comment-form');
const composerInput = document.getElementById('composer-input');
const composerPost = document.getElementById('composer-post');

composerInput.addEventListener('input', function () {
    if (composerPost.classList.contains('btn-spinning')) return; /* don't re-enable mid-post */
    composerPost.disabled = composerInput.value.trim() === '';
});

commentForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const text = composerInput.value.trim();
    if (!text || composerPost.classList.contains('btn-spinning')) return;

    /* §7 loading state: spinner in the button, then the comment lands */
    const label = composerPost.textContent;
    composerPost.disabled = true;
    composerPost.classList.add('btn-spinning');
    setTimeout(function () {
        composerPost.classList.remove('btn-spinning');
        composerPost.textContent = label;
        const finish = function () {
            composerInput.value = '';
            composerPost.disabled = true;
            commentSort = 'new';
            document.querySelectorAll('.sort-chip').forEach(function (c) {
                const on = c.dataset.sort === 'new';
                c.classList.toggle('active', on);
                c.setAttribute('aria-selected', String(on));
            });
            renderComments();
        };
        if (VIDEO_ID) {
            fetch('/api/videos/' + encodeURIComponent(VIDEO_ID) + '/comments', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text }),
            }).then(function (r) { return r.json(); }).then(function (j) {
                if (j && j.comment) {
                    COMMENTS.unshift({
                        name: j.comment.name, handle: j.comment.handle, avatar: 'img/channels4_profile.jpg',
                        time: 'now', text: j.comment.text, likes: 0, replies: 0, top: 0, age: 0, ts: j.comment.ts,
                    });
                }
                finish();
            }).catch(function () { finish(); });
        } else {
            COMMENTS.unshift({
                name: 'You', handle: '@nifemi', avatar: 'img/channels4_profile.jpg',
                time: 'now', text: text, likes: 0, replies: 0, top: 0, age: 0, ts: Date.now(),
            });
            finish();
        }
    }, 400);
});

/* ---------- UpNextRail (§4: compact PostCard list) ---------- */
const UP_NEXT = [
    { type: 'video', title: 'CSS Grid in 10 Minutes', channel: 'Web Wizards', avatar: 'img/profile-picture.png', time: '1d', media: 'img/image_d.jpg', duration: '10:00', likes: 3400, comments: 520, shares: 210 },
    { type: 'video', title: 'JavaScript tips you will actually use', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '3d', media: 'img/image_2.jpg', duration: '9:12', likes: 1750, comments: 267, shares: 98 },
    { type: 'video', title: 'My Coding Journey — year three update', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '2d', media: 'img/image_19.jpg', duration: '8:36', likes: 980, comments: 201, shares: 45 },
    { type: 'video', title: 'The design system that took me 6 months to build', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '4d', media: 'img/image_1.jpg', duration: '18:05', likes: 7300, comments: 980, shares: 870 },
    { type: 'video', title: 'Why everyone is going back to vanilla JS in 2026', channel: 'Web Wizards', avatar: 'img/profile-picture.png', time: '5d', media: 'img/image_2.jpg', duration: '11:47', likes: 11200, comments: 1900, shares: 2600 },
    { type: 'video', title: 'Live coding a game engine from scratch', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '6d', media: 'img/image_d.jpg', duration: '3:58:12', likes: 6700, comments: 840, shares: 520 }
];

/* compact card: thumbnail + title + channel · views (no action bar) */
function compactHtml(p, id) {
    return '<a class="upnext-card" href="watch.html' + (id ? '?id=' + encodeURIComponent(id) : '') + '">' +
        '<span class="upnext-thumb">' +
        '<img src="' + p.media + '" alt="' + p.title + '" loading="lazy">' +
        '<span class="duration-badge">' + p.duration + '</span>' +
        '</span>' +
        '<span class="upnext-meta">' +
        '<span class="upnext-title">' + p.title + '</span>' +
        '<span class="upnext-sub">' + p.channel + '</span>' +
        '<span class="upnext-sub">' + p.time + ' · ' + fmt(p.likes) + ' likes</span>' +
        '</span></a>';
}

const upnextList = document.getElementById('upnext-list');
upnextList.innerHTML = UP_NEXT.map(compactHtml).join('');

/* compact card: thumbnail + title + channel · views (no action bar) */
function compactApi(p) {
    return '<a class="upnext-card" href="watch.html?id=' + encodeURIComponent(p.id) + '">' +
        '<span class="upnext-thumb">' +
        '<img src="' + p.media + '" alt="' + p.title + '" loading="lazy">' +
        '<span class="duration-badge">' + (p.duration || '') + '</span>' +
        '</span>' +
        '<span class="upnext-meta">' +
        '<span class="upnext-title">' + p.title + '</span>' +
        '<span class="upnext-sub">' + p.channel + '</span>' +
        '<span class="upnext-sub">' + p.time + ' · ' + fmt(p.likes || 0) + ' likes</span>' +
        '</span></a>';
}
fetch('/api/videos?type=video', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
        if (!j || !Array.isArray(j.videos) || !j.videos.length) return;
        upnextList.innerHTML = j.videos
            .filter(function (v) { return v.id !== VIDEO_ID; })
            .slice(0, 8)
            .map(compactApi).join('');
    })
    .catch(function () { });
