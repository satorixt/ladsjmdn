const ARCANAS = [
    { id: 'ogre', name: "Flockheart's Gamble", hero: "Ogre Magi", img: "https://static.wikia.nocookie.net/dota2_gamepedia/images/2/25/Cosmetic_icon_Flockheart%27s_Gamble.png/revision/latest/scale-to-width-down/200?cb=20191219034436", price: 2450.75 },
    { id: 'tb', name: "Fractal Horns of Inner Abysm", hero: "Terrorblade", img: "https://community.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttydbPaERSR0Wqmu7LAocGI2zyUS1Q7nAxtizOmmV6Vdx8cj1-FrmTxzOipPy7y1J7f6vbKFSLPGBCWLewO0v5uQxSnnjkx5_5m6Ez9yueHmROw8pApV0R-cLtRK4xIHuNb7ntRue1dxikdfrfQ/320x320", price: 3120.40 },
    { id: 'pudge', name: "Feast of Abscession", hero: "Pudge", img: "https://static.wikia.nocookie.net/dota2_gamepedia/images/c/c9/Cosmetic_icon_Feast_of_Abscession.png/revision/latest/scale-to-width-down/200?cb=20180403215928", price: 1980.12 },
    { id: 'jugg', name: "Bladeform Legacy", hero: "Juggernaut", img: "https://static.wikia.nocookie.net/dota2_gamepedia/images/5/5c/Cosmetic_icon_Bladeform_Legacy.png/revision/latest/scale-to-width-down/200?cb=20180127175847", price: 2765.88 },
    { id: 'zeus', name: "Tempest Helm of the Thundergod", hero: "Zeus", img: "https://static.wikia.nocookie.net/dota2_gamepedia/images/3/3b/Cosmetic_icon_Tempest_Helm_of_the_Thundergod.png/revision/latest/scale-to-width-down/200?cb=20151216223848", price: 2210.33 }
];

let balance = 0; 
let inventory = [];
let upgradeHistory = [];
let bestDrop = "Нет";
let steamWithdrawn = 0.00;
let selectedInventoryItem = null;
let selectedUpgradeItem = null;
let currentChance = 50.00;
let isSpinning = false;
let isSoundOn = true;
let isFastMode = false;
let currentUser = null;

function $(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

const balanceEl = qs('.balance-amount');
const inventoryGrid = $('inventory-grid');
const marketGrid = $('market-grid');
const upgradeGrid = $('upgrade-grid');
const tabBtns = qsa('.tab-btn');
const tabContents = qsa('.tab-content');
const wheelBg = $('wheel-bg');
const centerText = $('center-text');
const centerSubtext = $('center-subtext');
const spinBtn = $('spin-btn');
const arrow = $('arrow');
const chanceFill = $('chance-fill');
const modalDeposit = $('deposit-modal');
const depositInput = $('deposit-amount');
const toastContainer = $('toast-container');
const soundToggle = $('sound-toggle');
const modeToggle = $('mode-toggle');
const liveFeedList = $('live-feed-list');
const profileBtn = $('profile-btn');
const profileModal = $('profile-modal');
const closeProfileBtn = $('close-profile');
const profileInventoryGrid = $('profile-inventory-grid');
const historyList = $('history-list');
const bestDropEl = $('best-drop');
const steamWithdrawnEl = $('steam-withdrawn');

const slotLeft = $('slot-left');
const slotLeftContent = $('slot-left-content');
const slotLeftImg = $('slot-left-img');
const slotLeftName = $('slot-left-name');
const slotLeftPrice = $('slot-left-price');
const slotRight = $('slot-right');
const slotRightContent = $('slot-right-content');
const slotRightImg = $('slot-right-img');
const slotRightName = $('slot-right-name');
const slotRightPrice = $('slot-right-price');

const confirmModal = $('confirm-modal');
const confirmTitle = $('confirm-title');
const confirmText = $('confirm-text');
const confirmYes = $('confirm-yes');
const confirmNo = $('confirm-no');

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// --- СИНХРОНИЗАЦИЯ БАЛАНСА С СЕРВЕРОМ ---
async function syncBalance(newBalance) {
    try {
        const res = await fetch('/api/update-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newBalance: newBalance })
        });
        if (!res.ok) {
            console.error("Не удалось сохранить баланс на сервере");
        }
    } catch (e) {
        console.error("Ошибка синхронизации баланса:", e);
    }
}

