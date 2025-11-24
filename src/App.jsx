import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import DumpEditor from './pages/DumpEditor';
import QuizInterface from './components/QuizInterface';
import Results from './components/Results';
import { BookOpen, LayoutDashboard, History, LogOut, Shield, Sun, Moon, User, Settings, Edit } from 'lucide-react';
 
import { api } from './utils/api';

const API_URL = import.meta.env.VITE_API_URL || '';

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
            setError('Dump not found or not shared');
          } else if (response.status === 403) {
            setError('This dump is private and cannot be shared');
          } else {
            setError('Failed to load shared dump');
          }
          setLoading(false);
          return;
        }
        
        const dumpData = await response.json();
        if (dumpData.isPublic) {
          setDump(dumpData);
        } else {
          setError('This dump is private and cannot be shared');
        }
      } catch (err) {
        console.error('Failed to load shared dump:', err);
        setError(err.message || 'Failed to load shared dump');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      loadSharedDump();
    } else {
      setError('Invalid dump ID');
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
          <p style={{ color: 'var(--text-secondary)' }}>Loading shared quiz...</p>
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
            <strong>Error:</strong> {error || 'Dump not found'}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            This quiz may be private, deleted, or the link is invalid.
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="control-button primary"
          >
            Go to Dashboard
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
            <strong>Error:</strong> This dump has no questions
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="control-button primary"
          >
            Go to Dashboard
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
  const [dump, setDump] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const answers = location.state?.answers || {};

  useEffect(() => {
    const loadDump = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch all dumps and find the one matching the ID
        // Note: IDs are UUIDs, so we need string comparison, not parseInt
        const dumps = await api.getDumps('my');
        const found = dumps.find(d => String(d.id) === String(id));
        if (found) {
          setDump(found);
        } else {
          // Try public dumps
          const publicDumps = await api.getDumps('public');
          const foundPublic = publicDumps.find(d => String(d.id) === String(id));
          if (foundPublic) {
            setDump(foundPublic);
          } else {
            setError('Dump not found');
          }
        }
      } catch (err) {
        console.error('Failed to load dump:', err);
        setError(err.message || 'Failed to load dump');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      loadDump();
    } else {
      setError('Invalid dump ID');
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
          <p style={{ color: 'var(--text-secondary)' }}>Loading quiz for review...</p>
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
            <strong>Error:</strong> {error || 'Dump not found'}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            The quiz you're trying to review may have been deleted or you don't have access to it.
          </p>
          <button 
            onClick={() => navigate('/history')} 
            className="control-button primary"
          >
            Go Back to History
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
            <strong>Error:</strong> This dump has no questions
          </div>
          <button 
            onClick={() => navigate('/history')} 
            className="control-button primary"
          >
            Go Back to History
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
        <span>Dumps Master</span>
      </div>
      <div className="nav-links">
        <Link to="/" className="nav-link">
          Dashboard
        </Link>
        <Link to="/history" className="nav-link">
          History
        </Link>
        {user.role === 'admin' && (
          <Link to="/admin" className="nav-link">
            Admin
          </Link>
        )}

        <button onClick={toggleTheme} className="nav-link icon-only" title="Toggle Theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="user-menu" ref={menuRef} style={{ position: 'relative' }}>
          <button
            className="nav-link user-toggle"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 0 }}
          >
            {user.avatar ? (
              <img
                src={`${API_URL}${user.avatar}`}
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
                <Settings size={16} /> Profile
              </Link>
              <button onClick={logout} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', color: '#ef4444', background: 'none', border: 'none', width: '100%', cursor: 'pointer', borderRadius: '4px', textAlign: 'left', fontSize: '0.9rem' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

function AppContent() {
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
        </Routes>
      </main>
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Dumps Master. Built for learning.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
