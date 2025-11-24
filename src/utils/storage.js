const STORAGE_KEYS = {
    USERS: 'dumps_app_users',
    CURRENT_USER: 'dumps_app_current_user',
    DUMPS: 'dumps_app_dumps',
    HISTORY: 'dumps_app_history'
};

// Helper to get data
const get = (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

// Helper to set data
const set = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
};

export const storage = {
    // User Management
    getUsers: () => get(STORAGE_KEYS.USERS),

    getAllUsers: () => get(STORAGE_KEYS.USERS), // Alias for clarity

    registerUser: (username, password, role = 'user') => {
        const users = get(STORAGE_KEYS.USERS);
        if (users.find(u => u.username === username)) {
            throw new Error('Username already exists');
        }
        const newUser = { id: Date.now().toString(), username, password, role };
        users.push(newUser);
        set(STORAGE_KEYS.USERS, users);
        return newUser;
    },

    loginUser: (username, password) => {
        const users = get(STORAGE_KEYS.USERS);
        // Seed admin if not exists
        if (!users.find(u => u.role === 'admin')) {
            const admin = { id: 'admin', username: 'admin', password: 'admin', role: 'admin' };
            users.push(admin);
            set(STORAGE_KEYS.USERS, users);
        }

        // Re-fetch users after potential seed
        const allUsers = get(STORAGE_KEYS.USERS);
        const user = allUsers.find(u => u.username === username && u.password === password);

        if (!user) {
            throw new Error('Invalid credentials');
        }
        return user;
    },

    deleteUser: (userId) => {
        const users = get(STORAGE_KEYS.USERS);
        const filtered = users.filter(u => u.id !== userId);
        set(STORAGE_KEYS.USERS, filtered);

        // Also clean up their dumps and history?
        // For simplicity, let's leave them or we'd need to iterate everything.
        // Let's just delete the user for now.
    },

    // Dump Management
    getDumps: (userId) => {
        const dumps = get(STORAGE_KEYS.DUMPS);
        return dumps.filter(d => d.userId === userId);
    },

    getAllDumps: () => {
        return get(STORAGE_KEYS.DUMPS);
    },

    saveDump: (userId, name, questions) => {
        const dumps = get(STORAGE_KEYS.DUMPS);
        const newDump = {
            id: Date.now().toString(),
            userId,
            name,
            questions,
            createdAt: new Date().toISOString()
        };
        dumps.push(newDump);
        set(STORAGE_KEYS.DUMPS, dumps);
        return newDump;
    },

    deleteDump: (dumpId) => {
        const dumps = get(STORAGE_KEYS.DUMPS);
        const filtered = dumps.filter(d => d.id !== dumpId);
        set(STORAGE_KEYS.DUMPS, filtered);
    },

    // History Management
    getHistory: (userId) => {
        const history = get(STORAGE_KEYS.HISTORY);
        return history.filter(h => h.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    saveAttempt: (userId, dumpId, dumpName, score, total) => {
        const history = get(STORAGE_KEYS.HISTORY);
        const newAttempt = {
            id: Date.now().toString(),
            userId,
            dumpId,
            dumpName,
            score,
            total,
            date: new Date().toISOString()
        };
        history.push(newAttempt);
        set(STORAGE_KEYS.HISTORY, history);
        return newAttempt;
    }
};
