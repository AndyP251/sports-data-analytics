import React, { useState, useEffect } from 'react';
import BiometricsDashboard from './BiometricsDashboard';

const Dashboard = () => {
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Fetch the current user's username from your Django endpoint
    fetch('/api/current_user/', {
      credentials: 'include',  // Important: This sends cookies with the request
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        return response.json();
      })
      .then(data => {
        if (data.username) {
          setUsername(data.username);
          localStorage.setItem('username', data.username);
        } else {
          throw new Error('No username in response');
        }
      })
      .catch(error => {
        console.error('Error fetching current user:', error);
        // Try fallback to localStorage
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
          setUsername(storedUsername);
        } else {
          setUsername('Guest');
        }
      });
  }, []); // Empty dependency array means this runs once on component mount

  return (
    <div style={{ padding: '20px' }}>
      <BiometricsDashboard username={username} />
    </div>
  );
};

export default Dashboard; 