// --- ПРОВЕРКА АВТОРИЗАЦИИ ПРИ ЗАГРУЗКЕ ---
async function checkAuth() {
    try {
        const res = await fetch('/api/user');
        const data = await res.json();

        if (data.loggedIn) {
            currentUser = data;
            balance = data.balance;
            updateBalance();
            
            const profileNickname = qs('.profile-nickname');
            if (profileNickname) profileNickname.textContent = data.username;
            
            const profileAvatar = qs('.profile-avatar');
            if (profileAvatar) profileAvatar.src = data.avatar;
            
            const miniAvatar = qs('.mini-avatar');
            if (miniAvatar) miniAvatar.src = data.avatar;

            const steamBtn = $('steam-login-btn');
            if (steamBtn) {
                steamBtn.textContent = 'Выйти';
                steamBtn.href = '/auth/logout';
                steamBtn.style.background = '#d32f2f';
                steamBtn.style.borderColor = '#d32f2f';
            }
        }
    } catch (e) {
        console.error("Ошибка проверки авторизации:", e);
    }
}

function playClick() {
    if (!isSoundOn) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(750 + Math.random() * 100, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.02);
    } catch(e) {}
}

function playWinSound() {
    if (!isSoundOn) return;
    try {
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            setTimeout(() => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine'; osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
                osc.connect(gain); gain.connect(audioCtx.destination);
                osc.start(); osc.stop(audioCtx.currentTime + 1);
            }, i * 100);
        });
    } catch(e) {}
}

function playLoseSound() {
    if (!isSoundOn) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } catch(e) {}
}

if (soundToggle) {
    soundToggle.addEventListener('click', () => {
        isSoundOn = !isSoundOn;
        soundToggle.textContent = isSoundOn ? '🔊' : '🔇';
        soundToggle.classList.toggle('muted', !isSoundOn);
    });
}

if (modeToggle) {
    modeToggle.addEventListener('click', () => {
        if (isSpinning) return;
        isFastMode = !isFastMode;
        modeToggle.classList.toggle('fast', isFastMode);
    });
}

function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let isConfirmOpen = false;

function customConfirm(title, text) {
    return new Promise((resolve) => {
        if (!confirmModal) { resolve(confirm(text)); return; }
        if (isConfirmOpen) { resolve(false); return; }
        isConfirmOpen = true;
        confirmTitle.textContent = title;
        confirmText.textContent = text;
        confirmModal.classList.add('show');

        const handleYes = () => {
            confirmModal.classList.remove('show');
            isConfirmOpen = false;
            resolve(true);
            cleanup();
        };
        const handleNo = () => {
            confirmModal.classList.remove('show');
            isConfirmOpen = false;
            resolve(false);
            cleanup();
        };
        const cleanup = () => {
            confirmYes.removeEventListener('click', handleYes);
            confirmNo.removeEventListener('click', handleNo);
        };
        confirmYes.addEventListener('click', handleYes);
        confirmNo.addEventListener('click', handleNo);
    });
}

function getRandomUser() {
    const names = ['PlayerOne', 'DotaKing', 'xX_Slayer_Xx', 'NoobMaster', 'Gaben', 'ArcanHunter', 'TradeBot', 'LuckyGuy', 'SteamUser', 'Shadow'];
    return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000);
}

function getRandomChance() {
    const r = Math.random();
    return Math.floor(r * r * 99) + 1;
}

function addFeedItem(item, chance, user) {
    if (!liveFeedList) return;
    const feedItem = document.createElement('div');
    feedItem.className = 'live-feed-item';
    feedItem.innerHTML = `
        <img src="${item.img}" class="live-feed-img">
        <div class="live-feed-info">
            <div class="live-feed-chance">${chance}%</div>
            <div class="live-feed-user">${user}</div>
        </div>
    `;
    liveFeedList.prepend(feedItem);
    if (liveFeedList.children.length > 20) liveFeedList.lastChild.remove();
}

function generateFakeWin() {
    if (isSpinning) return;
    addFeedItem(ARCANAS[Math.floor(Math.random() * ARCANAS.length)], getRandomChance(), getRandomUser());
}

function startLiveFeed() {
    for (let i = 0; i < 5; i++) setTimeout(() => generateFakeWin(), i * 200);
    setInterval(() => generateFakeWin(), 3000 + Math.random() * 3000);
}

function updateBalance() {
    if (balanceEl) balanceEl.textContent = balance.toFixed(2) + ' ₽';
}

