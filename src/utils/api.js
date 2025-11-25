const isViteDev = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);
const isLocalHost = (typeof window !== 'undefined' && window.location && (/^(localhost|127\.0\.0\.1)$/).test(window.location.hostname));
export const API_URL = (isViteDev || isLocalHost) ? 'http://localhost:3000/api' : '/api';
export const API_HOST = API_URL.replace(/\/api$/, '');

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
    deleteQuestion: async (id) => {
        const res = await fetch(`${API_URL}/admin/questions/${id}`, { method: 'DELETE', headers: getHeaders() });
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

    saveDump: async (name, questions, isPublic, timeLimit, showAnswerImmediately, category, coverImage = '') => {
        const res = await fetch(`${API_URL}/dumps`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, questions, isPublic, timeLimit, showAnswerImmediately, category, coverImage })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/uploads/image`, {
            method: 'POST',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' },
            body: formData
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch {
            throw new Error(text || `Upload failed (HTTP ${res.status})`);
        }
        if (!res.ok) throw new Error(data.error || `Upload failed (HTTP ${res.status})`);
        return data;
    },

  updateDump: async (id, name, questions, isPublic, timeLimit, showAnswerImmediately, category, coverImage = '') => {
        const res = await fetch(`${API_URL}/dumps/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name, questions, isPublic, timeLimit, showAnswerImmediately, category, coverImage })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
  },

  getDumpById: async (id) => {
      const res = await fetch(`${API_URL}/dumps/${id}`, { headers: getHeaders() });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(text); }
      if (!res.ok) throw new Error(data.error || 'Request failed');
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

    createCategory: async (code, name, description, isPublic = true, groupId = null) => {
        const res = await fetch(`${API_URL}/admin/categories`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ code, name, description, isPublic, groupId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    updateCategory: async (id, code, name, description, isPublic, groupId) => {
        const res = await fetch(`${API_URL}/admin/categories/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ code, name, description, isPublic, groupId })
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
    },

    // Groups
    getGroups: async () => {
        const res = await fetch(`${API_URL}/groups`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    getGroupSummaries: async () => {
        const res = await fetch(`${API_URL}/groups/summary`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    createGroup: async (name, description) => {
        const res = await fetch(`${API_URL}/groups`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, description })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    updateGroup: async (groupId, name, description) => {
        const res = await fetch(`${API_URL}/groups/${groupId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ name, description })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    inviteToGroup: async (groupId, inviteeUsername) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/invitations`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ inviteeUsername })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    acceptInvitation: async (token) => {
        const res = await fetch(`${API_URL}/invitations/${token}/accept`, {
            method: 'POST',
            headers: getHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    shareDumpToGroups: async (dumpId, groupIds) => {
        const res = await fetch(`${API_URL}/dumps/${dumpId}/share/groups`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ groupIds })
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { throw new Error(text); }
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    setDumpGroups: async (dumpId, groupIds) => {
        const res = await fetch(`${API_URL}/dumps/${dumpId}/share/groups`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ groupIds })
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { throw new Error(text); }
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    getDumpGroups: async (dumpId) => {
        const res = await fetch(`${API_URL}/dumps/${dumpId}/groups`, { headers: getHeaders() });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { throw new Error(text); }
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    getGroupRoles: async (groupId) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/roles`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    createGroupRole: async (groupId, payload) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/roles`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    updateGroupRole: async (groupId, roleId, payload) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/roles/${roleId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    deleteGroupRole: async (groupId, roleId) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/roles/${roleId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    getGroupMembers: async (groupId) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/members`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    updateGroupMemberRole: async (groupId, userId, roleId) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/members/${userId}/role`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ roleId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    removeGroupMember: async (groupId, userId) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/members/${userId}`, { method: 'DELETE', headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },

    // Admin - Groups
    getAllGroups: async () => {
        const res = await fetch(`${API_URL}/admin/groups`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    deleteGroup: async (id) => {
        const res = await fetch(`${API_URL}/admin/groups/${id}`, { method: 'DELETE', headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    getGroupCategories: async (groupId) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/categories`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    createGroupCategory: async (groupId, code, name, description) => {
        const res = await fetch(`${API_URL}/groups/${groupId}/categories`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ code, name, description })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    getAllQuestions: async (search = '', groupId = '', exact = false) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (groupId) params.append('groupId', groupId);
        if (exact) params.append('exact', '1');
        const res = await fetch(`${API_URL}/admin/questions?${params.toString()}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    exportAdminQuestions: async (search = '', groupId = '', exact = false) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (groupId) params.append('groupId', groupId);
        if (exact) params.append('exact', '1');
        const res = await fetch(`${API_URL}/admin/questions/export?${params.toString()}`, { headers: getHeaders() });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Export failed');
        }
        const blob = await res.blob();
        return blob;
    },
    updateGroupActive: async (id, isActive) => {
        const res = await fetch(`${API_URL}/admin/groups/${id}/active`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ isActive })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    },
    getAdminHistory: async (date = '') => {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        const res = await fetch(`${API_URL}/admin/history?${params.toString()}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    }
};
