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

const CoachLogin = ({ setIsAuthenticated }) => {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    confirmPassword: '',
    coachCode: '', // Added coach code field
    specialization: '', // Added specialization field for coaches
    experience: '', // Added experience field
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [csrfToken, setCsrfToken] = useState('')
  const [csrfStatus, setCsrfStatus] = useState('loading')

  useEffect(() => {
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
  }, [])

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

    // Validation checks
    if (!isLoginMode) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        setIsSubmitting(false)
        return
      }
      
      if (!formData.coachCode) {
        setError('Coach code is required for registration')
        setIsSubmitting(false)
        return
      }
      
      if (formData.coachCode.length !== 6) {
        setError('Coach code must be 6 characters')
        setIsSubmitting(false)
        return
      }
    }

    try {
      const endpoint = isLoginMode ? 'coach-login' : 'coach-register'
      
      // Only send required fields for registration
      const requestData = isLoginMode ? {
        username: formData.username,
        password: formData.password
      } : {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        coach_code: formData.coachCode,
        specialization: formData.specialization,
        experience: formData.experience ? parseInt(formData.experience) : 0
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
      
      const data = await response.json()
      
      if (response.ok) {
        if (!isLoginMode) {
          setSuccess('Coach account created successfully! Please sign in.')
          setFormData({
            username: '',
            password: '',
            email: '',
            confirmPassword: '',
            coachCode: '',
            specialization: '',
            experience: '',
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
        // More detailed error handling
        if (data.error === 'invalid_coach_code') {
          setError('Invalid or expired coach code')
        } else {
          setError(data.error || data.detail || `${isLoginMode ? 'Login' : 'Registration'} failed`)
        }
        console.log('Response data:', data) // For debugging
      }
    } catch (error) {
      console.error('Request error:', error) // For debugging
      setError(`${isLoginMode ? 'Login' : 'Registration'} failed: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-box">
          <div className="brand-title">Pulse Project</div>
          <div className="developer-credit">Developed by Andrew Prince</div>
          <h2 className="auth-title">{isLoginMode ? 'Coach Login' : 'Register as Coach'}</h2>
          <div className={`csrf-status ${csrfStatus}`}>
            {csrfStatus === 'loading' && 'Initializing security...'}
            {csrfStatus === 'ready' && 'Security initialized'}
            {csrfStatus === 'error' && 'Security initialization failed'}
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <form onSubmit={handleSubmit} className="auth-form" style={{ marginBottom: '20px' }}>
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
                  <label>Coach Code</label>
                  <input
                    type="text"
                    value={formData.coachCode}
                    onChange={(e) => setFormData({...formData, coachCode: e.target.value.toUpperCase()})}
                    placeholder="Enter your 6-character coach code"
                    maxLength="6"
                    className="auth-input"
                  />
                </div>
                <div className="form-group">
                  <label>Specialization</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                    placeholder="Enter your coaching specialization"
                    className="auth-input"
                  />
                </div>
                <div className="form-group">
                  <label>Years of Experience</label>
                  <input
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                    placeholder="Enter years of coaching experience"
                    className="auth-input"
                    min="0"
                  />
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
                : (isLoginMode ? 'Sign In as Coach' : 'Register as Coach')
              }
            </button>
          </form>
          <button 
            className="toggle-mode-button" 
            onClick={() => setIsLoginMode(!isLoginMode)}
          >
            {isLoginMode ? 'Need a coach account? Sign up' : 'Already have a coach account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CoachLogin 