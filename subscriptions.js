// NVR Space — subscriptions page: FeedGrid filtered to subscribed channels only
// (DESIGN.md §6). Cards land through the shared builders in posts.js.

/* Channels you follow — kept in sync with the sidebar's subscription list. */
const SUBSCRIBED = ['Code With Me', 'Dev Tips', 'Nifemi Codes'];

const SUB_POSTS = [
    { type: 'video', title: 'How I Built a Website from Scratch', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '2h', media: 'img/image_1.jpg', duration: '12:04', likes: 1200, comments: 340, shares: 89, text: 'Full breakdown of the stack, the design decisions, and how the deploy pipeline works.' },
    { type: 'photos', title: 'Studio setup tour — new episode every Friday', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '5h', media: 'img/image_2.jpg', count: 4, likes: 860, comments: 112, shares: 23 },
    { type: 'video', title: 'My Coding Journey — year three update', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '2d', media: 'img/image_19.jpg', duration: '8:36', likes: 980, comments: 201, shares: 45, text: 'Three years of building things. Here is what I wish I knew on day one.' },
    { type: 'text', title: 'Shipping the profile page today. Grids, tabs, the works.', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '3d', likes: 640, comments: 88, shares: 31 },
    { type: 'video', title: 'JavaScript tips you will actually use', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '4d', media: 'img/image_2.jpg', duration: '9:12', likes: 1750, comments: 267, shares: 98 },
    { type: 'photos', title: 'Sketchbook dump: logo concepts for the rebrand', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '5d', media: 'img/image_1.jpg', count: 3, likes: 640, comments: 98, shares: 12 },
    { type: 'short', title: 'POV: your code works first try', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '6d', media: 'img/image_19.jpg', likes: 5400, comments: 430, shares: 1200 }
];

const subFeed = document.getElementById('sub-feed');
const subEmpty = document.getElementById('sub-empty');

/* §6: FeedGrid filtered to subscribed channels only */
function renderSubs(list) {
    clearSkeletons(subFeed);
    const visible = list.filter(function (p) {
        return SUBSCRIBED.indexOf(p.channel) !== -1;
    });

    if (!visible.length) {
        subFeed.hidden = true;
        subEmpty.hidden = false;
        return;
    }
    subEmpty.hidden = true;
    subFeed.hidden = false;
    subFeed.innerHTML = visible.map(cardHtml).join('');
    attachPostActions(subFeed);
}

let showingAll = false;

document.getElementById('sub-filter').addEventListener('click', function () {
    showingAll = !showingAll;
    this.setAttribute('aria-pressed', String(showingAll));
    /* "All subscriptions" shows everything from followed channels;
       pressing again narrows back down (here: to nothing but the empty state) */
    this.textContent = showingAll ? 'Subscriptions only' : 'All subscriptions';
    renderSubs(showingAll ? SUB_POSTS : []);
});

/* Empty state CTA (§7) → Explore, where you find channels */
document.getElementById('sub-empty-cta').addEventListener('click', function () {
    location.href = 'explore.html';
});

renderSubs(SUB_POSTS);
