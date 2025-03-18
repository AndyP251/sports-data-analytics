import React, { useState, useEffect, useRef } from 'react';
import '../../styles/Dashboard.css';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const CoachDashboard = () => {
  const [coachInfo, setCoachInfo] = useState({
    username: '',
    team: '',
    team_id: '',
    specialization: '',
    athletes: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('athletes');
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const positions = {
    FORWARD: 0,
    MIDFIELDER: 0,
    DEFENDER: 0,
    GOALKEEPER: 0,
    'Unknown': 0
  };

  useEffect(() => {
    const fetchCoachData = async () => {
      try {
        setLoading(true);
        
        // Get coach authentication information
        const authResponse = await fetch('/api/check-coach-auth/', {
          credentials: 'include'
        });
        
        if (!authResponse.ok) {
          throw new Error('Not authenticated as coach');
        }
        
        const authData = await authResponse.json();
        console.log('Coach auth data:', authData);
        
        // Use the team_athletes directly from the auth response
        setCoachInfo({
          username: authData.username,
          team: authData.team || 'No team assigned',
          team_id: authData.team_id || '',
          specialization: authData.specialization || 'Not specified',
          athletes: authData.team_athletes || []
        });
        
        setLoading(false);
        
        // Trigger stats animation after a short delay
        setTimeout(() => {
          setStatsLoaded(true);
        }, 500);
      } catch (error) {
        console.error('Error fetching coach data:', error);
        setError('Failed to load coach data. Please refresh the page or contact support.');
        setLoading(false);
      }
    };

    fetchCoachData();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  // Count positions for the chart
  coachInfo.athletes.forEach(athlete => {
    const position = athlete.position || 'Unknown';
    if (positions.hasOwnProperty(position)) {
      positions[position]++;
    } else {
      positions['Unknown']++;
    }
  });

  // Prepare chart data
  const positionChartData = {
    labels: Object.keys(positions).filter(pos => positions[pos] > 0),
    datasets: [
      {
        label: 'Athletes by Position',
        data: Object.values(positions).filter((count, index) => positions[Object.keys(positions)[index]] > 0),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Mock data for access distribution
  const accessChartData = {
    labels: ['Level 1', 'Level 2', 'Level 3'],
    datasets: [
      {
        label: 'Data Access Levels',
        data: [
          coachInfo.athletes.filter(a => a.data_permissions === 1).length,
          coachInfo.athletes.filter(a => a.data_permissions === 2).length,
          coachInfo.athletes.filter(a => a.data_permissions === 3).length,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
      },
    ],
  };

  // Mock upcoming events data
  const upcomingEvents = [
    { 
      id: 1, 
      title: 'Team Training', 
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(), 
      time: '9:00 AM',
      location: 'Main Field'
    },
    { 
      id: 2, 
      title: 'Strategy Meeting', 
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(), 
      time: '2:00 PM',
      location: 'Conference Room B'
    },
    { 
      id: 3, 
      title: 'Match vs. Rivals', 
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(), 
      time: '7:00 PM',
      location: 'Stadium'
    }
  ];

  // Render position badge with appropriate color
  const renderPositionBadge = (position) => {
    let badgeClass = 'position-badge';
    switch(position) {
      case 'FORWARD':
        badgeClass += ' forward';
        break;
      case 'MIDFIELDER':
        badgeClass += ' midfielder';
        break;
      case 'DEFENDER':
        badgeClass += ' defender';
        break;
      case 'GOALKEEPER':
        badgeClass += ' goalkeeper';
        break;
      default:
        badgeClass += ' unknown';
    }
    return <span className={badgeClass}>{position}</span>;
  };

  const handleSelectAthlete = (athlete) => {
    setSelectedAthlete(athlete);
    setActiveTab('athlete-detail');
  };

  const handleBackToAthletes = () => {
    setSelectedAthlete(null);
    setActiveTab('athletes');
  };

  const handleLogout = async () => {
    try {
      // Get CSRF token if available
      const csrfToken = document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const headers = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch('/api/logout/', {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify({})  // Empty body but needed for POST
      });
      
      if (response.ok) {
        // Clear all auth-related data
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('isCoachAuthenticated');
        localStorage.removeItem('devAccess'); // Remove development gate access
        
        // Clear session storage
        sessionStorage.clear();
        
        // Clear cookies by setting their expiration to past date
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // Redirect to the homepage with force_clear parameter
        window.location.href = '/?force_clear=1';
      } else {
        console.error('Logout failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading coach dashboard...</div>
      </div>
    );
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="coach-dashboard">
      {/* Hero Header Section */}
      <div className="coach-header-wrapper">
        <div className="coach-header">
          <div className="coach-header-content">
            <h1>Coach Dashboard</h1>
            <div className="coach-info">
              <div className="coach-avatar">
                {coachInfo.username.charAt(0).toUpperCase()}
              </div>
              <div className="coach-details">
                <h2>{coachInfo.username}</h2>
                <div className="coach-meta">
                  <div className="coach-meta-item">
                    <span className="meta-icon">🏆</span>
                    <span>{coachInfo.team}</span>
                  </div>
                  <div className="coach-meta-item">
                    <span className="meta-icon">🔍</span>
                    <span>{coachInfo.specialization}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Hamburger Menu */}
          <div className="menu-container" ref={menuRef}>
            <button className="hamburger-button" onClick={toggleMenu}>
              <div className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
            
            {menuOpen && (
              <div className="dropdown-menu">
                <div className="menu-header">
                  <div className="menu-avatar">
                    {coachInfo.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="menu-user-info">
                    <div className="menu-username">{coachInfo.username}</div>
                    <div className="menu-role">Coach</div>
                  </div>
                </div>
                <ul className="menu-items">
                  <li className="menu-item">
                    <span className="menu-icon">👤</span>
                    <span>My Profile</span>
                  </li>
                  <li className="menu-item">
                    <span className="menu-icon">⚙️</span>
                    <span>Settings</span>
                  </li>
                  <li className="menu-item">
                    <span className="menu-icon">🔔</span>
                    <span>Notifications</span>
                    <span className="notification-badge">3</span>
                  </li>
                  <li className="menu-item">
                    <span className="menu-icon">❓</span>
                    <span>Help & Support</span>
                  </li>
                  <li className="menu-divider"></li>
                  <li className="menu-item logout" onClick={handleLogout}>
                    <span className="menu-icon">🚪</span>
                    <span>Logout</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="stats-overview">
        <div className="stat-container">
          <div className={`stat-card ${statsLoaded ? 'animate' : ''}`}>
            <div className="stat-icon">👥</div>
            <div className="stat-value">{coachInfo.athletes.length}</div>
            <div className="stat-label">Athletes</div>
          </div>
          <div className={`stat-card ${statsLoaded ? 'animate' : ''}`} style={{animationDelay: '0.2s'}}>
            <div className="stat-icon">⚽</div>
            <div className="stat-value">{Object.values(positions).filter(val => val > 0).length}</div>
            <div className="stat-label">Positions</div>
          </div>
          <div className={`stat-card ${statsLoaded ? 'animate' : ''}`} style={{animationDelay: '0.4s'}}>
            <div className="stat-icon">📅</div>
            <div className="stat-value">{upcomingEvents.length}</div>
            <div className="stat-label">Upcoming Events</div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <div className="dashboard-tabs">
        <div 
          className={`dashboard-tab ${activeTab === 'athletes' ? 'active' : ''}`}
          onClick={() => setActiveTab('athletes')}
        >
          My Athletes
        </div>
        <div 
          className={`dashboard-tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Team Overview
        </div>
        <div 
          className={`dashboard-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </div>
        {selectedAthlete && (
          <div 
            className={`dashboard-tab ${activeTab === 'athlete-detail' ? 'active' : ''}`}
          >
            {selectedAthlete.username}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="dashboard-content">
        {/* Athletes Tab */}
        {activeTab === 'athletes' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Team Athletes</h2>
              <div className="section-actions">
                <div className="search-container">
                  <input type="text" placeholder="Search athletes..." className="search-input" />
                  <button className="search-button">🔍</button>
                </div>
              </div>
            </div>

            {coachInfo.athletes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏃</div>
                <h3>No athletes assigned yet</h3>
                <p>Athletes from team {coachInfo.team} will appear here.</p>
              </div>
            ) : (
              <div className="athletes-grid">
                {coachInfo.athletes.map(athlete => (
                  <div key={athlete.id} className="athlete-card" onClick={() => handleSelectAthlete(athlete)}>
                    <div className="athlete-avatar">
                      {athlete.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="athlete-header">
                      <h3>{athlete.username}</h3>
                      {athlete.position && renderPositionBadge(athlete.position)}
                    </div>
                    <div className="athlete-metrics">
                      <div className="metric">
                        <span className="metric-label">Email</span>
                        <span className="metric-value">{athlete.email || 'N/A'}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Access Level</span>
                        <span className="metric-value access-level">
                          {Array(athlete.data_permissions || 1).fill('●').join('')}
                        </span>
                      </div>
                    </div>
                    <button className="view-details-btn">View Profile</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Overview Tab */}
        {activeTab === 'team' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Team Overview</h2>
            </div>

            <div className="charts-container">
              <div className="chart-card">
                <h3>Positions Distribution</h3>
                <div className="chart-wrapper">
                  <Pie data={positionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>

              <div className="chart-card">
                <h3>Access Level Distribution</h3>
                <div className="chart-wrapper">
                  <Bar 
                    data={accessChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            precision: 0
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </div>
            </div>

            <div className="team-metrics">
              <div className="team-metric-card">
                <h3>Team Strength</h3>
                <div className="team-distribution">
                  {Object.entries(positions).map(([position, count]) => (
                    count > 0 && (
                      <div key={position} className="position-distribution">
                        <div className="position-name">{position}</div>
                        <div className="position-bar-container">
                          <div 
                            className="position-bar" 
                            style={{
                              width: `${(count / coachInfo.athletes.length) * 100}%`,
                              backgroundColor: position === 'FORWARD' ? '#ff6b6b' : 
                                              position === 'MIDFIELDER' ? '#4dabf7' : 
                                              position === 'DEFENDER' ? '#ffd43b' : 
                                              position === 'GOALKEEPER' ? '#69db7c' : '#adb5bd'
                            }}
                          ></div>
                        </div>
                        <div className="position-count">{count}</div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Upcoming Team Events</h2>
              <button className="action-button">+ Add Event</button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>No upcoming events</h3>
                <p>Schedule events for your team to stay organized.</p>
              </div>
            ) : (
              <div className="events-list">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="event-card">
                    <div className="event-date-container">
                      <div className="event-date">{event.date.split('/')[1]}</div>
                      <div className="event-month">{new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div className="event-details">
                      <h3>{event.title}</h3>
                      <div className="event-meta">
                        <span className="event-time">⏰ {event.time}</span>
                        <span className="event-location">📍 {event.location}</span>
                      </div>
                    </div>
                    <div className="event-actions">
                      <button className="event-edit-btn">Edit</button>
                      <button className="event-cancel-btn">Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Athlete Detail Tab */}
        {activeTab === 'athlete-detail' && selectedAthlete && (
          <div className="tab-content">
            <div className="section-header">
              <button className="back-button" onClick={handleBackToAthletes}>←</button>
              <h2>Athlete Profile</h2>
            </div>

            <div className="athlete-profile">
              <div className="athlete-profile-header">
                <div className="athlete-profile-avatar">
                  {selectedAthlete.username.charAt(0).toUpperCase()}
                </div>
                <div className="athlete-profile-info">
                  <h3>{selectedAthlete.username}</h3>
                  {selectedAthlete.position && renderPositionBadge(selectedAthlete.position)}
                  <p className="athlete-email">{selectedAthlete.email}</p>
                </div>
              </div>

              <div className="athlete-data-access">
                <h3>Data Access Level</h3>
                <div className="access-level-control">
                  <span className="access-level-label">Level {selectedAthlete.data_permissions || 1}</span>
                  <div className="access-level-indicators">
                    <span className={`indicator ${(selectedAthlete.data_permissions || 1) >= 1 ? 'active' : ''}`}></span>
                    <span className={`indicator ${(selectedAthlete.data_permissions || 1) >= 2 ? 'active' : ''}`}></span>
                    <span className={`indicator ${(selectedAthlete.data_permissions || 1) >= 3 ? 'active' : ''}`}></span>
                  </div>
                  <button className="edit-access-btn">Edit Access</button>
                </div>
              </div>

              <div className="athlete-stats-placeholder">
                <h3>Athlete Performance</h3>
                <p className="placeholder-text">Detailed performance metrics will be available when this athlete connects their data sources.</p>
                <button className="invite-connect-btn">Invite to Connect Data</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachDashboard; 