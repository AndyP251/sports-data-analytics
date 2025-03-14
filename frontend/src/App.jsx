import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import DevelopmentGate from './components/DevelopmentGate'
import Login from './components/Login'
import CoachLogin from './components/CoachLogin'
import Dashboard from './components/Dashboard/Dashboard'
import CoachDashboard from './components/Dashboard/CoachDashboard'
import RobotsText from './components/RobotsText'
import PrivacyPolicy from './components/PrivacyPolicy'
import HomePage from './components/HomePage'
import PricingPage from './components/PricingPage'
import MeetTheTeam from './components/MeetTheTeam'
import ContactPage from './components/ContactPage'
import './styles/Auth.css'
import './styles/Dashboard.css'

// Error boundary component to catch routing and other errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error("App Error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center'
        }}>
          <h1>Something went wrong</h1>
          <p>We're sorry, but an error has occurred. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#4B5563',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCoachAuthenticated, setIsCoachAuthenticated] = useState(false)
  const hasDevAccess = localStorage.getItem('devAccess') === 'granted'

  // Handle direct URL access for non-hash based routing
  useEffect(() => {
    // Parse initial auth state from localStorage if available
    const storedAuthState = localStorage.getItem('isAuthenticated');
    if (storedAuthState === 'true') {
      setIsAuthenticated(true);
    }

    const storedCoachAuthState = localStorage.getItem('isCoachAuthenticated');
    if (storedCoachAuthState === 'true') {
      setIsCoachAuthenticated(true);
    }
  }, []);

  // Update localStorage when auth state changes
  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('isCoachAuthenticated', isCoachAuthenticated);
  }, [isCoachAuthenticated]);

  // Handle robots.txt request
  if (window.location.pathname === '/robots.txt') {
    return <RobotsText />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public route for homepage */}
          <Route path="/" element={<HomePage />} />

          {/* Meet the Team page */}
          <Route path="/team" element={<MeetTheTeam />} />
          
          {/* Contact page */}
          <Route path="/contact" element={<ContactPage />} />
          
          {/* Athlete Portal path */}
          <Route path="/athlete-portal" element={
            !hasDevAccess ? <DevelopmentGate /> : <Navigate to="/login" />
          } />
          
          {/* Coach Portal path */}
          <Route path="/coach-portal" element={
            !hasDevAccess ? <DevelopmentGate /> : <Navigate to="/coach-login" />
          } />

          {/* Login route - always available but conditionally redirects */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : 
              !hasDevAccess ? <Navigate to="/athlete-portal" /> :
              <Login setIsAuthenticated={setIsAuthenticated} />
            } 
          />
          
          {/* Coach Login route */}
          <Route 
            path="/coach-login" 
            element={
              isCoachAuthenticated ? <Navigate to="/coach-dashboard" /> : 
              !hasDevAccess ? <Navigate to="/coach-portal" /> :
              <CoachLogin setIsAuthenticated={setIsCoachAuthenticated} />
            } 
          />
          
          {/* Dashboard route - always available but conditionally redirects */}
          <Route 
            path="/dashboard" 
            element={
              !isAuthenticated ? <Navigate to="/login" /> :
              !hasDevAccess ? <Navigate to="/athlete-portal" /> :
              <Dashboard />
            } 
          />
          
          {/* Coach Dashboard route */}
          <Route 
            path="/coach-dashboard" 
            element={
              !isCoachAuthenticated ? <Navigate to="/coach-login" /> :
              !hasDevAccess ? <Navigate to="/coach-portal" /> :
              <CoachDashboard />
            } 
          />
          
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/pricing" element={<PricingPage />} />
          
          {/* Catch-all route that redirects to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