function createItemCard(item, type = 'upgrade') {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.id = item.id;
    card.dataset.type = type;
    card.innerHTML = `
        <img src="${item.img}" class="item-img">
        <div class="item-name" title="${item.name}">${item.name}</div>
        <div class="item-price">${item.price.toFixed(2)} ₽</div>
    `;
    card.addEventListener('click', () => {
        if (isSpinning) return;
        if (type === 'inventory') {
            selectedInventoryItem = item;
            updateUpgradeCalc();
            highlightSelected('inventory', item.id);
            updateSlots();
        } else if (type === 'upgrade') {
            selectedUpgradeItem = item;
            updateUpgradeCalc();
            highlightSelected('upgrade', item.id);
            updateSlots();
        } else if (type === 'market') {
            buyItem(item);
        }
    });
    return card;
}

function highlightSelected(type, id) {
    let grid = type === 'inventory' ? inventoryGrid : upgradeGrid;
    if (!grid) return;
    grid.querySelectorAll('.item-card').forEach(c => {
        c.style.borderColor = '#333';
        c.style.boxShadow = 'none';
    });
    const selected = grid.querySelector(`[data-id="${id}"]`);
    if (selected) {
        selected.style.borderColor = '#ff5722';
        selected.style.boxShadow = '0 0 10px rgba(255, 87, 34, 0.5)';
    }
}

function updateSlots() {
    if (!slotLeft || !slotRight) return;
    if (selectedInventoryItem) {
        slotLeft.classList.add('active');
        slotLeftContent.classList.remove('hidden');
        slotLeftImg.src = selectedInventoryItem.img;
        slotLeftName.textContent = selectedInventoryItem.name;
        slotLeftPrice.textContent = selectedInventoryItem.price.toFixed(2) + ' ₽';
    } else {
        slotLeft.classList.remove('active');
        slotLeftContent.classList.add('hidden');
    }
    if (selectedUpgradeItem) {
        slotRight.classList.add('active');
        slotRightContent.classList.remove('hidden');
        slotRightImg.src = selectedUpgradeItem.img;
        slotRightName.textContent = selectedUpgradeItem.name;
        slotRightPrice.textContent = selectedUpgradeItem.price.toFixed(2) + ' ₽';
    } else {
        slotRight.classList.remove('active');
        slotRightContent.classList.add('hidden');
    }
}

function renderInventory() {
    if (!inventoryGrid) return;
    inventoryGrid.innerHTML = '';
    if (inventory.length === 0) {
        inventoryGrid.innerHTML = '<div class="empty-message">Ваш инвентарь пуст</div>';
        return;
    }
    inventory.forEach(item => inventoryGrid.appendChild(createItemCard(item, 'inventory')));
}

function renderMarket() {
    if (!marketGrid) return;
    marketGrid.innerHTML = '';
    ARCANAS.forEach(item => {
        const card = createItemCard(item, 'market');
        card.querySelector('.item-price').style.color = '#4caf50';
        marketGrid.appendChild(card);
    });
}

function renderUpgrade() {
    if (!upgradeGrid) return;
    upgradeGrid.innerHTML = '';
    ARCANAS.forEach(item => upgradeGrid.appendChild(createItemCard(item, 'upgrade')));
}

function renderProfile() {
    if (bestDropEl) bestDropEl.textContent = bestDrop;
    if (steamWithdrawnEl) steamWithdrawnEl.textContent = steamWithdrawn.toFixed(2) + ' ₽';
    if (profileInventoryGrid) {
        profileInventoryGrid.innerHTML = '';
        if (inventory.length === 0) {
            profileInventoryGrid.innerHTML = '<div class="empty-message">Ваш инвентарь пуст</div>';
        } else {
            inventory.forEach(item => {
                const card = document.createElement('div');
                card.className = 'profile-item-card';
                card.innerHTML = `
                    <img src="${item.img}" class="profile-item-img">
                    <div class="profile-item-name">${item.name}</div>
                    <div class="profile-item-price">${item.price.toFixed(2)} ₽</div>
                    <div class="item-hover-actions">
                        <button class="btn-action btn-steam" data-action="steam">🚂</button>
                        <button class="btn-action btn-sell" data-action="sell" data-id="${item.id}">💰</button>
                    </div>
                `;
                card.querySelector('[data-action="steam"]').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showToast('Попробуйте позже', 'info');
                });
                card.querySelector('[data-action="sell"]').addEventListener('click', (e) => {
                    e.stopPropagation();
                    sellSingleItem(item.id);
                });
                profileInventoryGrid.appendChild(card);
            });
        }
    }
    if (historyList) {
        historyList.innerHTML = '';
        if (upgradeHistory.length === 0) {
            historyList.innerHTML = '<div class="empty-message">История пуста</div>';
        } else {
            upgradeHistory.forEach(rec => {
                const div = document.createElement('div');
                div.className = 'history-record';
                div.innerHTML = `
                    <div class="history-side">
                        <img src="${rec.from.img}">
                        <div class="h-name">${rec.from.name}</div>
                    </div>
                    <div class="history-arrow">➜</div>
                    <div class="history-side">
                        <img src="${rec.to.img}">
                        <div class="h-name">${rec.to.name}</div>
                    </div>
                    <div class="history-result-bar ${rec.win ? 'win' : 'lose'}">
                        <span>${rec.chance.toFixed(2)}% ШАНС</span>
                        <span>${rec.win ? 'ВЫИГРЫШ' : 'ПРОИГРЫШ'}</span>
                    </div>
                `;
                historyList.appendChild(div);
            });
        }
    }
}

