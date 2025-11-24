import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Users, Plus, Send, Shield, Search, Settings, User } from 'lucide-react';

const GroupsPage = () => {
  const [groups, setGroups] = useState({ owned: [], member: [] });
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteUser, setInviteUser] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [message, setMessage] = useState('');
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [newRole, setNewRole] = useState({ name: '', canCreate: false, canRead: true, canUpdate: false, canDelete: false });
  const [activeTab, setActiveTab] = useState('overview');
  const [groupSearch, setGroupSearch] = useState('');

  const load = async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
      setMessage('');
    } catch (e) {
      setMessage(e.message.includes('<') ? 'Failed to load groups. Is backend running on 3000?' : e.message);
    }
    try {
      const summaries = await api.getGroupSummaries();
      setList(summaries);
    } catch (e) {
      // Do not block page if summaries endpoint is unavailable
      console.warn('Group summaries unavailable:', e.message);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedGroup) return;
      try {
        const [r, m] = await Promise.all([
          api.getGroupRoles(selectedGroup.id),
          api.getGroupMembers(selectedGroup.id)
        ]);
        setRoles(r);
        setMembers(m);
      } catch (e) {
        setMessage(e.message);
      }
    };
    loadDetails();
  }, [selectedGroup]);

  const handleCreate = async () => {
    if (!name) { setMessage('Group name is required'); return; }
    try {
      await api.createGroup(name, description);
      setName('');
      setDescription('');
      setShowCreateModal(false);
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleEdit = async () => {
    if (!selectedGroup) return;
    if (!name) { setMessage('Group name is required'); return; }
    try {
      await api.updateGroup(selectedGroup.id, name, description);
      setShowEditModal(false);
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleInvite = async () => {
    if (!selectedGroup) return;
    try {
      const res = await api.inviteToGroup(selectedGroup.id, inviteUser || '');
      const token = res.token;
      if (token) {
        const link = `${window.location.origin}/invite/${token}`;
        setInviteLink(link);
        setMessage('Invite link generated');
      } else {
        setMessage(res.message || 'User added to group');
      }
      setInviteUser('');
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleCreateRole = async () => {
    if (!selectedGroup || !newRole.name) return;
    try {
      const created = await api.createGroupRole(selectedGroup.id, newRole);
      setRoles(prev => [...prev, created]);
      setNewRole({ name: '', canCreate: false, canRead: true, canUpdate: false, canDelete: false });
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleUpdateRole = async (role) => {
    try {
      const updated = await api.updateGroupRole(selectedGroup.id, role.id, role);
      setRoles(prev => prev.map(r => r.id === role.id ? updated : r));
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await api.deleteGroupRole(selectedGroup.id, roleId);
      setRoles(prev => prev.filter(r => r.id !== roleId));
    } catch (e) {
      setMessage(e.message);
    }
  };

  const handleMemberRoleChange = async (memberId, roleId) => {
    try {
      await api.updateGroupMemberRole(selectedGroup.id, memberId, roleId);
      setMembers(prev => prev.map(m => m.User.id === memberId ? { ...m, GroupRoleId: roleId, GroupRole: roles.find(r => r.id === roleId) } : m));
    } catch (e) {
      setMessage(e.message);
    }
  };

  const filteredOwned = groups.owned.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
  const filteredMember = groups.member.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
  const filteredList = list.filter(g => {
    const q = groupSearch.toLowerCase();
    return (
      (g.name || '').toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q) ||
      (g.owner || '').toLowerCase().includes(q)
    );
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const total = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(total, startIndex + pageSize);
  const pageRows = filteredList.slice(startIndex, endIndex);

  return (
    <div className="content-wrapper">
      <div className="section-header" style={{ marginTop: '1.5rem' }}>
        <div className="section-title"><Users size={20}/> Groups</div>
        <div className="input-wrapper" style={{ width: '320px' }}>
          <Search size={18} style={{ color: 'var(--text-secondary)' }} />
          <input type="text" placeholder="Search groups" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
        </div>
      </div>

      {message && <div className="error-message" style={{ margin: '0 2rem 1rem' }}>{message}</div>}

      <div className="groups-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
        <aside className="dump-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem' }}>Your Groups</h3>
            <button className="add-button" onClick={() => { setName(''); setDescription(''); setShowCreateModal(true); }}><Plus size={16}/> Create</button>
          </div>
          <ul style={{ marginTop: '1rem' }}>
            {filteredOwned.map(g => (
              <li key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <button className="btn-text" onClick={() => { setSelectedGroup(g); setActiveTab('overview'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16}/> {g.name}
                </button>
                <button className="control-button secondary" onClick={() => { setSelectedGroup(g); setActiveTab('members'); }}>Manage</button>
              </li>
            ))}
            {filteredOwned.length === 0 && (
              <li style={{ color: 'var(--text-secondary)' }}>No groups yet</li>
            )}
          </ul>
          <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>Member Of</h3>
          <ul style={{ marginTop: '0.5rem' }}>
            {filteredMember.map(g => (
              <li key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}><User size={14}/> {g.name}</li>
            ))}
            {filteredMember.length === 0 && (
              <li style={{ color: 'var(--text-secondary)' }}>No memberships</li>
            )}
          </ul>
          <div className="dump-card" style={{ padding: '1rem', marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Create Group</h4>
            <button className="control-button primary" onClick={() => { setName(''); setDescription(''); setShowCreateModal(true); }}><Plus size={16}/> New</button>
          </div>
        </aside>

        <main className="dump-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="tab-button active">All</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <span>{startIndex + 1} to {endIndex} of {total}</span>
              <button className="icon-btn" onClick={() => setPage(1)} disabled={page === 1}><span>⏮</span></button>
              <button className="icon-btn" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><span>◀</span></button>
              <button className="icon-btn" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}><span>▶</span></button>
              <button className="icon-btn" onClick={() => setPage(totalPages)} disabled={page >= totalPages}><span>⏭</span></button>
            </div>
          </div>

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Owner</th>
                  <th>Members</th>
                  <th>Updated</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
                <tr className="filter-row">
                  <th><input type="text" placeholder="Search" value={groupSearch} onChange={e => { setGroupSearch(e.target.value); setPage(1); }} /></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(g => (
                  <tr key={g.id}>
                    <td>
                      <button className="btn-text" onClick={() => { setSelectedGroup({ id: g.id, name: g.name }); setActiveTab('overview'); }}>{g.name}</button>
                    </td>
                    <td>{g.description || ''}</td>
                    <td>{g.owner || ''}</td>
                    <td>{g.memberCount}</td>
                    <td>{new Date(g.updatedAt).toLocaleString()}</td>
                    <td>{g.type}</td>
                    <td>
                      <button className="control-button secondary" onClick={() => { setSelectedGroup({ id: g.id, name: g.name }); setActiveTab('members'); }}>Manage</button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={7} style={{ color: 'var(--text-secondary)' }}>No groups found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {!selectedGroup ? (
            <div style={{ color: 'var(--text-secondary)' }}>Select a group to manage its members and roles.</div>
          ) : (
            <>
              <div className="section-header" style={{ marginBottom: '1rem' }}>
                <div className="section-title" style={{ fontSize: '1.25rem' }}><Shield size={18}/> {selectedGroup.name}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                  <button className={`tab-button ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
                  <button className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>Roles</button>
                  <button className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
                </div>
              </div>

              {activeTab === 'overview' && (
                <div style={{ color: 'var(--text-secondary)' }}>
                  Manage your group. Use tabs to invite members and configure permissions.
                </div>
              )}

              {activeTab === 'members' && (
                <div>
                  <div className="form-group">
                    <label>Invite</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div className="input-wrapper" style={{ flex: 1 }}>
                        <User size={18} style={{ color: 'var(--text-secondary)' }} />
                        <input type="text" value={inviteUser} onChange={e => setInviteUser(e.target.value)} placeholder="optional username" />
                      </div>
                      <button className="control-button primary" onClick={handleInvite}><Send size={16}/> Generate Link</button>
                    </div>
                    {inviteLink && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="text" readOnly value={inviteLink} style={{ flex: 1 }} />
                        <button className="control-button secondary" onClick={() => { navigator.clipboard.writeText(inviteLink); }}>Copy</button>
                      </div>
                    )}
                  </div>

                  <h3 style={{ marginTop: '1rem' }}>Members</h3>
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                    {members.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16}/> {m.User.username}</span>
                        <select value={m.GroupRole?.id || m.GroupRoleId || ''} onChange={(e) => handleMemberRoleChange(m.User.id, e.target.value)}>
                          <option value="">No Role</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <div style={{ color: 'var(--text-secondary)' }}>No members yet</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'roles' && (
                <div>
                  <div className="dump-card" style={{ padding: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Add Role</h4>
                    <div className="form-group">
                      <label>Name</label>
                      <input type="text" value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                      <label><input type="checkbox" checked={newRole.canCreate} onChange={e => setNewRole({ ...newRole, canCreate: e.target.checked })} /> Create</label>
                      <label><input type="checkbox" checked={newRole.canRead} onChange={e => setNewRole({ ...newRole, canRead: e.target.checked })} /> Read</label>
                      <label><input type="checkbox" checked={newRole.canUpdate} onChange={e => setNewRole({ ...newRole, canUpdate: e.target.checked })} /> Update</label>
                      <label><input type="checkbox" checked={newRole.canDelete} onChange={e => setNewRole({ ...newRole, canDelete: e.target.checked })} /> Delete</label>
                    </div>
                    <button className="control-button primary" onClick={handleCreateRole}><Plus size={16}/> Add Role</button>
                  </div>
                  <ul style={{ marginTop: '1rem' }}>
                    {roles.map(r => (
                      <li key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <input type="text" value={r.name} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, name: e.target.value } : x))} />
                          <button className="icon-btn delete" onClick={() => handleDeleteRole(r.id)}>Delete</button>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                          <label><input type="checkbox" checked={!!r.canCreate} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, canCreate: e.target.checked } : x))} /> Create</label>
                          <label><input type="checkbox" checked={!!r.canRead} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, canRead: e.target.checked } : x))} /> Read</label>
                          <label><input type="checkbox" checked={!!r.canUpdate} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, canUpdate: e.target.checked } : x))} /> Update</label>
                          <label><input type="checkbox" checked={!!r.canDelete} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, canDelete: e.target.checked } : x))} /> Delete</label>
                          <button className="control-button secondary" onClick={() => handleUpdateRole(r)}>Save</button>
                        </div>
                      </li>
                    ))}
                    {roles.length === 0 && (
                      <li style={{ color: 'var(--text-secondary)' }}>No roles yet</li>
                    )}
                  </ul>
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <button className="control-button secondary" onClick={() => { setName(selectedGroup.name || ''); setDescription(''); setShowEditModal(true); }}><Settings size={16}/> Edit Group</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Group</h3>
            {message && (
              <div className="error-message" style={{ marginBottom: '0.5rem' }}>{message}</div>
            )}
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="control-button secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="control-button primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Group</h3>
            {message && (
              <div className="error-message" style={{ marginBottom: '0.5rem' }}>{message}</div>
            )}
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="control-button secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="control-button primary" onClick={handleEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
