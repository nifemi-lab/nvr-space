// NVR Space — profile page: profile header, tab bar, profile grid (DESIGN.md §5.8–5.9)

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

/* ---------- grid tile data ---------- */
const VIDEO_TILES = [
    { id: 'v4', media: 'img/image_2.jpg', duration: '9:12', title: 'JavaScript tips you will actually use' },
    { id: 'v1', media: 'img/image_1.jpg', duration: '12:04', title: 'How I built my studio setup' },
    { id: 'v2', media: 'img/image_d.jpg', duration: '10:00', title: 'CSS Grid layout crash course' },
    { id: 'v3', media: 'img/image_19.jpg', duration: '8:36', title: 'My coding journey — year three' },
    { media: 'img/image_2.jpg', duration: '15:32', title: 'Five landing pages dissected' },
    { media: 'img/image_1.jpg', duration: '6:18', title: 'Speedrun: a responsive navbar' },
    { media: 'img/image_d.jpg', duration: '21:45', title: 'Building a design system from scratch' },
    { media: 'img/image_19.jpg', duration: '11:03', title: 'Dark mode done right' },
    { media: 'img/image_2.jpg', duration: '14:26', title: 'What is on my desk in 2026' }
];

const SHORT_TILES = [
    { id: 's1', media: 'img/image_19.jpg', title: 'POV: your code works first try' },
    { id: 's2', media: 'img/image_d.jpg', title: 'Behind the scenes of today\u2019s shoot' },
    { media: 'img/image_2.jpg', title: 'Three CSS tricks in sixty seconds' },
    { media: 'img/image_1.jpg', title: 'Desk setup in portrait mode' },
    { media: 'img/image_19.jpg', title: 'When the flexbox finally centers' },
    { media: 'img/image_d.jpg', title: 'Friday deploy feelings' }
];

const POST_TILES = [
    { kind: 'photo', media: 'img/image_1.jpg', title: 'Sketchbook dump: logo concepts for the rebrand' },
    { kind: 'text', text: 'Hot take: dark mode should be the default everywhere. Fight me in the comments.' },
    { kind: 'photo', media: 'img/image_2.jpg', title: 'New gear day — the workspace gets an upgrade' },
    { kind: 'text', text: 'Unpopular opinion: tutorials make you worse before they make you better. Build something ugly today.' },
    { kind: 'photo', media: 'img/image_19.jpg', title: 'Workspace corner refresh, part two' },
    { kind: 'photo', media: 'img/image_d.jpg', title: 'Conference talk behind the scenes' },
    { kind: 'text', text: 'Shipping the new profile page today. Grids, tabs, the works. Feels good to see it come together.' },
    { kind: 'photo', media: 'img/image_1.jpg', title: 'Moodboard for the spring rebrand' }
];

const TAGGED_TILES = [
    { kind: 'photo', media: 'img/image_d.jpg', title: 'Dev Tips tagged at the Web Wizards meetup', by: 'img/profile-picture.png' },
    { kind: 'photo', media: 'img/image_2.jpg', title: 'Dev Tips tagged in a studio tour thread', by: 'img/profile-picture.png' },
    { kind: 'text', text: 'Shout-out from Code With Me — thanks for the collab, Dev Tips!', by: 'img/profile-picture.png' },
    { kind: 'photo', media: 'img/image_19.jpg', title: 'Dev Tips tagged in city meetup photos', by: 'img/profile-picture.png' }
];

/* ---------- tile builders (§5.9: hover scale 1.02 + play icon) ---------- */
function videoTile(t) {
    return '<a href="watch.html' + (t.id ? '?id=' + t.id : '') + '" class="grid-tile tile-video" aria-label="' + t.title + '">' +
        '<img class="tile-img" src="' + t.media + '" alt="' + t.title + '" loading="lazy">' +
        '<span class="tile-play">' + PLAY_ICON + '</span>' +
        '<span class="duration-badge">' + t.duration + '</span></a>';
}

function shortTile(t) {
    return '<a href="shorts.html' + (t.id ? '?id=' + t.id : '') + '" class="grid-tile tile-short" aria-label="' + t.title + '">' +
        '<img class="tile-img" src="' + t.media + '" alt="' + t.title + '" loading="lazy">' +
        '<span class="tile-play">' + PLAY_ICON + '</span></a>';
}

function postTile(t) {
    if (t.kind === 'text') {
        return '<div class="grid-tile tile-text"><p class="tile-text-body">' + t.text + '</p></div>';
    }
    return '<a href="#" class="grid-tile tile-photo" aria-label="' + t.title + '">' +
        '<img class="tile-img" src="' + t.media + '" alt="' + t.title + '" loading="lazy"></a>';
}

function taggedTile(t) {
    const tag = '<img class="tile-tag-avatar" src="' + t.by + '" alt="Tagged by Code With Me">';
    if (t.kind === 'text') {
        return '<div class="grid-tile tile-text">' + tag + '<p class="tile-text-body">' + t.text + '</p></div>';
    }
    return '<a href="#" class="grid-tile tile-photo" aria-label="' + t.title + '">' +
        '<img class="tile-img" src="' + t.media + '" alt="' + t.title + '" loading="lazy">' + tag + '</a>';
}

const TILE_BUILDERS = {
    videos: videoTile,
    shorts: shortTile,
    posts: postTile,
    tagged: taggedTile
};

/* ---------- tab bar + grid ---------- */
const profileGrid = document.getElementById('profile-grid');
const profileTabs = document.querySelectorAll('.profile-tab');

function renderTab(id) {
    if (!profileGrid) return;
    const tiles = { videos: VIDEO_TILES, shorts: SHORT_TILES, posts: POST_TILES, tagged: TAGGED_TILES }[id];
    profileGrid.innerHTML = tiles.map(TILE_BUILDERS[id]).join('');
}

profileTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
        profileTabs.forEach(function (x) {
            x.classList.remove('active');
            x.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        renderTab(tab.dataset.tab);
    });
});

renderTab('videos');

/* ---------- follow button (3-label swap lives in index.css) ---------- */
const profileFollow = document.getElementById('profile-follow');
if (profileFollow) {
    profileFollow.addEventListener('click', function () {
        const on = profileFollow.getAttribute('aria-pressed') !== 'true';
        profileFollow.setAttribute('aria-pressed', String(on));
        profileFollow.classList.toggle('following', on);
    });
}
