import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DevelopmentGate = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting development access with password:', password);
      
      const response = await fetch('/api/verify-dev-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Development access granted');
        localStorage.setItem('devAccess', 'granted');
        window.location.reload();
      } else {
        console.error('Development access denied:', data.error);
        setError(data.error || 'Invalid development credentials');
        setPassword('');
      }
    } catch (error) {
      console.error('Development gate error:', error);
      setError('Error verifying credentials');
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white'
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
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#2C3E50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Access Application
          </button>
        </form>
      </div>
    </div>
  );
};

export default DevelopmentGate; 