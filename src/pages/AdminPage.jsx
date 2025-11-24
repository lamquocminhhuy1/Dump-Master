import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Users, FileText, Trash2, Shield, BarChart3, Tag, Edit, UserCog, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [dumps, setDumps] = useState([]);
    const [groups, setGroups] = useState([]);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [managingGroup, setManagingGroup] = useState(null);
    const [groupMembers, setGroupMembers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Category modal state
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ code: '', name: '', description: '', isPublic: true, groupId: '' });

    // Dump filters
    const [dumpSearch, setDumpSearch] = useState('');
    const [dumpCategory, setDumpCategory] = useState('All');
    const [questions, setQuestions] = useState([]);
    const [questionSearch, setQuestionSearch] = useState('');
    const [questionGroup, setQuestionGroup] = useState('');
    const [questionExact, setQuestionExact] = useState(false);

    const [userSearch, setUserSearch] = useState('');
    const [userRole, setUserRole] = useState('All');
    const [categorySearch, setCategorySearch] = useState('');
    const [groupSearch, setGroupSearch] = useState('');
    const [groupStatus, setGroupStatus] = useState('All');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyRows, setHistoryRows] = useState([]);
    const [historyDate, setHistoryDate] = useState('');

    const navigate = useNavigate();
    const { t } = useI18n();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'dumps') {
            loadDumps();
        } else if (activeTab === 'groups') {
            loadGroups();
        } else if (activeTab === 'categories') {
            if (groups.length === 0) loadGroups();
        } else if (activeTab === 'questions') {
            loadQuestions();
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

    const loadGroups = async () => {
        try {
            const groupsData = await api.getAllGroups();
            setGroups(groupsData);
        } catch (err) {
            console.error("Failed to load groups", err);
        }
    };

    const openManageGroup = async (group) => {
        setManagingGroup(group);
        try {
            const members = await api.getGroupMembers(group.id);
            setGroupMembers(members);
            setShowGroupModal(true);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleMemberRoleUpdate = async (userId, roleId) => {
        if (!managingGroup) return;
        try {
            await api.updateGroupMemberRole(managingGroup.id, userId, roleId);
            setGroupMembers(prev => prev.map(m => m.User.id === userId ? { ...m, GroupRoleId: roleId, GroupRole: { ...(m.GroupRole || {}), id: roleId } } : m));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!managingGroup) return;
        if (!window.confirm('Remove this member from the group?')) return;
        try {
            await api.removeGroupMember(managingGroup.id, userId);
            setGroupMembers(prev => prev.filter(m => m.User.id !== userId));
        } catch (err) {
            alert(err.message);
        }
    };

    const loadQuestions = async () => {
        try {
            const rows = await api.getAllQuestions(questionSearch, questionGroup, questionExact);
            setQuestions(rows);
        } catch (err) {
            console.error("Failed to load questions", err);
        }
    };

    const openHistoryForDate = async (date) => {
        try {
            const rows = await api.getAdminHistory(date);
            setHistoryRows(rows);
            setHistoryDate(date);
            setShowHistoryModal(true);
        } catch (err) {
            alert(err.message);
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
        setCategoryForm({ code: '', name: '', description: '', isPublic: true, groupId: '' });
        setShowCategoryModal(true);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setCategoryForm({ code: category.code, name: category.name, description: category.description || '', isPublic: !!category.isPublic, groupId: category.GroupId || '' });
        setShowCategoryModal(true);
    };

    const handleSaveCategory = async () => {
        try {
            if (editingCategory) {
                await api.updateCategory(editingCategory.id, categoryForm.code, categoryForm.name, categoryForm.description, categoryForm.isPublic, categoryForm.groupId || null);
            } else {
                await api.createCategory(categoryForm.code, categoryForm.name, categoryForm.description, categoryForm.isPublic, categoryForm.groupId || null);
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

    const handleDeleteGroup = async (id) => {
        if (window.confirm('Delete this group?')) {
            try {
                await api.deleteGroup(id);
                setGroups(groups.filter(g => g.id !== id));
            } catch (err) {
                alert(err.message);
            }
        }
    };

    if (loading) return <div className="admin-container"><p>{t('common.loading')}</p></div>;

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h2><Shield size={28} /> {t('admin.title')}</h2>
                <div className="admin-tabs">
                    <button className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                        <BarChart3 size={18} /> {t('admin.tabs.analytics')}
                    </button>
                    <button className={`tab-button ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                        <Users size={18} /> {t('admin.tabs.users')}
                    </button>
                    <button className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
                        <Tag size={18} /> {t('admin.tabs.categories')}
                    </button>
                    <button className={`tab-button ${activeTab === 'dumps' ? 'active' : ''}`} onClick={() => setActiveTab('dumps')}>
                        <FileText size={18} /> {t('admin.tabs.dumps')}
                    </button>
                    <button className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
                        <Users size={18} /> {t('admin.tabs.groups')}
                    </button>
                    <button className={`tab-button ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>
                        <FileText size={18} /> {t('admin.tabs.questions')}
                    </button>
                </div>
            </div>

            <div className="admin-content">
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && stats && (
                    <div className="dashboard-stats">
                        <h3>{t('admin.dashboard.platformOverview')}</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <Users size={32} className="stat-icon" />
                                <div className="stat-value">{stats.overview.totalUsers}</div>
                                <div className="stat-label">{t('admin.dashboard.totalUsers')}</div>
                            </div>
                            <div className="stat-card">
                                <FileText size={32} className="stat-icon" />
                                <div className="stat-value">{stats.overview.totalDumps}</div>
                                <div className="stat-label">{t('admin.dashboard.totalDumps')}</div>
                            </div>
                            <div className="stat-card">
                                <BarChart3 size={32} className="stat-icon" />
                                <div className="stat-value">{stats.overview.totalQuizzes}</div>
                                <div className="stat-label">{t('admin.dashboard.quizzesTaken')}</div>
                            </div>
                            <div className="stat-card">
                                <Shield size={32} className="stat-icon" />
                                <div className="stat-value">{stats.overview.avgScore}%</div>
                                <div className="stat-label">{t('admin.dashboard.avgScore')}</div>
                            </div>
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>{t('admin.dashboard.popularDumps')}</h3>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{t('admin.popular.dumpName')}</th>
                                        <th>{t('admin.popular.attempts')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.popularDumps.map((dump, idx) => (
                                        <tr key={idx} onClick={() => { setActiveTab('dumps'); setDumpSearch(dump.dumpName); }} style={{ cursor: 'pointer' }}>
                                            <td>{dump.dumpName}</td>
                                            <td>{dump.attemptCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>{t('admin.dashboard.dumpsByCategory')}</h3>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{t('admin.common.category')}</th>
                                        <th>{t('admin.common.count')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.dumpsByCategory.map((cat, idx) => (
                                        <tr key={idx} onClick={() => { setActiveTab('dumps'); setDumpCategory(cat.category || 'Uncategorized'); }} style={{ cursor: 'pointer' }}>
                                            <td>{cat.category || 'Uncategorized'}</td>
                                            <td>{cat.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>{t('admin.dashboard.quizzesByDate')}</h3>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{t('admin.common.date')}</th>
                                        <th>{t('admin.common.quizzes')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(stats.quizzesByDate || {}).map(([date, count]) => (
                                        <tr key={date} onClick={() => openHistoryForDate(date)} style={{ cursor: 'pointer' }}>
                                            <td>{date}</td>
                                            <td>{count}</td>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>{t('admin.users.management')} ({users.length} users)</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="input-wrapper" style={{ width: '280px' }}>
                                    <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                                    <input type="text" placeholder={t('admin.users.searchUsername')} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                                </div>
                                <select value={userRole} onChange={(e) => setUserRole(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                    <option>{t('admin.common.all')}</option>
                                    <option>user</option>
                                    <option>admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{t('admin.table.username')}</th>
                                        <th>{t('admin.table.role')}</th>
                                        <th>{t('admin.table.dumps')}</th>
                                        <th>{t('admin.table.quizzes')}</th>
                                        <th>{t('admin.table.avgScore')}</th>
                                        <th>{t('admin.table.joined')}</th>
                                        <th>{t('admin.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.filter(u => {
                                        const q = userSearch.toLowerCase();
                                        const roleOk = userRole === 'All' || u.role === userRole;
                                        return roleOk && (!q || (u.username || '').toLowerCase().includes(q));
                                    }).map(user => (
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
                                                    title={t('admin.action.deleteUser')}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <h3>{t('admin.categories.management')} ({t('admin.categories.count', { count: categories.length })})</h3>
                                <div className="input-wrapper" style={{ width: '320px' }}>
                                    <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                                    <input type="text" placeholder={t('admin.categories.searchPlaceholder')} value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} />
                                </div>
                            </div>
                            <button className="add-button" onClick={handleAddCategory}>
                                <Plus size={20} /> {t('admin.categories.add')}
                            </button>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{t('admin.categories.code')}</th>
                                        <th>{t('admin.categories.name')}</th>
                                        <th>{t('admin.categories.description')}</th>
                                        <th>{t('admin.categories.public')}</th>
                                        <th>{t('admin.categories.group')}</th>
                                        <th>{t('admin.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.filter(cat => {
                                        const q = categorySearch.toLowerCase();
                                        return !q || (cat.code || '').toLowerCase().includes(q) || (cat.name || '').toLowerCase().includes(q) || (cat.description || '').toLowerCase().includes(q);
                                    }).map(cat => (
                                        <tr key={cat.id}>
                                            <td><strong>{cat.code}</strong></td>
                                            <td>{cat.name}</td>
                                            <td>{cat.description || '-'}</td>
                                            <td>{cat.isPublic ? t('admin.common.yes') : t('admin.common.no')}</td>
                                            <td>{groups.find(g => g.id === cat.GroupId)?.name || '-'}</td>
                                            <td>
                                                <button className="icon-btn" onClick={() => handleEditCategory(cat)} title={t('admin.action.edit')}>
                                                    <Edit size={16} />
                                                </button>
                                                <button className="icon-btn delete" onClick={() => handleDeleteCategory(cat.id)} title={t('admin.action.delete')}>
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
                            <div className="input-wrapper" style={{ flex: 1 }}>
                                <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                                <input type="text" placeholder="Search dumps" value={dumpSearch} onChange={(e) => setDumpSearch(e.target.value)} />
                            </div>
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
                                        <th>{t('admin.dumps.name')}</th>
                                        <th>{t('admin.dumps.category')}</th>
                                        <th>{t('admin.dumps.owner')}</th>
                                        <th>{t('admin.dumps.questions')}</th>
                                        <th>{t('admin.dumps.public')}</th>
                                        <th>{t('admin.dumps.created')}</th>
                                        <th>{t('admin.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dumps.map(dump => (
                                        <tr key={dump.id}>
                                            <td>{dump.name}</td>
                                            <td>{dump.category}</td>
                                            <td>{dump.User?.username || 'Unknown'}</td>
                                            <td>{dump.questions.length}</td>
                                            <td>{dump.isPublic ? t('admin.common.yes') : t('admin.common.no')}</td>
                                            <td>{new Date(dump.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => navigate(`/dump/${dump.id}/edit`, { state: { dump } })}
                                                    title={t('admin.action.edit')}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className="icon-btn delete"
                                                    onClick={() => handleDeleteDump(dump.id)}
                                                    title={t('admin.action.delete')}
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

                {activeTab === 'groups' && (
                    <div className="dumps-management">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>{t('admin.groups.all')} ({groups.length})</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="input-wrapper" style={{ width: '320px' }}>
                                    <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                                    <input type="text" placeholder={t('admin.groups.search')} value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
                                </div>
                                <select value={groupStatus} onChange={(e) => setGroupStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                    <option>{t('admin.common.all')}</option>
                                    <option>{t('admin.groups.active')}</option>
                                    <option>{t('admin.groups.inactive')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{t('admin.dumps.name')}</th>
                                        <th>{t('admin.dumps.owner')}</th>
                                        <th>{t('admin.groups.status')}</th>
                                        <th>{t('admin.groups.manage')}</th>
                                        <th>{t('admin.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groups.filter(g => {
                                        const q = groupSearch.toLowerCase();
                                        const statusOk = groupStatus === 'All' || (groupStatus === 'Active' ? g.isActive : !g.isActive);
                                        const textOk = !q || (g.name || '').toLowerCase().includes(q) || (g.User?.username || '').toLowerCase().includes(q);
                                        return statusOk && textOk;
                                    }).map(g => (
                                        <tr key={g.id}>
                                            <td>{g.name}</td>
                                            <td>{g.User?.username || '-'}</td>
                                            <td>
                                                <span className={`status-badge ${g.isActive ? 'active' : 'inactive'}`}>{g.isActive ? t('admin.groups.active') : t('admin.groups.inactive')}</span>
                                            </td>
                                            <td>
                                                <button className="icon-btn" onClick={() => openManageGroup(g)} title={t('admin.groups.manage')}>
                                                    <Edit size={16} />
                                                </button>
                                            </td>
                                            <td>
                                                <button className="icon-btn delete" onClick={() => handleDeleteGroup(g.id)} title={t('admin.action.delete')}>
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

                {activeTab === 'questions' && (
                    <div className="dumps-management">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>{t('admin.questions.all')} ({questions.length})</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div className="input-wrapper" style={{ minWidth: '280px' }}>
                                    <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                                    <input type="text" placeholder={t('admin.questions.search')} value={questionSearch} onChange={(e) => setQuestionSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadQuestions(); }} />
                                </div>
                                <select value={questionGroup} onChange={(e) => setQuestionGroup(e.target.value)} style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)'
                                }}>
                                    <option value="">{t('admin.questions.allGroups')}</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" checked={questionExact} onChange={(e) => setQuestionExact(e.target.checked)} />
                                    {t('admin.questions.exactMatch')}
                                </label>
                                <button className="control-button" onClick={loadQuestions}>{t('admin.questions.filter')}</button>
                                <button className="control-button secondary" onClick={async () => {
                                    try {
                                        const blob = await api.exportAdminQuestions(questionSearch, questionGroup, questionExact);
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'admin_questions.xlsx';
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                        window.URL.revokeObjectURL(url);
                                    } catch (err) {
                                        alert(err.message);
                                    }
                                }}>{t('admin.questions.export')}</button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{t('admin.questions.question')}</th>
                                        <th>{t('admin.questions.dump')}</th>
                                        <th>{t('admin.questions.owner')}</th>
                                        <th>{t('admin.questions.groups')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {questions.map(q => (
                                        <tr key={q.id}>
                                            <td>{q.text}</td>
                                            <td>{q.Dump?.name || '-'}</td>
                                            <td>{q.Dump?.User?.username || '-'}</td>
                                            <td>{(q.Dump?.Groups || []).map(g => g.name).join(', ') || '-'}</td>
                                            
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
                        <h3>{editingCategory ? t('admin.categories.edit') : t('admin.categories.add')}</h3>
                        <div className="form-group">
                            <label>{t('admin.categories.code')}</label>
                                <input
                                    type="text"
                                    value={categoryForm.code}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                                placeholder={t('admin.categories.placeholder.code')}
                                />
                        </div>
                        <div className="form-group">
                            <label>{t('admin.categories.name')}</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                placeholder={t('admin.categories.placeholder.name')}
                                />
                        </div>
                        <div className="form-group">
                            <label>{t('admin.categories.description')}</label>
                                <textarea
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                placeholder={t('admin.categories.placeholder.description')}
                                    rows={3}
                                />
                        </div>
                        <div className="form-group">
                            <label>{t('admin.categories.public')}</label>
                            <select
                                value={categoryForm.isPublic ? 'true' : 'false'}
                                onChange={(e) => setCategoryForm({ ...categoryForm, isPublic: e.target.value === 'true' })}
                            >
                                <option value="true">{t('admin.common.yes')}</option>
                                <option value="false">{t('admin.common.no')}</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{t('admin.categories.groupOptional')}</label>
                            <select
                                value={categoryForm.groupId || ''}
                                onChange={(e) => setCategoryForm({ ...categoryForm, groupId: e.target.value })}
                            >
                                <option value="">{t('admin.common.none')}</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="control-button secondary" onClick={() => setShowCategoryModal(false)}>
                                {t('admin.common.cancel')}
                            </button>
                            <button className="control-button primary" onClick={handleSaveCategory}>
                                {editingCategory ? t('admin.common.update') : t('common.create')}
                            </button>
                        </div>
                    </div>
            </div>
        )}

        {/* Manage Group Modal */}
        {showGroupModal && managingGroup && (
            <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>{t('admin.manageGroup.title')}: {managingGroup.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{t('admin.manageGroup.status')}</span>
                            <span className={`status-badge ${managingGroup.isActive ? 'active' : 'inactive'}`}>{managingGroup.isActive ? t('admin.groups.active') : t('admin.groups.inactive')}</span>
                            <button className="control-button" onClick={async () => {
                                try {
                                    await api.updateGroupActive(managingGroup.id, !managingGroup.isActive);
                                    setManagingGroup({ ...managingGroup, isActive: !managingGroup.isActive });
                                    setGroups(prev => prev.map(x => x.id === managingGroup.id ? { ...x, isActive: !managingGroup.isActive } : x));
                                } catch (err) {
                                    alert(err.message);
                                }
                            }}>{managingGroup.isActive ? t('admin.manageGroup.setInactive') : t('admin.manageGroup.setActive')}</button>
                        </div>
                    </div>
                    <div className="table-container" style={{ marginTop: '1rem' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>{t('admin.manageGroup.member')}</th>
                                    <th>{t('admin.manageGroup.role')}</th>
                                    <th>{t('admin.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupMembers.map(m => (
                                    <tr key={m.id}>
                                        <td>{m.User?.username}</td>
                                        <td>
                                            <select value={m.GroupRoleId || ''} onChange={(e) => handleMemberRoleUpdate(m.User.id, e.target.value)}>
                                                {(m.GroupRole ? [m.GroupRole] : []).map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                                {/* Fallback: minimal options if role list not loaded */}
                                                {!m.GroupRole && (
                                                    <>
                                                        <option value="">Member</option>
                                                    </>
                                                )}
                                            </select>
                                        </td>
                                        <td>
                                            <button className="icon-btn delete" onClick={() => handleRemoveMember(m.User.id)} title="Remove">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="control-button secondary" onClick={() => setShowGroupModal(false)}>{t('admin.common.close')}</button>
                    </div>
                </div>
            </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
            <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>{t('admin.history.titleForDate', { date: historyDate })}</h3>
                    <div className="table-container" style={{ marginTop: '1rem' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Dump</th>
                                    <th>Score</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyRows.map(row => (
                                    <tr key={row.id}>
                                        <td>{row.User?.username || '-'}</td>
                                        <td>{row.Dump?.name || row.dumpName || '-'}</td>
                                        <td>{Math.round((row.score / row.total) * 100)}%</td>
                                        <td>{new Date(row.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="control-button secondary" onClick={() => setShowHistoryModal(false)}>{t('admin.common.close')}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
);
};

export default AdminPage;
