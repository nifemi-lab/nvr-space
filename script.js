// NVR Space — home page: filter chips, stories row + viewer, PostCard feed
// Shared PostCard builders + like/save live in posts.js (loaded before this file)

/* ---------- feed data (DESIGN.md §5.1–5.2) ---------- */
const REGULAR_POSTS = [
    { type: 'video', title: 'How I Built a Website from Scratch', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '2h', media: 'img/image_1.jpg', duration: '12:04', likes: 1200, comments: 340, shares: 89, text: 'Full breakdown of the stack, the design decisions, and how the deploy pipeline works.' },
    { type: 'photos', title: 'Studio setup tour — new episode every Friday', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '5h', media: 'img/image_2.jpg', count: 4, likes: 860, comments: 112, shares: 23 },
    { type: 'video', title: 'CSS Grid in 10 Minutes', channel: 'Web Wizards', avatar: 'img/profile-picture.png', time: '1d', media: 'img/image_d.jpg', duration: '10:00', likes: 3400, comments: 520, shares: 210 },
    { type: 'video', title: 'My Coding Journey — year three update', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '2d', media: 'img/image_19.jpg', duration: '8:36', likes: 980, comments: 201, shares: 45, text: 'Three years of building things. Here is what I wish I knew on day one.' },
    { type: 'photos', title: 'Sketchbook dump: logo concepts for the rebrand', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '1d', media: 'img/image_1.jpg', count: 3, likes: 640, comments: 98, shares: 12 },
    { type: 'video', title: 'JavaScript tips you will actually use', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '3d', media: 'img/image_2.jpg', duration: '9:12', likes: 1750, comments: 267, shares: 98 }
];

const MIXED_POSTS = [
    { type: 'short', title: 'POV: your code works first try', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '3h', media: 'img/image_19.jpg', likes: 5400, comments: 430, shares: 1200 },
    { type: 'text', title: 'Hot take: dark mode should be the default everywhere. Fight me in the comments.', channel: 'Web Wizards', avatar: 'img/profile-picture.png', time: '6h', likes: 2100, comments: 890, shares: 140 },
    { type: 'short', title: 'Behind the scenes of today\u2019s shoot', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '8h', media: 'img/image_d.jpg', likes: 3200, comments: 189, shares: 430 },
    { type: 'text', title: 'Unpopular opinion: tutorials make you worse before they make you better. Build something ugly today.', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '12h', likes: 1300, comments: 760, shares: 230 }
];

/* Mixing rule: every 4th slot = 1 short card + 1 text card (§5.2) */
function buildFeed(regular, mixed) {
    const out = [];
    let m = 0;
    regular.forEach(function (p, i) {
        out.push(p);
        if ((i + 1) % 3 === 0) {
            if (m < mixed.length) out.push(mixed[m++]);
            if (m < mixed.length) out.push(mixed[m++]);
        }
    });
    while (m < mixed.length) out.push(mixed[m++]);
    return out;
}

REGULAR_POSTS[0].id = 'v1'; REGULAR_POSTS[1].id = 'p1'; REGULAR_POSTS[2].id = 'v2';
REGULAR_POSTS[3].id = 'v3'; REGULAR_POSTS[4].id = 'p2'; REGULAR_POSTS[5].id = 'v4';
MIXED_POSTS[0].id = 's1'; MIXED_POSTS[1].id = 't1'; MIXED_POSTS[2].id = 's2'; MIXED_POSTS[3].id = 't2';

const feedGrid = document.getElementById('feed-grid');
function renderFeed(list) {
    clearSkeletons(feedGrid);
    feedGrid.querySelectorAll('.post-card').forEach(function (n) { n.remove(); });
    if (!list.length) {
        feedGrid.insertAdjacentHTML('beforeend', '<p class="feed-empty" style="padding:24px;color:var(--text-2,#888)">Nothing here yet — try another topic.</p>');
        return;
    }
    list.forEach(function (p) { feedGrid.insertAdjacentHTML('beforeend', cardHtml(p)); });
    if (!renderFeed.wired) { attachPostActions(feedGrid); renderFeed.wired = true; }
    else {
        feedGrid.querySelectorAll('.post-card[data-href]').forEach(function (card) {
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'link');
        });
    }
}
const ALL_POSTS = buildFeed(REGULAR_POSTS, MIXED_POSTS);
renderFeed(ALL_POSTS);