function sellSingleItem(id) {
    if (isConfirmOpen) return;
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    customConfirm('Продажа', `Продать ${item.name} за ${(item.price * 0.85).toFixed(2)} ₽?`).then(confirmed => {
        if (confirmed) {
            const stillExists = inventory.find(i => i.id === id);
            if (!stillExists) return;
            balance += item.price * 0.85;
            updateBalance();
            syncBalance(balance);
            inventory = inventory.filter(i => i.id !== id);
            renderInventory();
            renderProfile();
            showToast(`Предмет продан за ${(item.price * 0.85).toFixed(2)} ₽`, 'success');
        }
    });
}

function updateUpgradeCalc() {
    if (selectedInventoryItem && selectedUpgradeItem) {
        let chance = (selectedInventoryItem.price / selectedUpgradeItem.price) * 100;
        if (chance > 99) chance = 99;
        if (chance < 1) chance = 1;
        currentChance = chance;
        updateWheelUI();
        if (centerSubtext) centerSubtext.textContent = 'твой шанс';
    } else {
        currentChance = 50;
        updateWheelUI();
        if (centerSubtext) centerSubtext.textContent = 'средний шанс';
    }
}

function updateWheelUI() {
    if (wheelBg) wheelBg.style.setProperty('--chance', currentChance);
    if (centerText) centerText.textContent = currentChance.toFixed(2) + '%';
    if (chanceFill) chanceFill.style.width = currentChance + '%';
}

