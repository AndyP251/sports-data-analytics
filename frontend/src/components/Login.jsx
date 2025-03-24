import React, { useState, useEffect } from 'react'
import '../styles/login.css'

// Add CSRF token function
function getCsrfToken() {
  const name = 'csrftoken'
  let cookieValue = null
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

const Login = ({ setIsAuthenticated }) => {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    confirmPassword: '',
    team: '',
    position: 'FORWARD', // Default position
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [csrfToken, setCsrfToken] = useState('')
  const [csrfStatus, setCsrfStatus] = useState('loading')
  const [teams, setTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(false)

  useEffect(() => {
    // Check if the user is actually authenticated on the server
    const verifyAuth = async () => {
      try {
        const response = await fetch('/api/verify-auth/', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!response.ok) {
          // If server says user is not authenticated, clear local storage
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('isCoachAuthenticated');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error verifying authentication:", error);
        // On error, assume not authenticated
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('isCoachAuthenticated');
        setIsAuthenticated(false);
      }
    };
    
    verifyAuth();
    
    // Get CSRF token on component mount
    const getCsrfToken = async () => {
      try {
        setCsrfStatus('loading')
        const response = await fetch('/api/verify-dev-password/', {
          method: 'GET',
          credentials: 'include',
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken)
          setCsrfStatus('ready')
        } else {
          throw new Error('No CSRF token in response')
        }
      } catch (error) {
        console.error('Error fetching CSRF token:', error)
        setError('Failed to initialize security. Please refresh the page.')
        setCsrfStatus('error')
      }
    }

    getCsrfToken()
    
    // Fetch teams if in registration mode
    if (!isLoginMode) {
      fetchTeams()
    }
  }, [isLoginMode])
  
  // Function to fetch available teams
  const fetchTeams = async () => {
    try {
      setLoadingTeams(true)
      const response = await fetch('/api/teams/', {
        method: 'GET',
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }
      
      const data = await response.json()
      setTeams(data)
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoadingTeams(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (csrfStatus !== 'ready') {
      setError('Please wait for security initialization to complete.')
      return
    }

    if (isSubmitting) return;
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    if (!isLoginMode && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsSubmitting(false)
      return
    }

    try {
      const endpoint = isLoginMode ? 'login' : 'register'
      
      // Only send required fields for registration
      const requestData = isLoginMode ? {
        username: formData.username,
        password: formData.password,
        skip_sync: true  // Add this parameter to skip immediate sync
      } : {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        team_id: formData.team || null,
        position: formData.position || 'FORWARD'
      }

      const response = await fetch(`/api/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'X-CSRFToken': csrfToken,
          'X-Csrftoken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      })
      
      // Check if response is ok before trying to parse JSON
      if (response.ok) {
        const data = await response.json()
        
        if (!isLoginMode) {
          setSuccess('Account created successfully! Please sign in.')
          setFormData({
            username: '',
            password: '',
            email: '',
            confirmPassword: '',
            team: '',
            position: 'FORWARD',
          })

          // Fetch a fresh CSRF token after registration
          const refreshCsrfToken = async () => {
            try {
              const response = await fetch('/api/verify-dev-password/', {
                method: 'GET',
                credentials: 'include',
              });
              const data = await response.json();
              if (data.csrfToken) {
                setCsrfToken(data.csrfToken);
                setCsrfStatus('ready');
              } else {
                throw new Error('No CSRF token in response');
              }
            } catch (error) {
              console.error('Error refreshing CSRF token:', error);
              setError('Failed to refresh security token. Please refresh the page.');
              setCsrfStatus('error');
            }
          };

          refreshCsrfToken();

          setTimeout(() => {
            setIsLoginMode(true);
          }, 2000);
        } else {
          setIsAuthenticated(true)
        }
      } else {
        // Handle different error response types
        const contentType = response.headers.get('content-type')
        
        if (contentType && contentType.includes('application/json')) {
          // JSON error response
          const errorData = await response.json()
          setError(errorData.error || errorData.detail || `${isLoginMode ? 'Login' : 'Registration'} failed`)
        } else {
          // Non-JSON response (like HTML error page from worker timeout)
          if (response.status === 500 || response.status === 502 || response.status === 504) {
            setError("Server is busy processing your request. Please try again in a moment.")
          } else {
            setError(`${isLoginMode ? 'Login' : 'Registration'} failed with status: ${response.status}`)
          }
        }
      }
    } catch (error) {
      // Handle JSON parsing errors and network errors
      if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
        setError("The server is temporarily unavailable. Please try again in a moment.")
      } else {
        setError(`${isLoginMode ? 'Login' : 'Registration'} failed: ${error.message}`)
      }
      console.error('Request error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add switch to registration mode which triggers team fetch
  const switchToRegistration = () => {
    setIsLoginMode(false)
    fetchTeams()
  }

  return (
    <div 
      className="auth-page" 
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100vh',
        zIndex: 1000
      }}
    >
      <div className="auth-container" style={{ overflow: 'hidden' }}>
        <div className="auth-box" style={{ overflow: 'hidden' }}>
          <div style={{ overflow: 'hidden', padding: 0, margin: 0 }}>
            <div className="brand-title" style={{ overflow: 'hidden', padding: 0 }}>Pulse Project</div>
            <div className="developer-credit" style={{ overflow: 'hidden', padding: 0 }}>Developed by Andrew Prince</div>
          </div>
          <h2 className="auth-title">{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
          <div className={`csrf-status ${csrfStatus}`}>
            {csrfStatus === 'loading' && 'Initializing security...'}
            {csrfStatus === 'ready' && 'Security initialized'}
            {csrfStatus === 'error' && 'Security initialization failed'}
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="Enter your username"
                className="auth-input"
              />
            </div>
            {!isLoginMode && (
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter your email"
                  className="auth-input"
                />
              </div>
            )}
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter your password"
                className="auth-input"
              />
            </div>
            {!isLoginMode && (
              <>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    placeholder="Confirm your password"
                    className="auth-input"
                  />
                </div>
                <div className="form-group">
                  <label>Team (Optional)</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({...formData, team: e.target.value})}
                    className="auth-input"
                    disabled={loadingTeams}
                  >
                    <option value="">Select a team (optional)</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                  {loadingTeams && <div className="loading-indicator">Loading teams...</div>}
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="auth-input"
                  >
                    <option value="FORWARD">Forward</option>
                    <option value="MIDFIELDER">Midfielder</option>
                    <option value="DEFENDER">Defender</option>
                    <option value="GOALKEEPER">Goalkeeper</option>
                  </select>
                </div>
              </>
            )}
            <button 
              type="submit" 
              className="auth-button"
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? 'Processing...' 
                : (isLoginMode ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>
          <button 
            className="toggle-mode-button" 
            onClick={isLoginMode ? switchToRegistration : () => setIsLoginMode(true)}
          >
            {isLoginMode ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login 