/* ---------- filter chips (§5.4) ---------- */
const chipBar = document.querySelector('.filter_bar');
chipBar.addEventListener('click', function (e) {
    const chip = e.target.closest('.filter_chip');
    if (!chip) return;
    chipBar.querySelectorAll('.filter_chip.active').forEach(function (c) {
        c.classList.remove('active');
    });
    chip.classList.add('active');
    const label = chip.textContent.trim().toLowerCase();
    renderFeed(label === 'all'
        ? ALL_POSTS
        : ALL_POSTS.filter(function (p) {
            return (p.title + ' ' + p.channel + ' ' + (p.text || '') + ' ' + p.type).toLowerCase().indexOf(label) >= 0;
        }));
});

/* ---------- stories (§5.3) ---------- */
const STORIES = [
    { name: 'You', img: 'img/image_1.jpg', avatar: 'img/channels4_profile.jpg', seen: false },
    { name: 'nifemi', img: 'img/image_19.jpg', avatar: 'img/profile-picture.png', seen: false },
    { name: 'codewithme', img: 'img/image_2.jpg', avatar: 'img/profile-picture.png', seen: true },
    { name: 'devtips', img: 'img/image_d.jpg', avatar: 'img/channels4_profile.jpg', seen: true },
    { name: 'webwiz', img: 'img/image_1.jpg', avatar: 'img/profile-picture.png', seen: false },
    { name: 'aurora', img: 'img/image_2.jpg', avatar: 'img/channels4_profile.jpg', seen: true },
    { name: 'pixel', img: 'img/image_19.jpg', avatar: 'img/profile-picture.png', seen: false }
];
const STORY_MS = 5000;

const storiesRow = document.getElementById('stories-row');
const viewer = document.getElementById('story-viewer');
const storyImg = document.getElementById('story-image');
const storyAvatar = document.getElementById('story-avatar');
const storyName = document.getElementById('story-name');
const storyProgress = document.getElementById('story-progress');
let storyIndex = 0;
let storyTimer = null;

function renderStories() {
    STORIES.forEach(function (s, i) {
        const b = document.createElement('button');
        b.className = 'story-circle' + (s.seen ? ' seen' : '');
        b.setAttribute('aria-label', 'View ' + s.name + '\u2019s story');
        b.innerHTML = '<span class="story-ring"><img src="' + s.avatar + '" alt=""></span>' +
            '<span class="story-name">' + s.name + '</span>';
        b.addEventListener('click', function () { openStory(i); });
        storiesRow.appendChild(b);
    });
}

function refreshStoryRings() {
    storiesRow.querySelectorAll('.story-circle').forEach(function (b, i) {
        b.classList.toggle('seen', STORIES[i].seen);
    });
}

function openStory(i) {
    storyIndex = i;
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    showStory();
}

function closeStory() {
    viewer.hidden = true;
    document.body.style.overflow = '';
    clearTimeout(storyTimer);
}

function showStory() {
    const s = STORIES[storyIndex];
    s.seen = true;
    refreshStoryRings();
    storyImg.src = s.img;
    storyImg.alt = s.name + '\u2019s story';
    storyAvatar.src = s.avatar;
    storyAvatar.alt = s.name + ' avatar';
    storyName.textContent = s.name;
    storyProgress.innerHTML = '';
    STORIES.forEach(function (_, j) {
        const bar = document.createElement('span');
        bar.className = 'story-bar' + (j < storyIndex ? ' done' : '') + (j === storyIndex ? ' current' : '');
        bar.innerHTML = '<i></i>';
        storyProgress.appendChild(bar);
    });
    const fill = storyProgress.querySelector('.current i');
    fill.style.animationDuration = STORY_MS + 'ms';
    clearTimeout(storyTimer);
    storyTimer = setTimeout(nextStory, STORY_MS);
}

function nextStory() {
    if (storyIndex < STORIES.length - 1) {
        storyIndex++;
        showStory();
    } else {
        closeStory();
    }
}

function prevStory() {
    storyIndex = Math.max(0, storyIndex - 1);
    showStory();
}

document.getElementById('story-close').addEventListener('click', closeStory);
document.getElementById('story-next').addEventListener('click', nextStory);
document.getElementById('story-prev').addEventListener('click', prevStory);
document.addEventListener('keydown', function (e) {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeStory();
    if (e.key === 'ArrowRight') nextStory();
    if (e.key === 'ArrowLeft') prevStory();
});

renderStories();