function spinWheel() {
    if (isSpinning) return;
    if (!selectedInventoryItem) { showToast('Сначала выберите предмет из своего инвентаря!', 'error'); return; }
    if (!selectedUpgradeItem) { showToast('Выберите предмет, который хотите получить!', 'error'); return; }
    try { if (audioCtx.state === 'suspended') audioCtx.resume(); } catch(e) {}

    isSpinning = true;
    if (spinBtn) spinBtn.disabled = true;
    if (centerText) { centerText.textContent = "КРУТИМ..."; centerText.style.color = "#fff"; }

    const roll = Math.random() * 100;
    const isWin = roll <= currentChance;

    const extraSpins = 5 * 360;
    let targetAngle = isWin ? Math.random() * (currentChance * 3.6) : (currentChance * 3.6) + Math.random() * (360 - currentChance * 3.6);

    const finalRotation = extraSpins + targetAngle;
    const duration = isFastMode ? 4000 : 8000;
    const startTime = performance.now();
    let lastTickAngle = 0;
    const clickStep = 35;

    function getAngleAtTime(elapsed) {
        const p = Math.min(elapsed / duration, 1);
        let p1x = 0.4, p1y = 0.0, p2x = 0.2, p2y = 1;
        if (isFastMode) { p1x = 0.25; p1y = 0.8; p2x = 0.25; p2y = 1; }
        let t = p;
        for (let i = 0; i < 5; i++) {
            const x = 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
            const dx = 3 * (1 - t) * (1 - t) * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
            if (Math.abs(dx) < 1e-6) break;
            t -= (x - p) / dx;
            t = Math.max(0, Math.min(1, t));
        }
        const y = 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
        return finalRotation * y;
    }

    function animateArrow(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentRotation = getAngleAtTime(elapsed);
        if (arrow) arrow.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg)`;

        if (Math.abs(currentRotation - lastTickAngle) >= clickStep) {
            playClick();
            lastTickAngle = currentRotation;
        }

        if (progress < 1) {
            requestAnimationFrame(animateArrow);
        } else {
            isSpinning = false;
            if (spinBtn) spinBtn.disabled = false;

            const wonItem = selectedUpgradeItem;
            const lostItem = selectedInventoryItem;

            upgradeHistory.unshift({ from: lostItem, to: wonItem, chance: currentChance, win: isWin });
            if (upgradeHistory.length > 50) upgradeHistory.pop();

            if (isWin) {
                if (centerText) { centerText.textContent = "ПОБЕДА!"; centerText.style.color = "#d32f2f"; }
                inventory.push(wonItem);
                inventory = inventory.filter(i => i.id !== lostItem.id);
                if (wonItem.price > (inventory.find(i => i.name === bestDrop)?.price || 0)) bestDrop = wonItem.name;
                showToast(`Вы выиграли ${wonItem.name}!`, 'success');
                playWinSound();
                addFeedItem(wonItem, currentChance.toFixed(2), 'ВЫ');
            } else {
                if (centerText) { centerText.textContent = "ПРОИГРЫШ"; centerText.style.color = "#888"; }
                inventory = inventory.filter(i => i.id !== lostItem.id);
                showToast('Вы проиграли. Предмет сгорел.', 'error');
                playLoseSound();
            }

            selectedInventoryItem = null;
            selectedUpgradeItem = null;
            renderInventory();
            updateUpgradeCalc();
            updateSlots();

            setTimeout(() => {
                if (centerText) { centerText.textContent = currentChance.toFixed(2) + '%'; centerText.style.color = '#fff'; }
                if (centerSubtext) centerSubtext.textContent = 'средний шанс';
            }, 2000);
        }
    }
    requestAnimationFrame(animateArrow);
}

async function buyItem(item) {
    if (balance < item.price) { showToast('Недостаточно средств! Пополните баланс.', 'error'); return; }
    const confirmed = await customConfirm('Покупка', `Купить ${item.name} за ${item.price.toFixed(2)} ₽?`);
    if (confirmed) {
        balance -= item.price;
        updateBalance();
        syncBalance(balance);
        inventory.push({...item});
        renderInventory();
        showToast('Предмет куплен!', 'success');
    }
}

async function sellAll() {
    if (inventory.length === 0) { showToast('Инвентарь пуст.', 'info'); return; }
    const confirmed = await customConfirm('Продажа', 'Вы уверены, что хотите продать ВСЕ предметы?');
    if (confirmed) {
        let total = 0;
        inventory.forEach(item => total += item.price * 0.85);
        balance += total;
        inventory = [];
        updateBalance();
        syncBalance(balance);
        renderInventory();
        renderProfile();
        showToast(`Все предметы проданы за ${total.toFixed(2)} ₽`, 'success');
    }
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabContents.forEach(content => content.classList.remove('active'));
        const target = $(`tab-${tabId}`);
        if (target) target.classList.add('active');
        if (tabId === 'market') renderMarket();
    });
});

qsa('.profile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        qsa('.profile-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        qsa('.profile-tab-content').forEach(c => c.classList.remove('active'));
        const target = $(`ptab-${btn.dataset.ptab}`);
        if (target) target.classList.add('active');
    });
});

// --- НОВЫЙ ОБРАБОТЧИК КНОПКИ "ПОПОЛНИТЬ" ---
const depositBtn = qs('.btn-deposit');
if (depositBtn) depositBtn.addEventListener('click', () => {
    showToast('Пополнение временно недоступно. Попробуйте позже.', 'info');
});

// Модальное окно пополнения больше не открывается, но код для него можно оставить на будущее
const depositCancel = $('deposit-cancel');
if (depositCancel) depositCancel.addEventListener('click', () => { if (modalDeposit) modalDeposit.classList.remove('show'); });
const depositConfirm = $('deposit-confirm');
if (depositConfirm) depositConfirm.addEventListener('click', () => {
    // Эта функция больше не активна, так как кнопка "Пополнить" не открывает модалку
    showToast('Пополнение временно недоступно.', 'info');
    if (modalDeposit) modalDeposit.classList.remove('show');
});

const sellAllBtn = $('btn-sell-all');
if (sellAllBtn) sellAllBtn.addEventListener('click', sellAll);
if (spinBtn) spinBtn.addEventListener('click', spinWheel);
if (profileBtn) profileBtn.addEventListener('click', () => { renderProfile(); if (profileModal) profileModal.classList.add('show'); });
if (closeProfileBtn) closeProfileBtn.addEventListener('click', () => { if (profileModal) profileModal.classList.remove('show'); });

qsa('.percent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (isSpinning) return;
        currentChance = parseFloat(btn.dataset.percent);
        updateWheelUI();
        if (centerSubtext) centerSubtext.textContent = 'выбранный шанс';
    });
});

// --- ИНИЦИАЛИЗАЦИЯ ---
function init() {
    checkAuth();
    updateBalance();
    renderInventory();
    renderUpgrade();
    renderMarket();
    updateWheelUI();
    updateSlots();
    startLiveFeed();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'auth') {
        showToast('Ошибка входа через Steam. Попробуйте снова.', 'error');
    }
}
init();