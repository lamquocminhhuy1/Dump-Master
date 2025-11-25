import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { I18nProvider, useI18n } from './context/I18nContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import DumpEditor from './pages/DumpEditor';
import QuizInterface from './components/QuizInterface';
import Results from './components/Results';
import { BookOpen, LayoutDashboard, History, LogOut, Shield, Sun, Moon, User, Settings, Edit } from 'lucide-react';
import GroupsPage from './pages/GroupsPage';
 
import { api, API_HOST } from './utils/api';

 

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/" />;
  return children;
};

// Quiz Wrapper to handle navigation params
const QuizWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dump = location.state?.dump;
  

  if (!dump) return <Navigate to="/" />;

  const finishQuiz = async (score, total, answers) => {
    try {
      await api.saveAttempt(dump.id, dump.name, score, total, answers);
      // Optional: navigate to history or show success
      navigate('/history');
    } catch (err) {
      console.error("Failed to save attempt", err);
      navigate('/');
    }
  };

  const showAnswerImmediately = dump.showAnswerImmediately !== undefined ? dump.showAnswerImmediately : true;

  return (
    <QuizInterface
      questions={dump.questions}
      timeLimit={dump.timeLimit}
      onFinish={finishQuiz}
      showAnswerImmediately={showAnswerImmediately}
    />
  );
};

const ResultsWrapper = () => {
  
  const navigate = useNavigate();
  const { score, total } = location.state || { score: 0, total: 0 };

  return (
    <Results
      score={score}
      total={total}
      onRestart={() => navigate(-1)}
      onNewFile={() => navigate('/')}
    />
  );
};

