import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { Users, Plus, Send, Shield, Search, Settings, User } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

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
  const [showManageModal, setShowManageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [newRole, setNewRole] = useState({ name: '', canCreate: false, canRead: true, canUpdate: false, canDelete: false });
  const [activeTab, setActiveTab] = useState('overview');
  const [groupSearch, setGroupSearch] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    if (showManageModal && activeTab === 'overview' && selectedGroup) {
      setName(selectedGroup.name || '');
      setDescription(selectedGroup.description || '');
    }
  }, [showManageModal, activeTab, selectedGroup]);

  const load = async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
      setMessage('');
    } catch (e) {
      setMessage(e.message.includes('<') ? t('groups.failedToLoadGroups') : e.message);
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
    if (!name) { setMessage(t('groups.nameRequired')); return; }
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
    if (!name) { setMessage(t('groups.nameRequired')); return; }
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
        setMessage(t('groups.inviteLinkGenerated'));
      } else {
        setMessage(res.message || t('groups.userAddedToGroup'));
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
        <div className="section-title"><Users size={20}/> {t('groups.title')}</div>
        <div className="input-wrapper" style={{ width: '320px' }}>
          <Search size={18} style={{ color: 'var(--text-secondary)' }} />
          <input type="text" placeholder={t('groups.searchPlaceholder')} value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
        </div>
      </div>

      {message && <div className="error-message" style={{ margin: '0 2rem 1rem' }}>{message}</div>}

      <div className="groups-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
        <aside className="dump-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem' }}>{t('groups.yourGroups')}</h3>
            <button
              className="add-button"
              onClick={() => { setName(''); setDescription(''); setShowCreateModal(true); }}
              aria-label={t('groups.createGroup')}
            >
              <Plus size={16}/> {t('groups.new')}
            </button>
          </div>
          <ul style={{ marginTop: '1rem' }}>
            {filteredOwned.map(g => (
              <li key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <button className="btn-text" onClick={() => { setSelectedGroup(g); setActiveTab('overview'); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16}/> {g.name}
                </button>
                <button className="control-button secondary" onClick={() => { setSelectedGroup(g); setActiveTab('members'); setShowManageModal(true); }}>{t('groups.manage')}</button>
              </li>
            ))}
            {filteredOwned.length === 0 && (
              <li style={{ color: 'var(--text-secondary)' }}>{t('groups.noGroups')}</li>
            )}
          </ul>
          <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>{t('groups.memberOf')}</h3>
          <ul style={{ marginTop: '0.5rem' }}>
            {filteredMember.map(g => (
              <li key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}><User size={14}/> {g.name}</li>
            ))}
            {filteredMember.length === 0 && (
              <li style={{ color: 'var(--text-secondary)' }}>{t('groups.noMemberships')}</li>
            )}
          </ul>
          {/* Removed duplicate create group section to avoid two CTAs */}
        </aside>

        <main className="dump-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="tab-button active">{t('groups.all')}</button>
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
                  <th>{t('groups.table.name')}</th>
                  <th>{t('groups.table.description')}</th>
                  <th>{t('groups.table.owner')}</th>
                  <th>{t('groups.table.members')}</th>
                  <th>{t('groups.table.updated')}</th>
                  <th>{t('groups.table.type')}</th>
                  <th>{t('groups.table.actions')}</th>
                </tr>
                <tr className="filter-row">
                  <th><input type="text" placeholder={t('groups.table.search')} value={groupSearch} onChange={e => { setGroupSearch(e.target.value); setPage(1); }} /></th>
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
                      <button className="control-button secondary" onClick={() => { setSelectedGroup({ id: g.id, name: g.name }); setActiveTab('members'); setShowManageModal(true); }}>{t('groups.manage')}</button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={7} style={{ color: 'var(--text-secondary)' }}>{t('groups.table.noGroupsFound')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {!selectedGroup && (
            <div style={{ color: 'var(--text-secondary)' }}>{t('groups.selectHint')}</div>
          )}
        </main>
      </div>
  {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('groups.modal.create.title')}</h3>
            {message && (
              <div className="error-message" style={{ marginBottom: '0.5rem' }}>{message}</div>
            )}
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="control-button secondary" onClick={() => setShowCreateModal(false)}>{t('admin.common.cancel')}</button>
              <button className="control-button primary" onClick={handleCreate}>{t('common.create')}</button>
            </div>
          </div>
        </div>
      )}

  {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('groups.modal.edit.title')}</h3>
            {message && (
              <div className="error-message" style={{ marginBottom: '0.5rem' }}>{message}</div>
            )}
            <div className="form-group">
              <label>{t('common.name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('common.description')}</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="control-button secondary" onClick={() => setShowEditModal(false)}>{t('admin.common.cancel')}</button>
              <button className="control-button primary" onClick={handleEdit}>{t('admin.common.update')}</button>
            </div>
          </div>
        </div>
      )}

      {showManageModal && selectedGroup && (
        <div className="modal-overlay manage-modal" onClick={() => setShowManageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <div className="section-title" style={{ fontSize: '1.25rem' }}><Shield size={18}/> {selectedGroup.name}</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>{t('groups.tabs.overview')}</button>
                <button className={`tab-button ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>{t('groups.tabs.members')}</button>
                <button className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>{t('groups.tabs.roles')}</button>
                <button className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>{t('groups.tabs.settings')}</button>
              </div>
            </div>
            <div className="manage-modal-body">
            {activeTab === 'overview' && (
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{t('groups.overviewHelp')}</div>
                <div className="dump-card" style={{ padding: '1rem' }}>
                  <div className="form-group">
                    <label>{t('common.name')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('common.description')}</label>
                    <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="control-button secondary" onClick={() => { setName(selectedGroup.name || ''); setDescription(selectedGroup.description || ''); }}>{t('admin.common.cancel')}</button>
                    <button className="control-button primary" onClick={handleEdit}>{t('admin.common.update')}</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div>
                <div className="form-group">
                  <label>{t('groups.invite')}</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div className="input-wrapper" style={{ flex: 1 }}>
                      <User size={18} style={{ color: 'var(--text-secondary)' }} />
                      <input type="text" value={inviteUser} onChange={e => setInviteUser(e.target.value)} placeholder={t('groups.optionalUsername')} />
                    </div>
                    <button className="control-button primary" onClick={handleInvite}><Send size={16}/> {t('groups.generateLink')}</button>
                  </div>
                  {inviteLink && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="text" readOnly value={inviteLink} style={{ flex: 1 }} />
                      <button className="control-button secondary" onClick={() => { navigator.clipboard.writeText(inviteLink); }}>{t('groups.copy')}</button>
                    </div>
                  )}
                </div>

                <h3 style={{ marginTop: '1rem' }}>{t('groups.tabs.members')}</h3>
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16}/> {m.User.username}</span>
                       <select value={m.GroupRole?.id || m.GroupRoleId || ''} onChange={(e) => handleMemberRoleChange(m.User.id, e.target.value)}>
                         <option value="">{t('groups.role.noRole')}</option>
                         {roles.map(r => (
                           <option key={r.id} value={r.id}>{r.name}</option>
                         ))}
                       </select>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <div style={{ color: 'var(--text-secondary)' }}>{t('groups.noMembersYet')}</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'roles' && (
              <div>
                <div className="dump-card" style={{ padding: '1rem' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>{t('groups.addRole')}</h4>
                  <div className="form-group">
                    <label>{t('groups.role.name')}</label>
                    <input type="text" value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                    <label><input type="checkbox" checked={newRole.canCreate} onChange={e => setNewRole({ ...newRole, canCreate: e.target.checked })} /> {t('groups.role.create')}</label>
                    <label><input type="checkbox" checked={newRole.canRead} onChange={e => setNewRole({ ...newRole, canRead: e.target.checked })} /> {t('groups.role.read')}</label>
                    <label><input type="checkbox" checked={newRole.canUpdate} onChange={e => setNewRole({ ...newRole, canUpdate: e.target.checked })} /> {t('groups.role.update')}</label>
                    <label><input type="checkbox" checked={newRole.canDelete} onChange={e => setNewRole({ ...newRole, canDelete: e.target.checked })} /> {t('groups.role.delete')}</label>
                  </div>
                  <button className="control-button primary" onClick={handleCreateRole}><Plus size={16}/> {t('groups.addRole')}</button>
                </div>
                <ul style={{ marginTop: '1rem' }}>
                  {roles.map(r => (
                    <li key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <input type="text" value={r.name} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, name: e.target.value } : x))} />
                        <button className="icon-btn delete" onClick={() => handleDeleteRole(r.id)}>{t('groups.role.delete')}</button>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <label><input type="checkbox" checked={!!r.canCreate} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, canCreate: e.target.checked } : x))} /> {t('groups.role.create')}</label>
                        <label><input type="checkbox" checked={!!r.canRead} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, canRead: e.target.checked } : x))} /> {t('groups.role.read')}</label>
                        <label><input type="checkbox" checked={!!r.canUpdate} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, canUpdate: e.target.checked } : x))} /> {t('groups.role.update')}</label>
                        <label><input type="checkbox" checked={!!r.canDelete} onChange={e => setRoles(prev => prev.map(x => x.id === r.id ? { ...x, canDelete: e.target.checked } : x))} /> {t('groups.role.delete')}</label>
                        <button className="control-button secondary" onClick={() => handleUpdateRole(r)}>{t('groups.role.save')}</button>
                      </div>
                    </li>
                  ))}
                  {roles.length === 0 && (
                    <li style={{ color: 'var(--text-secondary)' }}>{t('groups.role.noRolesYet')}</li>
                  )}
                </ul>
              </div>
            )}

            {activeTab === 'settings' && (
              <div style={{ color: 'var(--text-secondary)' }}>{t('groups.settings.placeholder') || ''}</div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
