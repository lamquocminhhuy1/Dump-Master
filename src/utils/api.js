const API_URL = '/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const api = {
    // Auth
    login: async (username, password) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    register: async (username, password) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    getMe: async () => {
        const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
        if (!res.ok) return null;
        const data = await res.json();
        return data.user;
    },

    // Dumps
    getDumps: async (type = 'my', search = '', category = '') => {
        const query = new URLSearchParams({ type });
        if (search) query.append('search', search);
        if (category && category !== 'All') query.append('category', category);

        const res = await fetch(`${API_URL}/dumps?${query.toString()}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    saveDump: async (name, questions, isPublic, timeLimit, showAnswerImmediately, category) => {
        const res = await fetch(`${API_URL}/dumps`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, questions, isPublic, timeLimit, showAnswerImmediately, category })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    updateDump: async (id, name, questions, isPublic, timeLimit, showAnswerImmediately, category) => {
        const res = await fetch(`${API_URL}/dumps/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name, questions, isPublic, timeLimit, showAnswerImmediately, category })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    deleteDump: async (id) => {
        const res = await fetch(`${API_URL}/dumps/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error);
        }
    },

    exportDump: async (id, dumpName) => {
        const res = await fetch(`${API_URL}/dumps/${id}/export`, {
            headers: getHeaders()
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error);
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dumpName}_questions.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    importDump: async (id, file, action = null) => {
        const formData = new FormData();
        formData.append('file', file);
        if (action) formData.append('action', action);

        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/dumps/${id}/import`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    // Profile
    updateProfile: async (formData) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/users/me`, {
            method: 'PUT',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
                // Content-Type is not set for FormData, browser sets it with boundary
            },
            body: formData
        });

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            if (!res.ok) throw new Error(data.error || 'Update failed');
            return data;
        } catch (error) {
            console.error("API Error:", text, error);
            throw new Error(`Server error: ${res.status} ${res.statusText}`);
        }
    },

    changePassword: async () => {
        throw new Error('Password change is disabled');
    },

    // History
    getHistory: async (search = '') => {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`${API_URL}/history${query}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    saveAttempt: async (dumpId, dumpName, score, total, answers) => {
        const res = await fetch(`${API_URL}/history`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ dumpId, dumpName, score, total, answers })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    // Admin - User Management
    getAllUsers: async () => {
        const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    updateUserRole: async (userId, role) => {
        const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    deleteUser: async (id) => {
        const res = await fetch(`${API_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error);
        }
    },

    // Admin - Category Management
    getCategories: async () => {
        const res = await fetch(`${API_URL}/admin/categories`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    createCategory: async (code, name, description) => {
        const res = await fetch(`${API_URL}/admin/categories`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ code, name, description })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    updateCategory: async (id, code, name, description) => {
        const res = await fetch(`${API_URL}/admin/categories/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ code, name, description })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    deleteCategory: async (id) => {
        const res = await fetch(`${API_URL}/admin/categories/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error);
        }
    },

    // Admin - Dump Management
    getAllDumps: async (search = '', category = '', owner = '') => {
        const query = new URLSearchParams();
        if (search) query.append('search', search);
        if (category && category !== 'All') query.append('category', category);
        if (owner) query.append('owner', owner);

        const res = await fetch(`${API_URL}/admin/dumps?${query.toString()}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    // Admin - Statistics
    getAdminStats: async () => {
        const res = await fetch(`${API_URL}/admin/stats`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    }
};
