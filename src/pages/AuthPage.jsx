import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, register, user } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please fill in all fields');
            return;
        }

        const result = isLogin
            ? await login(username, password)
            : await register(username, password);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="auth-container animated-auth">
            <div className="auth-card animated-card">
                {/* Simple Pepe Avatar */}
                <div className="avatar-container">
                    <div className="avatar-wrapper">
                        <img
                            src="/pepe_avatar.png"
                            alt="Pepe Avatar"
                            className="avatar-image"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="avatar-fallback" style={{ display: 'none' }}>🐸</div>
                    </div>
                </div>

                <div className="auth-header">
                    <div className="logo">
                        <BookOpen size={32} />
                        <h1>Dumps Master</h1>
                    </div>
                    <p>{isLogin ? 'Welcome back! Login to continue.' : 'Create an account to start learning.'}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Username</label>
                        <div className="input-wrapper">
                            <User size={20} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="input-wrapper" style={{ position: 'relative' }}>
                            <Lock size={20} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                style={{ position: 'absolute', right: '8px', padding: '4px', background: 'transparent' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="auth-button">
                        {isLogin ? 'Login' : 'Sign Up'} <ArrowRight size={20} />
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button onClick={() => setIsLogin(!isLogin)} className="link-button">
                            {isLogin ? 'Sign Up' : 'Login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
