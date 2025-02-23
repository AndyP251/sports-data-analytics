import React, { useState, useEffect } from 'react';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'v1.0';

const DevelopmentGate = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getCsrfToken = async () => {
      try {
        setIsLoading(true);
        console.log('[v1.1] Fetching CSRF token...');
        
        const response = await fetch('/api/verify-dev-password/', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
        }
        
        const data = await response.json();
        console.log('CSRF Response:', data);
        
        if (data.csrfToken) {
          console.log('CSRF token received:', data.csrfToken);
          setCsrfToken(data.csrfToken);
          setError(''); // Clear any existing errors
        } else {
          throw new Error('No CSRF token in response');
        }
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
        setError('Failed to initialize security. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    getCsrfToken();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!csrfToken) {
      setError('No security token available. Please refresh the page.');
      return;
    }

    try {
      setError('');
      console.log('Submitting with CSRF token:', csrfToken);

      const response = await fetch('/api/verify-dev-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          // 'X-Csrftoken': csrfToken,
          // 'X-CSRF-Token': csrfToken,
          // 'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('devAccess', 'granted');
        window.location.reload();
      } else if (response.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(data.error || 'Invalid development credentials');
      }
    } catch (error) {
      console.error('Development gate error:', error);
      setError('Network error - please try again');
    }
    setPassword('');
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
      position: 'relative'
    }}>
      <div style={{
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '1.5rem',
          color: '#333'
        }}>
          Enter Development Credentials
        </h2>
        {error && (
          <div style={{
            color: 'red',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginBottom: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            placeholder="Enter access password"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !csrfToken}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: (!isLoading && csrfToken) ? '#2C3E50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (!isLoading && csrfToken) ? 'pointer' : 'not-allowed'
            }}
          >
            {isLoading ? 'Loading...' : 'Access Application'}
          </button>
        </form>
        {/* Debug information */}
        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
          Status: {isLoading ? 'Loading...' : csrfToken ? 'Ready' : 'No Token'}
        </div>
      </div>
      
      {/* Version display */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        fontSize: '12px',
        color: '#666',
        fontFamily: 'monospace'
      }}>
        {APP_VERSION}
      </div>
    </div>
  );
};

export default DevelopmentGate; 