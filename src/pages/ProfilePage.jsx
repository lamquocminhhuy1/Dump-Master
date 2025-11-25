import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, API_HOST } from '../utils/api';
import { User, Upload, Save, AlertCircle, Mail, MapPin, Lock, Eye, EyeOff, Shield, CheckCircle } from 'lucide-react';

 

const ProfilePage = () => {
    const { user, updateUser, checkUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'password'
    
    // Profile fields
    const [bio, setBio] = useState(user?.bio || '');
    const [email, setEmail] = useState(user?.email || '');
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [location, setLocation] = useState(user?.location || '');
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(user?.avatar ? `${API_HOST}${user.avatar}` : null);
    
    // Password fields
    
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        // Update form fields when user data changes
        if (user) {
            setBio(user.bio || '');
            setEmail(user.email || '');
            setDisplayName(user.displayName || '');
            setLocation(user.location || '');
            setPreview(user.avatar ? `${API_HOST}${user.avatar}` : null);
        }
    }, [user]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('bio', bio);
            formData.append('email', email);
            formData.append('displayName', displayName);
            formData.append('location', location);
            if (avatar) {
                formData.append('avatar', avatar);
            }

            const result = await api.updateProfile(formData);
            
            // Update user context if available
            if (result.user && updateUser) {
                updateUser(result.user);
            } else if (checkUser) {
                // Fallback: refresh user data
                await checkUser();
            }
            
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setAvatar(null); // Clear avatar state after upload
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    

    return (
        <div className="profile-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Profile Settings</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage your account information and preferences</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '2rem',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderBottom: activeTab === 'profile' ? '2px solid var(--primary-color)' : '2px solid transparent',
                        marginBottom: '-1px'
                    }}
                >
                    <User size={18} style={{ marginRight: '8px' }} />
                    Profile Information
                </button>
                {/* Password change disabled */}
            </div>

            {/* Message Display */}
            {message.text && (
                <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    background: message.type === 'success' 
                        ? 'rgba(34, 197, 94, 0.1)' 
                        : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
                    color: message.type === 'success' ? '#22c55e' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    {message.type === 'success' ? (
                        <CheckCircle size={20} />
                    ) : (
                        <AlertCircle size={20} />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Profile Information Tab */}
            {activeTab === 'profile' && (
                <div className="dump-card" style={{ padding: '2rem' }}>
                    <form onSubmit={handleProfileSubmit}>
                        {/* Avatar Section */}
                        <div className="form-group" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <label style={{ marginBottom: '1rem', display: 'block' }}>Profile Picture</label>
                            <div style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                margin: '0 auto 1rem',
                                border: '4px solid var(--border-color)',
                                position: 'relative',
                                background: 'var(--primary-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}>
                                {preview ? (
                                    <img src={preview} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={64} color="white" />
                                )}
                            </div>

                            <label htmlFor="avatar-upload" className="control-button secondary" style={{ 
                                display: 'inline-flex', 
                                padding: '8px 16px', 
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}>
                                <Upload size={16} style={{ marginRight: '8px' }} /> Change Avatar
                            </label>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {/* Account Info Section */}
                        <div style={{ 
                            background: 'var(--bg-body)', 
                            padding: '1.5rem', 
                            borderRadius: '8px', 
                            marginBottom: '2rem',
                            border: '1px solid var(--border-color)'
                        }}>
                            <h3 style={{ 
                                fontSize: '1.1rem', 
                                fontWeight: '600', 
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Shield size={18} />
                                Account Information
                            </h3>
                            
                            <div className="form-group">
                                <label>Username</label>
                                <div className="input-wrapper" style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                                    <User size={20} style={{ color: 'var(--text-secondary)' }} />
                                    <input type="text" value={user?.username || ''} disabled />
                                </div>
                                <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                    Username cannot be changed
                                </small>
                            </div>

                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>Role</label>
                                <div className="input-wrapper" style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                                    <Shield size={20} style={{ color: 'var(--text-secondary)' }} />
                                    <input type="text" value={user?.role === 'admin' ? 'Administrator' : 'User'} disabled />
                                </div>
                            </div>
                        </div>

                        {/* Profile Fields */}
                        <div className="form-group">
                            <label>Display Name</label>
                            <div className="input-wrapper">
                                <User size={20} style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Enter your display name"
                                    maxLength={50}
                                />
                            </div>
                            <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                This name will be displayed to other users (optional)
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <div className="input-wrapper">
                                <Mail size={20} style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                />
                            </div>
                            <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                Your email address (optional)
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <div className="input-wrapper">
                                <MapPin size={20} style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="City, Country"
                                    maxLength={100}
                                />
                            </div>
                            <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                Your location (optional)
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Bio</label>
                            <div className="input-wrapper">
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell us about yourself..."
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        width: '100%',
                                        outline: 'none',
                                        fontSize: '1rem',
                                        minHeight: '100px',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        padding: '0'
                                    }}
                                    maxLength={500}
                                />
                            </div>
                            <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                {bio.length}/500 characters
                            </small>
                        </div>

                        <button type="submit" className="control-button primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                            {loading ? 'Saving...' : 'Save Profile Changes'} 
                            <Save size={18} style={{ marginLeft: '8px' }} />
                        </button>
                    </form>
                </div>
            )}

            {/* Password change disabled */}
        </div>
    );
};

export default ProfilePage;
