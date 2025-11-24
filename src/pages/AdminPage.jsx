import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Users, FileText, Trash2, Shield, BarChart3, Tag, Edit, UserCog, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [dumps, setDumps] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Category modal state
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ code: '', name: '', description: '' });

    // Dump filters
    const [dumpSearch, setDumpSearch] = useState('');
    const [dumpCategory, setDumpCategory] = useState('All');

    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'dumps') {
            loadDumps();
        }
    }, [dumpSearch, dumpCategory, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, categoriesData, statsData] = await Promise.all([
                api.getAllUsers(),
                api.getCategories(),
                api.getAdminStats()
            ]);
            setUsers(usersData);
            setCategories(categoriesData);
            setStats(statsData);
        } catch (err) {
            console.error("Failed to load admin data", err);
            alert("Failed to load admin data: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadDumps = async () => {
        try {
            const dumpsData = await api.getAllDumps(dumpSearch, dumpCategory);
            setDumps(dumpsData);
        } catch (err) {
            console.error("Failed to load dumps", err);
        }
    };

    // User Management
    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.updateUserRole(userId, newRole);
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure? This will delete all their dumps and history.')) {
            try {
                await api.deleteUser(userId);
                setUsers(users.filter(u => u.id !== userId));
            } catch (err) {
                alert(err.message);
            }
        }
    };

    // Category Management
    const handleAddCategory = () => {
        setEditingCategory(null);
        setCategoryForm({ code: '', name: '', description: '' });
        setShowCategoryModal(true);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setCategoryForm({ code: category.code, name: category.name, description: category.description || '' });
        setShowCategoryModal(true);
    };

    const handleSaveCategory = async () => {
        try {
            if (editingCategory) {
                await api.updateCategory(editingCategory.id, categoryForm.code, categoryForm.name, categoryForm.description);
            } else {
                await api.createCategory(categoryForm.code, categoryForm.name, categoryForm.description);
            }
            setShowCategoryModal(false);
            const categoriesData = await api.getCategories();
            setCategories(categoriesData);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (window.confirm('Delete this category? Dumps using it will keep their category string.')) {
            try {
                await api.deleteCategory(id);
                setCategories(categories.filter(c => c.id !== id));
            } catch (err) {
                alert(err.message);
            }
        }
    };

    // Dump Management
    const handleDeleteDump = async (id) => {
        if (window.confirm('Delete this dump permanently?')) {
            try {
                await api.deleteDump(id);
                loadDumps();
            } catch (err) {
                alert(err.message);
            }
        }
    };

    if (loading) return <div className="admin-container"><p>Loading...</p></div>;

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h2><Shield size={28} /> Admin Dashboard</h2>
                <div className="admin-tabs">
                    <button className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                        <BarChart3 size={18} /> Analytics
                    </button>
                    <button className={`tab-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                        <Users size={18} /> Users
                    </button>
                    <button className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
                        <Tag size={18} /> Categories
                    </button>
                    <button className={`tab-button ${activeTab === 'dumps' ? 'active' : ''}`} onClick={() => setActiveTab('dumps')}>
                        <FileText size={18} /> Dumps
                    </button>
                </div>
            </div>

            <div className="admin-content">
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && stats && (
                    <div className="dashboard-stats">
                        <h3>Platform Overview</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <Users size={32} className="stat-icon" />
                                <div className="stat-value">{stats.overview.totalUsers}</div>
                                <div className="stat-label">Total Users</div>
                            </div>
                            <div className="stat-card">
                                <FileText size={32} className="stat-icon" />
                                <div className="stat-value">{stats.overview.totalDumps}</div>
                                <div className="stat-label">Total Dumps</div>
                            </div>
                            <div className="stat-card">
                                <BarChart3 size={32} className="stat-icon" />
                                <div className="stat-value">{stats.overview.totalQuizzes}</div>
                                <div className="stat-label">Quizzes Taken</div>
                            </div>
                            <div className="stat-card">
                                <Shield size={32} className="stat-icon" />
                                <div className="stat-value">{stats.overview.avgScore}%</div>
                                <div className="stat-label">Avg Score</div>
                            </div>
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>Most Popular Dumps</h3>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Dump Name</th>
                                        <th>Attempts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.popularDumps.map((dump, idx) => (
                                        <tr key={idx}>
                                            <td>{dump.dumpName}</td>
                                            <td>{dump.attemptCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>Dumps by Category</h3>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.dumpsByCategory.map((cat, idx) => (
                                        <tr key={idx}>
                                            <td>{cat.category || 'Uncategorized'}</td>
                                            <td>{cat.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="users-management">
                        <h3>User Management ({users.length} users)</h3>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Dumps</th>
                                        <th>Quizzes</th>
                                        <th>Avg Score</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.username}</td>
                                            <td>
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className="role-select"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td>{user.dumpCount}</td>
                                            <td>{user.quizCount}</td>
                                            <td>{user.avgScore}%</td>
                                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="icon-btn delete"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Categories Tab */}
                {activeTab === 'categories' && (
                    <div className="categories-management">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>Category Management ({categories.length} categories)</h3>
                            <button className="add-button" onClick={handleAddCategory}>
                                <Plus size={20} /> Add Category
                            </button>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(cat => (
                                        <tr key={cat.id}>
                                            <td><strong>{cat.code}</strong></td>
                                            <td>{cat.name}</td>
                                            <td>{cat.description || '-'}</td>
                                            <td>
                                                <button className="icon-btn" onClick={() => handleEditCategory(cat)} title="Edit">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="icon-btn delete" onClick={() => handleDeleteCategory(cat.id)} title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Dumps Tab */}
                {activeTab === 'dumps' && (
                    <div className="dumps-management">
                        <h3>All Dumps ({dumps.length})</h3>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Search dumps..."
                                value={dumpSearch}
                                onChange={(e) => setDumpSearch(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <select
                                value={dumpCategory}
                                onChange={(e) => setDumpCategory(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="All">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.code} value={cat.code}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Category</th>
                                        <th>Owner</th>
                                        <th>Questions</th>
                                        <th>Public</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dumps.map(dump => (
                                        <tr key={dump.id}>
                                            <td>{dump.name}</td>
                                            <td>{dump.category}</td>
                                            <td>{dump.User?.username || 'Unknown'}</td>
                                            <td>{dump.questions.length}</td>
                                            <td>{dump.isPublic ? 'Yes' : 'No'}</td>
                                            <td>{new Date(dump.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => navigate(`/dump/${dump.id}/edit`, { state: { dump } })}
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className="icon-btn delete"
                                                    onClick={() => handleDeleteDump(dump.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
                        <div className="form-group">
                            <label>Code (e.g., CSA)</label>
                            <input
                                type="text"
                                value={categoryForm.code}
                                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                                placeholder="CSA"
                            />
                        </div>
                        <div className="form-group">
                            <label>Name</label>
                            <input
                                type="text"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                placeholder="CSA - Certified System Administrator"
                            />
                        </div>
                        <div className="form-group">
                            <label>Description (optional)</label>
                            <textarea
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                placeholder="ServiceNow System Administrator certification"
                                rows={3}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="control-button secondary" onClick={() => setShowCategoryModal(false)}>
                                Cancel
                            </button>
                            <button className="control-button primary" onClick={handleSaveCategory}>
                                {editingCategory ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
