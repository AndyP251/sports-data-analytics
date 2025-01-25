import { useState } from 'react'

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

function Login({ setIsAuthenticated }) {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
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
        password: formData.password
      } : {
        username: formData.username,
        password: formData.password,
        email: formData.email
      }

      const response = await fetch(`http://localhost:8000/api/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        if (!isLoginMode) {
          setSuccess('Account created successfully! Please sign in.')
          setFormData({
            username: '',
            password: '',
            email: '',
            confirmPassword: '',
          })
          setTimeout(() => {
            setIsLoginMode(true)
          }, 2000)
        } else {
          setIsAuthenticated(true)
        }
      } else {
        // More detailed error handling
        setError(data.error || data.detail || `${isLoginMode ? 'Login' : 'Registration'} failed`)
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
          <div className="brand-title">TaskFlow</div>
          <h2 className="auth-title">{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
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
            onClick={() => setIsLoginMode(!isLoginMode)}
          >
            {isLoginMode ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login 