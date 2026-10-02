// NVR Space - global overlays (DESIGN.md 5.10): CreateModal, NotificationsPanel, MessagesPanel
// Identical on every page: markup is injected here so no page has to hand-copy it.

(function () {
    'use strict';

    /* ---------- data ---------- */
    const NOTIFICATIONS = [
        { who: 'Aurora Pixel', avatar: 'img/profile-picture.png', text: 'liked your post', time: '2m', unread: true },
        { who: 'Dev Tips', avatar: 'img/channels4_profile.jpg', text: 'started following you', time: '18m', unread: true },
        { who: 'ByteSized', avatar: 'img/profile-picture.png', text: 'commented: “this fixed it, thank you”', time: '1h', unread: true },
        { who: 'Code With Me', avatar: 'img/profile-picture.png', text: 'replied to your comment', time: '3h', unread: false },
        { who: 'The CSS Pod', avatar: 'img/channels4_profile.jpg', text: 'mentioned you in a post', time: '1d', unread: false },
        { who: 'Loop & Learn', avatar: 'img/profile-picture.png', text: 'liked your comment', time: '2d', unread: false }
    ];

    const THREADS = [
        {
            name: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '4m', unread: true,
            messages: [
                { me: false, text: 'did you see the new watch page?', time: '09:41' },
                { me: true, text: 'just shipped it - comments and all', time: '09:42' },
                { me: false, text: 'nice. the sort toggle feels right', time: '09:43' },
                { me: true, text: 'thanks! up next rail was the tricky bit', time: '09:44' }
            ]
        },
        {
            name: 'Aurora Pixel', avatar: 'img/profile-picture.png', time: '1h', unread: true,
            messages: [
                { me: false, text: 'can you send the tokens file?', time: '08:12' },
                { me: true, text: 'sure, sending tonight', time: '08:15' }
            ]
        },
        {
            name: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '5h', unread: false,
            messages: [
                { me: false, text: 'deploy is green across the board', time: '04:30' }
            ]
        },
        {
            name: 'ByteSized', avatar: 'img/profile-picture.png', time: '2d', unread: false,
            messages: [
                { me: true, text: 'sending you the repo link', time: 'Mon' },
                { me: false, text: 'got it, thanks!', time: 'Mon' }
            ]
        }
    ];

    /* ---------- shared icons ---------- */
    const ICON = {
        close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
        upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>',
        send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
        back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
    };

    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    /* ---------- markup ---------- */
    const CREATE_TABS = [
        { id: 'upload', label: 'Upload' },
        { id: 'short', label: 'Short' },
        { id: 'photo', label: 'Photo' },
        { id: 'text', label: 'Text post' }
    ];

    const PRIVACY = ['Public', 'Followers', 'Only me'];

    function dropZoneHtml(kind) {
        return '<div class="dropzone" tabindex="0" role="button" aria-label="' + kind + ' file">' +
            '<span class="dz-icon">' + ICON.upload + '</span>' +
            '<p class="dz-title">Drag and drop your ' + kind.toLowerCase() + ' here</p>' +
            '<p class="dz-sub">or <button type="button" class="dz-pick">Select file</button></p>' +
            '<p class="dz-hint">' + (kind === 'Short'
                ? '9:16, up to 60 seconds'
                : kind === 'Photo'
                    ? 'JPG or PNG, up to 10 images'
                    : 'MP4 or MOV, up to 10 minutes') + '</p>' +
            '</div>';
    }

    function createModalHtml() {
        const tabs = CREATE_TABS.map(function (t, i) {
            return '<button type="button" class="create-tab' + (i === 0 ? ' active' : '') + '" ' +
                'role="tab" aria-selected="' + (i === 0 ? 'true' : 'false') + '" data-tab="' + t.id + '">' +
                t.label + '</button>';
        }).join('');

        const panels =
            '<div class="create-panel" data-panel="upload">' + dropZoneHtml('Video') + '</div>' +
            '<div class="create-panel" data-panel="short" hidden>' + dropZoneHtml('Short') + '</div>' +
            '<div class="create-panel" data-panel="photo" hidden>' + dropZoneHtml('Photo') + '</div>' +
            '<div class="create-panel" data-panel="text" hidden>' +
            '<textarea class="create-textarea" placeholder="Share something with your followers..." aria-label="Post text"></textarea>' +
            '<p class="create-counter"><span data-count>0</span>/500</p>' +
            '</div>';

        const chips = PRIVACY.map(function (p, i) {
            return '<button type="button" class="privacy-chip' + (i === 0 ? ' active' : '') + '" ' +
                'aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + p + '</button>';
        }).join('');

        return '<div class="overlay-backdrop" id="create-backdrop" hidden></div>' +
            '<div class="create-modal" id="create-modal" role="dialog" aria-modal="true" ' +
            'aria-label="Create post" aria-labelledby="create-heading" hidden>' +
            '<div class="create-head">' +
            '<h2 id="create-heading">Create</h2>' +
            '<button type="button" class="overlay-close" id="create-close" aria-label="Close">' + ICON.close + '</button>' +
            '</div>' +
            '<div class="create-tabs" role="tablist" aria-label="Post type">' + tabs + '</div>' +
            '<div class="create-body">' + panels + '</div>' +
            '<div class="create-foot">' +
            '<div class="privacy-row" role="group" aria-label="Who can see this">' + chips + '</div>' +
            '<div class="create-actions">' +
            '<button type="button" class="btn-ghost" id="create-cancel">Cancel</button>' +
            '<button type="button" class="btn-accent" id="create-submit" disabled>Post</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    function notifHtml() {
        const items = NOTIFICATIONS.map(function (n) {
            return '<li class="notif-item' + (n.unread ? ' unread' : '') + '">' +
                '<img class="notif-avatar" src="' + n.avatar + '" alt="' + esc(n.who) + ' avatar">' +
                '<span class="notif-text"><strong>' + esc(n.who) + '</strong> ' + esc(n.text) + '</span>' +
                '<span class="notif-time">' + n.time + '</span>' +
                (n.unread ? '<span class="notif-dot" aria-label="Unread"></span>' : '') +
                '</li>';
        }).join('');

        return '<div class="dropdown-panel notif-panel" id="notif-panel" role="dialog" ' +
            'aria-label="Notifications" hidden>' +
            '<div class="dropdown-head">' +
            '<h2>Notifications</h2>' +
            '<button type="button" class="link-btn" id="mark-read">Mark all read</button>' +
            '</div>' +
            '<ul class="notif-list" id="notif-list">' + items + '</ul>' +
            '<div class="empty-state" id="notif-empty" hidden>' +
            '<span class="empty-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4.5C13.5 3.67 12.83 3 12 3s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg></span>' +
            '<p>You&#8217;re all caught up</p>' +
            '</div>' +
            '</div>';
    }

    function messagesHtml() {
        const list = THREADS.map(function (t, i) {
            const last = t.messages[t.messages.length - 1];
            return '<li class="msg-item' + (t.unread ? ' unread' : '') + '" data-thread="' + i + '" tabindex="0" role="button">' +
                '<img class="msg-avatar" src="' + t.avatar + '" alt="' + esc(t.name) + ' avatar">' +
                '<span class="msg-text">' +
                '<span class="msg-name">' + esc(t.name) + '</span>' +
                '<span class="msg-preview">' + esc(last.text) + '</span>' +
                '</span>' +
                '<span class="msg-time">' + t.time + '</span>' +
                (t.unread ? '<span class="msg-dot" aria-label="Unread"></span>' : '') +
                '</li>';
        }).join('');

        return '<div class="dropdown-panel msg-panel" id="msg-panel" role="dialog" ' +
            'aria-label="Messages" hidden>' +
            '<div class="dropdown-head">' +
            '<h2>Messages</h2>' +
            '<button type="button" class="overlay-close" id="msg-close" aria-label="Close">' + ICON.close + '</button>' +
            '</div>' +
            '<ul class="msg-list" id="msg-list">' + list + '</ul>' +
            '<div class="msg-thread" id="msg-thread" hidden>' +
            '<div class="thread-head">' +
            '<button type="button" class="icon-btn" id="thread-back" aria-label="Back to conversations">' + ICON.back + '</button>' +
            '<img class="thread-avatar" id="thread-avatar" src="img/profile-picture.png" alt="">' +
            '<span class="thread-name" id="thread-name"></span>' +
            '</div>' +
            '<ol class="thread-body" id="thread-body"></ol>' +
            '<form class="thread-form" id="thread-form">' +
            '<input class="thread-input" id="thread-input" type="text" placeholder="Message..." aria-label="Message" autocomplete="off">' +
            '<button type="submit" class="thread-send" id="thread-send" aria-label="Send message" disabled>' + ICON.send + '</button>' +
            '</form>' +
            '</div>' +
            '</div>';
    }

    /* ---------- inject ---------- */
    const wrap = document.createElement('div');
    wrap.className = 'overlay-root';
    wrap.innerHTML = createModalHtml() + notifHtml() + messagesHtml();
    document.body.appendChild(wrap);

    /* ---------- element handles ---------- */
    const createBackdrop = document.getElementById('create-backdrop');
    const createModal = document.getElementById('create-modal');
    const notifPanel = document.getElementById('notif-panel');
    const msgPanel = document.getElementById('msg-panel');

    const createTriggers = [
        document.querySelector('.create-btn'),
        document.querySelector('.mob-create')
    ].filter(Boolean);
    const notifTrigger = document.querySelector('.header-actions .icon-btn[aria-label="Notifications"]');
    const msgTriggers = [
        document.querySelector('.msg-btn')
    ].filter(Boolean);

    let openPanel = null;      // 'create' | 'notif' | 'msg'
    let lastTrigger = null;    // element to restore focus to

    /* ---------- positioning (dropdowns anchor under their trigger) ---------- */
    function positionDropdown(panel, trigger) {
        if (!panel || !trigger) return;
        panel.style.visibility = 'hidden';
        panel.hidden = false;
        const r = trigger.getBoundingClientRect();
        const w = panel.offsetWidth;
        const gap = 8;
        let left = r.right - w;
        left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
        panel.style.left = Math.round(left) + 'px';
        panel.style.top = Math.round(r.bottom + gap) + 'px';
        panel.style.visibility = '';
    }

    /* ---------- open / close ---------- */
    function closeAll(restoreFocus) {
        createModal.hidden = true;
        createBackdrop.hidden = true;
        notifPanel.hidden = true;
        msgPanel.hidden = true;
        document.body.classList.remove('overlay-open');

        createTriggers.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
        if (notifTrigger) notifTrigger.setAttribute('aria-expanded', 'false');
        msgTriggers.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });

        const t = lastTrigger;
        openPanel = null;
        lastTrigger = null;
        if (restoreFocus && t && document.contains(t)) t.focus();
    }

    function openCreate(trigger) {
        closeAll(false);
        openPanel = 'create';
        lastTrigger = trigger;
        createBackdrop.hidden = false;
        createModal.hidden = false;
        document.body.classList.add('overlay-open');
        createTriggers.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
        const first = createModal.querySelector('.create-tab.active');
        if (first) first.focus();
    }

    function openNotif(trigger) {
        const reopening = openPanel === 'notif';
        closeAll(false);
        if (reopening) return;
        openPanel = 'notif';
        lastTrigger = trigger;
        positionDropdown(notifPanel, trigger);
        if (notifTrigger) notifTrigger.setAttribute('aria-expanded', 'true');
        const first = notifPanel.querySelector('.notif-item, .link-btn');
        if (first) first.focus();
    }

    function openMsg(trigger) {
        const reopening = openPanel === 'msg';
        closeAll(false);
        if (reopening) return;
        openPanel = 'msg';
        lastTrigger = trigger;
        showThread(null);
        positionDropdown(msgPanel, trigger);
        msgTriggers.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
        const first = msgPanel.querySelector('.msg-item, .overlay-close');
        if (first) first.focus();
    }

    function toggle(list, trigger) {
        const already = (openPanel === list);
        if (already) return closeAll(true);
        if (list === 'create') openCreate(trigger);
        else if (list === 'notif') openNotif(trigger);
        else openMsg(trigger);
    }

    createTriggers.forEach(function (b) {
        b.setAttribute('aria-haspopup', 'dialog');
        b.setAttribute('aria-expanded', 'false');
        b.addEventListener('click', function () { toggle('create', b); });
    });

    if (notifTrigger) {
        notifTrigger.setAttribute('aria-haspopup', 'dialog');
        notifTrigger.setAttribute('aria-expanded', 'false');
        notifTrigger.addEventListener('click', function () { toggle('notif', notifTrigger); });
    }

    msgTriggers.forEach(function (b) {
        b.setAttribute('aria-haspopup', 'dialog');
        b.setAttribute('aria-expanded', 'false');
        b.addEventListener('click', function () { toggle('msg', b); });
    });

    /* ---------- escape + outside click ---------- */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && openPanel) closeAll(true);
    });

    createBackdrop.addEventListener('click', function () { closeAll(true); });

    document.addEventListener('mousedown', function (e) {
        if (!openPanel || openPanel === 'create') return;
        const panel = openPanel === 'notif' ? notifPanel : msgPanel;
        const trigger = openPanel === 'notif' ? notifTrigger
            : (msgTriggers[0] || document.querySelector('.mob-create'));
        if (panel.contains(e.target)) return;
        if (trigger && trigger.contains(e.target)) return;
        closeAll(false);
    });

    /* reposition open dropdowns on resize */
    window.addEventListener('resize', function () {
        if (openPanel === 'notif') positionDropdown(notifPanel, notifTrigger);
        else if (openPanel === 'msg') positionDropdown(msgPanel, msgTriggers[0]);
    });

    /* ---------- CreateModal behaviour ---------- */
    const createTabs = createModal.querySelectorAll('.create-tab');
    const createPanels = createModal.querySelectorAll('.create-panel');
    const submitBtn = document.getElementById('create-submit');
    const textarea = createModal.querySelector('.create-textarea');
    const counter = createModal.querySelector('[data-count]');

    function currentPanel() {
        return createModal.querySelector('.create-panel:not([hidden])');
    }

    function refreshSubmit() {
        const active = createModal.querySelector('.create-tab.active').dataset.tab;
        if (active === 'text') {
            const v = textarea.value.trim();
            submitBtn.disabled = v === '' || v.length > 500;
            counter.parentElement.classList.toggle('over', textarea.value.length > 500);
        } else {
            // media tabs: ready once this panel's dropzone has a "file"
            const dz = currentPanel().querySelector('.dropzone');
            submitBtn.disabled = !dz || !dz.classList.contains('filled');
        }
    }

    createTabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            createTabs.forEach(function (t) {
                const on = t === tab;
                t.classList.toggle('active', on);
                t.setAttribute('aria-selected', String(on));
            });
            createPanels.forEach(function (p) {
                p.hidden = p.dataset.panel !== tab.dataset.tab;
            });
            refreshSubmit();
        });
    });

    textarea.addEventListener('input', function () {
        counter.textContent = textarea.value.length;
        refreshSubmit();
    });

    /* real file picking: a hidden <input type=file> reads the bytes as
       base64, and posting uploads them to /api/upload */
    let pickedFile = null;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*,image/*';
    fileInput.hidden = true;
    createModal.appendChild(fileInput);
    fileInput.addEventListener('change', function () {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        pickedFile = f;
        const dz = createModal.querySelector('.dropzone.filled') || createModal.querySelector('.dropzone');
        if (dz) {
            dz.classList.add('filled');
            dz.querySelector('.dz-title').textContent = f.name + ' (' + Math.round(f.size / 1024) + ' KB)';
            dz.querySelector('.dz-sub').innerHTML = '<span class="dz-ready">Ready to post</span>';
        }
        refreshSubmit();
    });

    createModal.addEventListener('click', function (e) {
        if (e.target.closest('.dz-pick') || e.target.closest('.dropzone')) {
            const dz = e.target.closest('.dropzone');
            if (dz && !dz.classList.contains('filled')) {
                dz.classList.add('filled');
                dz.querySelector('.dz-title').textContent = 'Choose a file…';
            }
            fileInput.click();
            refreshSubmit();
        }
    });

    createModal.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('dropzone')) {
            e.preventDefault();
            e.target.click();
        }
    });

    createModal.querySelectorAll('.privacy-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
            createModal.querySelectorAll('.privacy-chip').forEach(function (c) {
                const on = c === chip;
                c.classList.toggle('active', on);
                c.setAttribute('aria-pressed', String(on));
            });
        });
    });

    function closeCreate() { closeAll(true); }

    document.getElementById('create-close').addEventListener('click', closeCreate);
    document.getElementById('create-cancel').addEventListener('click', closeCreate);

    let posting = false;

    submitBtn.addEventListener('click', function () {
        if (posting) return;
        posting = true;
        const label = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-spinning'); /* §7: spinner in button */

        const done = function (msg) {
            posting = false;
            submitBtn.classList.remove('btn-spinning');
            submitBtn.textContent = label;
            if (textarea) { textarea.value = ''; counter.textContent = '0'; }
            pickedFile = null;
            fileInput.value = '';
            createModal.querySelectorAll('.dropzone.filled').forEach(function (dz) {
                dz.classList.remove('filled');
                dz.querySelector('.dz-title').textContent = 'Drag and drop your file here';
                dz.querySelector('.dz-sub').innerHTML = 'or <button type="button" class="dz-pick">Select file</button>';
            });
            refreshSubmit();
            closeCreate();
            toast(msg);
        };

        if (pickedFile) {
            const reader = new FileReader();
            reader.onload = function () {
                const b64 = String(reader.result).split(',')[1] || '';
                fetch('/api/upload', {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        kind: pickedFile.type.indexOf('image') === 0 ? 'image' : 'video',
                        title: (textarea && textarea.value.trim()) || pickedFile.name,
                        dataBase64: b64,
                    }),
                }).then(function (r) { return r.json(); })
                  .then(function (j) { done(j && j.video ? 'Your post is live' : 'Upload failed — are you signed in?'); })
                  .catch(function () { done('Upload failed — server unreachable'); });
            };
            reader.onerror = function () { done('Could not read that file'); };
            reader.readAsDataURL(pickedFile);
        } else {
            setTimeout(function () { done('Your post is live'); }, 900);
        }
    });

    /* ---------- Notifications behaviour ---------- */
    const notifList = document.getElementById('notif-list');
    const notifEmpty = document.getElementById('notif-empty');
    const bellBadge = document.querySelector('.header-actions .icon-btn[aria-label="Notifications"] .badge');

    document.getElementById('mark-read').addEventListener('click', function () {
        notifList.querySelectorAll('.notif-item').forEach(function (li) {
            li.classList.remove('unread');
            const dot = li.querySelector('.notif-dot');
            if (dot) dot.remove();
        });
        if (bellBadge) bellBadge.style.display = 'none';
    });

    notifList.addEventListener('click', function (e) {
        const li = e.target.closest('.notif-item');
        if (!li) return;
        li.classList.remove('unread');
        const dot = li.querySelector('.notif-dot');
        if (dot) dot.remove();
        const remaining = notifList.querySelectorAll('.notif-item.unread').length;
        if (bellBadge && remaining === 0) bellBadge.style.display = 'none';
    });

    /* ---------- Messages behaviour ---------- */
    const msgList = document.getElementById('msg-list');
    const threadView = document.getElementById('msg-thread');
    const threadBody = document.getElementById('thread-body');
    const threadName = document.getElementById('thread-name');
    const threadAvatar = document.getElementById('thread-avatar');
    const threadForm = document.getElementById('thread-form');
    const threadInput = document.getElementById('thread-input');
    const threadSend = document.getElementById('thread-send');
    let activeThread = null;

    function renderThread(t) {
        threadBody.innerHTML = t.messages.map(function (m) {
            return '<li class="bubble' + (m.me ? ' me' : ' them') + '">' +
                '<span class="bubble-text">' + esc(m.text) + '</span>' +
                '<span class="bubble-time">' + esc(m.time) + '</span>' +
                '</li>';
        }).join('');
        threadBody.scrollTop = threadBody.scrollHeight;
    }

    function showThread(index) {
        if (index === null) {
            activeThread = null;
            msgList.hidden = false;
            threadView.hidden = true;
            return;
        }
        activeThread = THREADS[index];
        threadName.textContent = activeThread.name;
        threadAvatar.src = activeThread.avatar;
        threadAvatar.alt = activeThread.name + ' avatar';
        renderThread(activeThread);
        msgList.hidden = true;
        threadView.hidden = false;
    }

    msgList.addEventListener('click', function (e) {
        const li = e.target.closest('.msg-item');
        if (!li) return;
        li.classList.remove('unread');
        const dot = li.querySelector('.msg-dot');
        if (dot) dot.remove();
        showThread(parseInt(li.dataset.thread, 10));
        threadInput.focus();
    });

    msgList.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const li = e.target.closest('.msg-item');
        if (!li) return;
        e.preventDefault();
        li.click();
    });

    document.getElementById('thread-back').addEventListener('click', function () {
        showThread(null);
        const first = msgPanel.querySelector('.msg-item');
        if (first) first.focus();
    });

    document.getElementById('msg-close').addEventListener('click', function () {
        closeAll(true);
    });

    threadInput.addEventListener('input', function () {
        threadSend.disabled = threadInput.value.trim() === '';
    });

    threadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const text = threadInput.value.trim();
        if (!text || !activeThread) return;
        const now = new Date();
        const time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        activeThread.messages.push({ me: true, text: text, time: time });
        threadInput.value = '';
        threadSend.disabled = true;
        renderThread(activeThread);
        /* refresh the list preview behind the thread */
        const row = msgList.querySelector('[data-thread]');
        if (row) {
            const preview = row.querySelector('.msg-preview');
            if (preview) preview.textContent = text;
            const timeEl = row.querySelector('.msg-time');
            if (timeEl) timeEl.textContent = 'now';
        }
    });

    /* ---------- toast (DESIGN.md 7: bottom-center pill, auto-dismiss 4s) ---------- */
    function toast(message) {
        let el = document.getElementById('nvr-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'nvr-toast';
            el.className = 'toast';
            el.setAttribute('role', 'status');
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(el._timer);
        el._timer = setTimeout(function () { el.classList.remove('show'); }, 4000);
    }

    window.nvrToast = toast;
})();
