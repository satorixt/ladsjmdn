const express = require('express');
const session = require('express-session');
const SteamAuth = require('node-steam-openid');
const { createClient } = require('@libsql/client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ TURSO ---
const db = createClient({
    url: "libsql://steamid-satorixt.aws-eu-north-1.turso.io", 
    authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM1NjEwODksImlkIjoiMDFhMTk4OGYtMGMwMS03ODc3LWI5MGYtYjUzMTQ1ZmRlNDEwIiwia2lkIjoiM2ZNV2xUSldmYTF1TE5POUtRcXFtckJ3X19VYjhqQ3Njb25XUUQ4WWhJQSIsInJpZCI6IjFiZWZiODIzLWQyM2QtNGYzYy1iNzQ4LTBiMzM4YmEzZjhlMyJ9.Zo0WYLFQuUd3V95OsfQ5SjaWbrTxrAYZqiQygDQFFObPCAHeuCwU8857sh_8A9OwnoWAQDrPvEaVM6i0knYzAg"
});

app.use(express.json()); // Чтобы сервер понимал JSON с фронтенда

// --- 2. НАСТРОЙКА СЕССИЙ ---
app.use(session({
    secret: 'updota-secret-key-2026', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// --- 3. НАСТРОЙКА STEAM ---
const steam = new SteamAuth({
    realm: "http://localhost:3000", 
    returnUrl: "http://localhost:3000/auth/steam/authenticate", 
    apiKey: "C2AB38B992893DE1C1E037C90D4F52D9" 
});

app.use(express.static(path.join(__dirname, 'public')));

// --- 4. ФУНКЦИИ РАБОТЫ С БАЗОЙ ---

// Получить баланс (если игрока нет, создать с балансом 0)
async function getBalance(steamId) {
    try {
        const result = await db.execute({
            sql: "SELECT balance FROM users WHERE steam_id = ?",
            args: [steamId]
        });

        if (result.rows.length > 0) {
            return result.rows[0].balance;
        } else {
            await db.execute({
                sql: "INSERT INTO users (steam_id, balance) VALUES (?, ?)",
                args: [steamId, 0.0] // <-- НОВЫЙ ИГРОК ПОЛУЧАЕТ 0
            });
            return 0.0;
        }
    } catch (error) {
        console.error("Ошибка базы данных:", error);
        return 0;
    }
}

// Обновить баланс в базе
async function updateBalanceInDB(steamId, newBalance) {
    try {
        await db.execute({
            sql: "UPDATE users SET balance = ? WHERE steam_id = ?",
            args: [newBalance, steamId]
        });
        return true;
    } catch (error) {
        console.error("Ошибка обновления баланса:", error);
        return false;
    }
}

// --- 5. РОУТЫ ---

// Вход через Steam
app.get('/auth/steam', async (req, res) => {
    try {
        const redirectUrl = await steam.getRedirectUrl();
        return res.redirect(redirectUrl);
    } catch (error) {
        console.error(error);
        res.redirect('/?error=1');
    }
});

// Возврат от Steam
app.get('/auth/steam/authenticate', async (req, res) => {
    try {
        const user = await steam.authenticate(req);
        req.session.steamId = user.steamid;
        req.session.username = user.username;
        req.session.avatar = user.avatar;
        
        // Получаем баланс из базы (для нового игрока это 0)
        req.session.balance = await getBalance(user.steamid);
        
        console.log(`Вошёл: ${user.username} | Баланс: ${req.session.balance}`);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.redirect('/?error=auth');
    }
});

// API для фронтенда
app.get('/api/user', (req, res) => {
    if (req.session.steamId) {
        res.json({
            loggedIn: true,
            steamId: req.session.steamId,
            username: req.session.username,
            avatar: req.session.avatar,
            balance: req.session.balance
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Эндпоинт для обновления баланса с фронтенда (когда покупаешь/продаёшь)
app.post('/api/update-balance', async (req, res) => {
    if (!req.session.steamId) {
        return res.status(401).json({ error: 'Не авторизован' });
    }

    const { newBalance } = req.body;
    if (typeof newBalance !== 'number' || newBalance < 0) {
        return res.status(400).json({ error: 'Некорректный баланс' });
    }

    const success = await updateBalanceInDB(req.session.steamId, newBalance);
    if (success) {
        req.session.balance = newBalance; // Обновляем сессию
        res.json({ success: true, balance: newBalance });
    } else {
        res.status(500).json({ error: 'Ошибка базы данных' });
    }
});

app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});