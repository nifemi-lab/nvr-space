// NVR Space — explore page: trending chips + hot feed (PostCard list, not a grid — DESIGN.md §3.3, §6)

const TRENDING_CHIPS = ['Trending', 'Gaming', 'Music', 'Comic books', 'Live', 'News', 'Sports', 'Learning', 'Fashion & Beauty'];

const HOT_POSTS = [
    { type: 'video', title: 'I coded non-stop for 30 days — here is the result', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '1h', media: 'img/image_19.jpg', duration: '14:22', likes: 15200, comments: 2400, shares: 3100, text: 'One month, one project, no excuses. Full retrospective inside.' },
    { type: 'text', title: 'Hot take: CSS is a programming language and I will die on this hill.', channel: 'Web Wizards', avatar: 'img/profile-picture.png', time: '2h', likes: 12800, comments: 3400, shares: 2100 },
    { type: 'short', title: 'POV: you deploy on a Friday and nothing breaks', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '3h', media: 'img/image_2.jpg', likes: 8900, comments: 640, shares: 1500 },
    { type: 'video', title: 'The design system that took me 6 months to build', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '4h', media: 'img/image_1.jpg', duration: '18:05', likes: 7300, comments: 980, shares: 870 },
    { type: 'photos', title: 'Maker Faire 2026 — full photo dump from the floor', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '5h', media: 'img/image_d.jpg', count: 8, likes: 5400, comments: 720, shares: 310 },
    { type: 'text', title: 'Unpopular opinion: the best framework is the one you already know. Stop chasing shiny.', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '6h', likes: 9600, comments: 2800, shares: 1800 },
    { type: 'video', title: 'Why everyone is going back to vanilla JS in 2026', channel: 'Web Wizards', avatar: 'img/profile-picture.png', time: '8h', media: 'img/image_2.jpg', duration: '11:47', likes: 11200, comments: 1900, shares: 2600 },
    { type: 'video', title: 'Live coding a game engine from scratch — day 12 recap', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '12h', media: 'img/image_d.jpg', duration: '3:58:12', likes: 6700, comments: 840, shares: 520 }
];

/* ---------- trending chips bar ---------- */
const chipBar = document.getElementById('trending-chips');
TRENDING_CHIPS.forEach(function (label, i) {
    const chip = document.createElement('button');
    chip.className = 'filter_chip' + (i === 0 ? ' active' : '');
    chip.textContent = label;
    chipBar.appendChild(chip);
});
chipBar.addEventListener('click', function (e) {
    const chip = e.target.closest('.filter_chip');
    if (!chip) return;
    chipBar.querySelectorAll('.filter_chip.active').forEach(function (c) {
        c.classList.remove('active');
    });
    chip.classList.add('active');
});

/* ---------- hot feed (single-column PostCard list) ---------- */
const HOT_IDS = { 'I coded non-stop for 30 days — here is the result': 'v5' };
function refId(p) {
    return p && p.id ? p.id : (HOT_IDS[p.title] || '');
}
HOT_POSTS.forEach(function (p) { if (!p.id) p.id = refId(p); });

const hotFeed = document.getElementById('hot-feed');
clearSkeletons(hotFeed);

/* real search: ?q= filters the hot feed by title/channel */
const params = new URLSearchParams(location.search);
const q = (params.get('q') || '').toLowerCase().trim();
let feedList = HOT_POSTS;
if (q) {
    feedList = HOT_POSTS.filter(function (p) {
        return (p.title + ' ' + p.channel + ' ' + (p.text || '')).toLowerCase().indexOf(q) >= 0;
    });
    const bar = document.querySelector('.filter_bar');
    if (bar) bar.insertAdjacentHTML('afterend', '<p style="padding:8px 16px;color:var(--text-2,#888)">Results for “' + q.replace(/[<>&"]/g, '') + '” — ' + feedList.length + ' post(s)</p>');
}
feedList.forEach(function (p) {
    hotFeed.insertAdjacentHTML('beforeend', cardHtml(p));
});
attachPostActions(hotFeed);