// Shared Dump Wrapper - for accessing shared dumps via link
const SharedDumpWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [dump, setDump] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSharedDump = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch shared dump - this should work without auth or with public access
        const response = await fetch(`/api/dumps/shared/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(t('errors.shared.dumpNotFoundOrNotShared'));
          } else if (response.status === 403) {
            setError(t('errors.shared.private'));
          } else {
            setError(t('errors.shared.failedToLoad'));
          }
          setLoading(false);
          return;
        }
        
        const dumpData = await response.json();
        if (dumpData.isPublic) {
          setDump(dumpData);
        } else {
          setError(t('errors.shared.private'));
        }
      } catch (err) {
        console.error('Failed to load shared dump:', err);
        setError(err.message || t('errors.shared.failedToLoad'));
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      loadSharedDump();
    } else {
      setError(t('errors.invalidDumpId'));
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div className="loading-spinner">Loading...</div>
          <p style={{ color: 'var(--text-secondary)' }}>{t('errors.loadingSharedQuiz')}</p>
        </div>
      </div>
    );
  }

  if (error || !dump) {
    return (
      <div className="dashboard-container">
        <div className="dump-card" style={{ 
          padding: '2rem', 
          margin: '2rem auto', 
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <div className="error-message" style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            color: '#ef4444',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <strong>{t('common.errorLabel')}</strong> {error || t('errors.dumpNotFound')}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {t('errors.linkInvalidOrDeleted')}
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="control-button primary"
          >
            {t('actions.goDashboard')}
          </button>
        </div>
      </div>
    );
  }

  if (!dump.questions || !Array.isArray(dump.questions) || dump.questions.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dump-card" style={{ 
          padding: '2rem', 
          margin: '2rem auto', 
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <div className="error-message" style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            color: '#ef4444',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <strong>{t('common.errorLabel')}</strong> {t('errors.dumpHasNoQuestions')}
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="control-button primary"
          >
            {t('actions.goDashboard')}
          </button>
        </div>
      </div>
    );
  }

  const finishQuiz = async () => {
    // For shared dumps, we might want to save attempts only if user is logged in
    // For now, just navigate to dashboard
    navigate('/');
  };

  const showAnswerImmediately = dump.showAnswerImmediately !== undefined ? dump.showAnswerImmediately : true;

  return (
    <QuizInterface
      questions={dump.questions}
      timeLimit={dump.timeLimit}
      onFinish={finishQuiz}
      showAnswerImmediately={showAnswerImmediately}
    />
  );
};

// Review Wrapper
const ReviewWrapper = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [dump, setDump] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const answers = location.state?.answers || {};

  useEffect(() => {
    const loadDump = async () => {
      setLoading(true);
      setError('');
      try {
        const found = await api.getDumpById(id);
        if (found) {
          setDump(found);
        } else {
          setError(t('errors.dumpNotFound'));
        }
      } catch (err) {
        console.error('Failed to load dump:', err);
        setError(err.message || t('errors.failedToLoadDump'));
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      loadDump();
    } else {
      setError(t('errors.invalidDumpId'));
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div className="loading-spinner">Loading...</div>
          <p style={{ color: 'var(--text-secondary)' }}>{t('errors.loadingReview')}</p>
        </div>
      </div>
    );
  }

  if (error || !dump) {
    return (
      <div className="dashboard-container">
        <div className="dump-card" style={{ 
          padding: '2rem', 
          margin: '2rem auto', 
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <div className="error-message" style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            color: '#ef4444',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <strong>{t('common.errorLabel')}</strong> {error || t('errors.dumpNotFound')}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {t('errors.reviewDescription')}
          </p>
          <button 
            onClick={() => navigate('/history')} 
            className="control-button primary"
          >
            {t('actions.goBackHistory')}
          </button>
        </div>
      </div>
    );
  }

  // Validate questions exist
  if (!dump.questions || !Array.isArray(dump.questions) || dump.questions.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dump-card" style={{ 
          padding: '2rem', 
          margin: '2rem auto', 
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <div className="error-message" style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            color: '#ef4444',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <strong>{t('common.errorLabel')}</strong> {t('errors.dumpHasNoQuestions')}
          </div>
          <button 
            onClick={() => navigate('/history')} 
            className="control-button primary"
          >
            {t('actions.goBackHistory')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizInterface
      questions={dump.questions}
      timeLimit={0} // No time limit for review
      onFinish={() => navigate('/history')}
      showAnswerImmediately={true} // Always show answers in review
      initialReviewMode={true}
      initialAnswers={answers}
    />
  );
};

const Navigation = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const menuRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    const handleOutside = (e) => {
      if (showDropdown && menuRef.current && !menuRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showDropdown]);

  

  if (!user) return null;

  return (
    <nav className="main-nav">
      <div className="nav-logo">
        <BookOpen size={24} />
        <span>{t('brand.name')}</span>
      </div>
      <div className="nav-links">
        <Link to="/" className="nav-link">
          {t('nav.dashboard')}
        </Link>
        <Link to="/history" className="nav-link">
          {t('nav.history')}
        </Link>
        <Link to="/groups" className="nav-link">
          {t('nav.groups')}
        </Link>
        {user.role === 'admin' && (
          <Link to="/admin" className="nav-link">
            {t('nav.admin')}
          </Link>
        )}

        <button onClick={toggleTheme} className="nav-link icon-only" title={t('nav.toggleTheme')}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <LangToggle />

        <div className="user-menu" ref={menuRef} style={{ position: 'relative' }}>
          <button
            className="nav-link user-toggle"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 0 }}
          >
            {user.avatar ? (
              <img
                src={`${API_HOST}${user.avatar}`}
                alt="Avatar"
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
              />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} color="white" />
              </div>
            )}
          </button>

          {showDropdown && (
            <div className="dropdown-menu" style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '8px',
              minWidth: '180px',
              zIndex: 100,
              marginTop: '12px',
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '600' }}>
                {user.username}
              </div>
              <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', color: 'var(--text-secondary)', textDecoration: 'none', borderRadius: '4px', fontSize: '0.9rem' }}>
                <Settings size={16} /> {t('nav.profile')}
              </Link>
              <button onClick={logout} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', color: '#ef4444', background: 'none', border: 'none', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left', fontSize: '0.9rem' }}>
                <LogOut size={16} /> {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

function AppContent() {
  const { t } = useI18n();
  return (
    <div className="app-container">
      <Navigation />
      <main className="app-content">
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/dump/:id/edit" element={
            <ProtectedRoute>
              <DumpEditor />
            </ProtectedRoute>
          } />
          <Route path="/dump/new" element={
            <ProtectedRoute>
              <DumpEditor />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          } />
          <Route path="/quiz" element={
            <ProtectedRoute>
              <QuizWrapper />
            </ProtectedRoute>
          } />
          <Route path="/results" element={
            <ProtectedRoute>
              <ResultsWrapper />
            </ProtectedRoute>
          } />
          <Route path="/review/:id" element={
            <ProtectedRoute>
              <ReviewWrapper />
            </ProtectedRoute>
          } />
          <Route path="/shared/:id" element={
            <SharedDumpWrapper />
          } />
          <Route path="/groups" element={
            <ProtectedRoute>
              <GroupsPage />
            </ProtectedRoute>
          } />
          <Route path="/invite/:token" element={
            <ProtectedRoute>
              <InvitationAcceptWrapper />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} {t('brand.name')}. {t('footer.built')}</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <I18nProvider>
          <Router>
            <AppContent />
          </Router>
        </I18nProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
const LangToggle = () => {
  const { lang, setLang } = useI18n();
  return (
    <button
      className="nav-link icon-only"
      onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
      title={lang === 'vi' ? 'Tiếng Việt' : 'English'}
      style={{ fontWeight: 700 }}
    >
      {lang === 'vi' ? 'VI' : 'EN'}
    </button>
  );
};
// Invitation Accept Wrapper - join group via token
const InvitationAcceptWrapper = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    const accept = async () => {
      try {
        await api.acceptInvitation(token);
        setStatus('success');
        setMessage(t('invitation.joinedGroup'));
      } catch (err) {
        setStatus('error');
        setMessage(err.message || t('invitation.failedAccept'));
      }
    };
    if (token) accept();
  }, [token]);

  return (
    <div className="dashboard-container">
      <div className="dump-card" style={{ padding: '2rem', margin: '2rem auto', maxWidth: '600px', textAlign: 'center' }}>
        {status === 'pending' && (
          <>
            <div className="loading-spinner">Loading...</div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('invitation.accepting')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="success-message" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', color: '#22c55e', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              {message}
            </div>
            <button className="control-button primary" onClick={() => navigate('/groups')}>{t('actions.goGroups')}</button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="error-message" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              {message}
            </div>
            <button className="control-button primary" onClick={() => navigate('/')}>{t('actions.goDashboard')}</button>
          </>
        )}
      </div>
    </div>
  );
};
