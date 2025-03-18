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

// Styles for the biometric metrics table
const biometricStyles = `
  .biometric-metrics {
    margin-top: 24px;
    background-color: #1e1e1e;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 15px;
  }
  
  .card-header h3 {
    margin: 0;
    font-size: 20px;
    color: #ffffff;
  }
  
  .mini-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .biometric-metrics-table {
    overflow-x: auto;
    background-color: #2a2a2a;
    border-radius: 8px;
  }
  
  .biometric-metrics-table table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    color: #e0e0e0;
  }
  
  .biometric-metrics-table th,
  .biometric-metrics-table td {
    padding: 15px;
    text-align: center;
    border-bottom: 1px solid #3a3a3a;
  }
  
  .biometric-metrics-table th {
    background-color: #333;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 13px;
    letter-spacing: 0.5px;
  }
  
  .biometric-metrics-table tr:hover {
    background-color: #383838;
  }
  
  .position-row {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .position-row:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .position-row.selected {
    background-color: #3a3a3a;
    border-left: 3px solid;
  }
  
  .position-row.forward.selected {
    border-left-color: #ff6b6b;
  }
  
  .position-row.midfielder.selected {
    border-left-color: #4dabf7;
  }
  
  .position-row.defender.selected {
    border-left-color: #ffd43b;
  }
  
  .position-row.goalkeeper.selected {
    border-left-color: #69db7c;
  }
  
  .biometric-metrics-table .metric-icon {
    margin-right: 6px;
    font-size: 18px;
  }
  
  .position-cell {
    font-weight: 600;
    text-align: left;
    font-size: 15px;
  }
  
  .position-row.forward .position-cell {
    color: #ff6b6b;
  }
  
  .position-row.midfielder .position-cell {
    color: #4dabf7;
  }
  
  .position-row.defender .position-cell {
    color: #ffd43b;
  }
  
  .position-row.goalkeeper .position-cell {
    color: #69db7c;
  }
  
  .recovery-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .recovery-bar-container {
    width: 70px;
    height: 5px;
    background-color: #3a3a3a;
    border-radius: 3px;
    margin-top: 6px;
    overflow: hidden;
  }
  
  .recovery-bar {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;
  }
  
  .no-biometric-data {
    padding: 40px 20px;
    text-align: center;
    color: #9e9e9e;
    background-color: #2a2a2a;
    border-radius: 8px;
  }
  
  .no-biometric-data p {
    margin: 5px 0;
    font-size: 15px;
  }
  
  /* Detailed Position Panel Styles */
  .position-detail-panel {
    margin-top: 20px;
    background-color: #2a2a2a;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    max-height: 0;
    opacity: 0;
  }
  
  .position-detail-panel.open {
    max-height: 1000px;
    opacity: 1;
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .panel-header h3 {
    margin: 0;
    font-size: 18px;
    display: flex;
    align-items: center;
    color: #ffffff;
  }
  
  .position-icon {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    margin-right: 10px;
    font-size: 16px;
  }
  
  .position-icon.forward {
    background-color: rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
  }
  
  .position-icon.midfielder {
    background-color: rgba(77, 171, 247, 0.2);
    color: #4dabf7;
  }
  
  .position-icon.defender {
    background-color: rgba(255, 212, 59, 0.2);
    color: #ffd43b;
  }
  
  .position-icon.goalkeeper {
    background-color: rgba(105, 219, 124, 0.2);
    color: #69db7c;
  }
  
  .close-panel {
    background: none;
    border: none;
    color: #9e9e9e;
    cursor: pointer;
    font-size: 16px;
    transition: color 0.2s;
  }
  
  .close-panel:hover {
    color: #ffffff;
  }
  
  /* Player cards grid */
  .player-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
    margin-top: 10px;
  }
  
  .player-card {
    background-color: #333;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s;
  }
  
  .player-card:hover {
    transform: translateY(-3px);
  }
  
  .player-card-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .player-avatar {
    width: 40px;
    height: 40px;
    background-color: #444;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 16px;
    margin-right: 10px;
  }
  
  .player-name {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #fff;
  }
  
  .player-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .player-metric {
    margin-bottom: 8px;
  }
  
  .metric-label {
    display: block;
    font-size: 12px;
    color: #9e9e9e;
    margin-bottom: 2px;
  }
  
  .metric-value {
    font-size: 15px;
    font-weight: 600;
    color: #e0e0e0;
  }
  
  .player-progress {
    margin-top: 5px;
    height: 4px;
    background-color: #444;
    border-radius: 2px;
    position: relative;
    overflow: hidden;
  }
  
  .player-progress-bar {
    position: absolute;
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }
  
  .readiness-bar {
    background-color: #4dabf7;
  }
  
  .fatigue-bar {
    background-color: #ff6b6b;
  }
  
  .player-card-footer {
    margin-top: 15px;
    text-align: right;
  }
  
  .view-profile-btn {
    background: none;
    border: none;
    color: #4dabf7;
    font-size: 13px;
    cursor: pointer;
    padding: 0;
  }
  
  .view-profile-btn:hover {
    text-decoration: underline;
  }
`;

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
  const [teamBiometricData, setTeamBiometricData] = useState({});
  const [loadingBiometrics, setLoadingBiometrics] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [positionPlayersData, setPositionPlayersData] = useState([]);
  const [playerDataByPosition, setPlayerDataByPosition] = useState({});
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

  // Effect to fetch biometric data when team tab is selected
  useEffect(() => {
    if (activeTab === 'team' && coachInfo.athletes.length > 0) {
      fetchTeamBiometricData();
    }
  }, [activeTab, coachInfo.athletes]);

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

  // Function to fetch biometric data for all athletes
  const fetchTeamBiometricData = () => {
    setLoadingBiometrics(true);
    
    // Initialize the data structure for individual players by position
    const playersByPosition = {
      'FORWARD': [],
      'MIDFIELDER': [],
      'DEFENDER': [],
      'GOALKEEPER': [],
      'Unknown': []
    };
    
    // Create a map to store the sum of metrics by position
    const metricsByPosition = {
      'FORWARD': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
      'MIDFIELDER': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
      'DEFENDER': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
      'GOALKEEPER': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
      'Unknown': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 }
    };
    
    // Process each athlete
    coachInfo.athletes.forEach(athlete => {
      // Check if athlete has data permissions, earlier versions might have it as a number
      // or newer versions might have it as an object with properties
      const hasPermission = typeof athlete.data_permissions === 'object' 
        ? athlete.data_permissions?.biometrics 
        : athlete.data_permissions >= 1;
        
      if (hasPermission) {
        // Get position or default to Unknown
        const position = athlete.position || 'Unknown';
        
        // Generate mock biometric data based on position
        const restingHeartRate = generateMockMetric(position, 'restingHeartRate');
        const hrv = generateMockMetric(position, 'hrv');
        const recoveryScore = generateMockMetric(position, 'recoveryScore');
        const sleepHours = generateMockMetric(position, 'sleepHours');
        const steps = generateMockMetric(position, 'steps');
        
        // Additional metrics for detailed view
        const maxHeartRate = generateMockMetric(position, 'maxHeartRate');
        const vo2max = generateMockMetric(position, 'vo2max');
        const trainingLoad = generateMockMetric(position, 'trainingLoad');
        const fatigue = generateMockMetric(position, 'fatigue');
        const readiness = generateMockMetric(position, 'readiness');
        
        // Add individual player data
        playersByPosition[position].push({
          id: athlete.id,
          firstName: athlete.first_name,
          lastName: athlete.last_name,
          position: position,
          restingHeartRate,
          hrv,
          recoveryScore,
          sleepHours,
          steps,
          maxHeartRate,
          vo2max,
          trainingLoad,
          fatigue,
          readiness
        });
        
        // Update the metrics sums for this position
        metricsByPosition[position].count += 1;
        metricsByPosition[position].resting_hr += restingHeartRate;
        metricsByPosition[position].hrv_ms += hrv;
        metricsByPosition[position].recovery_score += recoveryScore;
        metricsByPosition[position].sleep_hours += sleepHours;
        metricsByPosition[position].steps += steps;
      }
    });
    
    // Calculate averages for each position
    const teamBiometricAverages = {};
    
    for (const [position, metrics] of Object.entries(metricsByPosition)) {
      if (metrics.count > 0) {
        teamBiometricAverages[position] = {
          count: metrics.count,
          resting_hr: metrics.count > 0 ? metrics.resting_hr / metrics.count : null,
          hrv_ms: metrics.count > 0 ? metrics.hrv_ms / metrics.count : null,
          recovery_score: metrics.count > 0 ? metrics.recovery_score / metrics.count : null,
          sleep_hours: metrics.count > 0 ? metrics.sleep_hours / metrics.count : null,
          steps: metrics.count > 0 ? metrics.steps / metrics.count : null
        };
      }
    }
    
    // Update state with the calculated averages and individual player data
    setTeamBiometricData(teamBiometricAverages);
    setPlayerDataByPosition(playersByPosition);
    setLoadingBiometrics(false);
  };

  // Helper function to generate position-specific mock metrics
  const generateMockMetric = (position, metricType) => {
    // Base ranges for each metric
    const metricRanges = {
      restingHeartRate: { min: 50, max: 70, variance: 8 },
      hrv: { min: 50, max: 90, variance: 15 },
      recoveryScore: { min: 60, max: 95, variance: 10 },
      sleepHours: { min: 6, max: 9, variance: 1 },
      steps: { min: 5000, max: 15000, variance: 2000 },
      maxHeartRate: { min: 180, max: 200, variance: 10 },
      vo2max: { min: 45, max: 65, variance: 5 },
      trainingLoad: { min: 200, max: 400, variance: 50 },
      fatigue: { min: 20, max: 80, variance: 15 },
      readiness: { min: 60, max: 95, variance: 10 }
    };
    
    // Position-specific adjustments
    const positionAdjustments = {
      GOALKEEPER: {
        restingHeartRate: -5,
        hrv: 10,
        recoveryScore: 5,
        sleepHours: 0.5,
        steps: -3000,
        maxHeartRate: -10,
        vo2max: -5,
        trainingLoad: -50,
        fatigue: -10,
        readiness: 5
      },
      DEFENDER: {
        restingHeartRate: -2,
        hrv: 5,
        recoveryScore: 2,
        sleepHours: 0.2,
        steps: -1000,
        maxHeartRate: -5,
        vo2max: 0,
        trainingLoad: 0,
        fatigue: 0,
        readiness: 2
      },
      MIDFIELDER: {
        restingHeartRate: 2,
        hrv: -5,
        recoveryScore: -2,
        sleepHours: -0.2,
        steps: 2000,
        maxHeartRate: 5,
        vo2max: 5,
        trainingLoad: 50,
        fatigue: 10,
        readiness: -2
      },
      FORWARD: {
        restingHeartRate: 3,
        hrv: -8,
        recoveryScore: -3,
        sleepHours: -0.3,
        steps: 1000,
        maxHeartRate: 8,
        vo2max: 3,
        trainingLoad: 30,
        fatigue: 5,
        readiness: -3
      }
    };
    
    const range = metricRanges[metricType];
    const adjustment = positionAdjustments[position] ? positionAdjustments[position][metricType] || 0 : 0;
    
    // Random value within range with position adjustment
    let value;
    if (metricType === 'sleepHours') {
      // Sleep should be a decimal with 1 decimal place
      value = ((Math.random() * (range.max - range.min) + range.min) + adjustment).toFixed(1);
      return parseFloat(value);
    } else if (metricType === 'steps') {
      // Steps should be integers
      value = Math.round(Math.random() * (range.max - range.min) + range.min) + adjustment;
      return Math.max(0, Math.round(value));
    } else {
      // Other metrics are rounded to integers
      value = Math.random() * (range.max - range.min) + range.min + adjustment;
      return Math.max(0, Math.round(value));
    }
  };

  const handlePositionClick = (position) => {
    // If clicking the same position, toggle it off
    if (selectedPosition === position) {
      setSelectedPosition(null);
      setPositionPlayersData([]);
    } else {
      setSelectedPosition(position);
      // Get player data for the selected position
      const positionPlayers = playerDataByPosition[position] || [];
      setPositionPlayersData(positionPlayers);
      
      // Scroll to the panel after a short delay to ensure it's visible
      setTimeout(() => {
        const panel = document.querySelector('.position-detail-panel.open');
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
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
      {/* Inject biometric styles */}
      <style>{biometricStyles}</style>
      
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
                  {Object.entries(positions)
                    .filter(([_, count]) => count > 0)
                    .map(([position, count]) => (
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
                    ))}
                </div>
              </div>

              {/* Biometric Metrics Section */}
              <div className="team-metric-card biometric-metrics">
                <div className="card-header">
                  <h3>Team Biometric Averages</h3>
                  {loadingBiometrics && <div className="mini-spinner"></div>}
                </div>

                {!loadingBiometrics && Object.keys(teamBiometricData).length === 0 ? (
                  <div className="no-biometric-data">
                    <p>No biometric data available.</p>
                    <p>Athletes may not have shared their biometric data or the data has not been uploaded yet.</p>
                  </div>
                ) : (
                  <div className="biometric-metrics-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Position</th>
                          <th>Athletes</th>
                          <th>Resting HR</th>
                          <th>HRV</th>
                          <th>Recovery</th>
                          <th>Sleep</th>
                          <th>Steps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingBiometrics ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                              <div style={{ display: 'inline-block' }} className="mini-spinner"></div>
                            </td>
                          </tr>
                        ) : (
                          Object.entries(teamBiometricData)
                            .filter(([_, metrics]) => metrics.count > 0)
                            .map(([position, metrics]) => (
                              <tr 
                                key={position} 
                                className={`position-row ${position.toLowerCase()} ${selectedPosition === position ? 'selected' : ''}`}
                                onClick={() => handlePositionClick(position)}
                              >
                                <td className="position-cell">{position}</td>
                                <td>{metrics.count}</td>
                                <td>{metrics.resting_hr !== null ? Math.round(metrics.resting_hr) : '-'} bpm</td>
                                <td>{metrics.hrv_ms !== null ? Math.round(metrics.hrv_ms) : '-'} ms</td>
                                <td>
                                  <div className="recovery-indicator">
                                    {metrics.recovery_score !== null ? Math.round(metrics.recovery_score) : '-'}%
                                    <div className="recovery-bar-container">
                                      <div 
                                        className="recovery-bar" 
                                        style={{ 
                                          width: `${metrics.recovery_score || 0}%`,
                                          backgroundColor: metrics.recovery_score > 75 ? '#69db7c' : metrics.recovery_score > 50 ? '#ffd43b' : '#ff6b6b'
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td>{metrics.sleep_hours !== null ? metrics.sleep_hours.toFixed(1) : '-'} hrs</td>
                                <td>{metrics.steps !== null ? Math.round(metrics.steps).toLocaleString() : '-'}</td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Position Detail Panel */}
                <div className={`position-detail-panel ${selectedPosition ? 'open' : ''}`}>
                  {selectedPosition && (
                    <>
                      <div className="panel-header">
                        <h3>
                          <span className={`position-icon ${selectedPosition.toLowerCase()}`}>
                            {selectedPosition === 'FORWARD' ? 'F' : 
                             selectedPosition === 'MIDFIELDER' ? 'M' : 
                             selectedPosition === 'DEFENDER' ? 'D' : 
                             selectedPosition === 'GOALKEEPER' ? 'G' : 'U'}
                          </span>
                          {selectedPosition} Players ({positionPlayersData.length})
                        </h3>
                        <button className="close-panel" onClick={() => setSelectedPosition(null)}>
                          ✕
                        </button>
                      </div>
                      
                      <div className="player-cards">
                        {positionPlayersData.map((player, index) => (
                          <div className="player-card" key={index}>
                            <div className="player-card-header">
                              <div className="player-avatar">
                                {player.firstName?.charAt(0) || ''}{player.lastName?.charAt(0) || ''}
                              </div>
                              <h4 className="player-name">{player.firstName || ''} {player.lastName || ''}</h4>
                            </div>
                            
                            <div className="player-metrics">
                              <div className="player-metric">
                                <span className="metric-label">Heart Rate</span>
                                <span className="metric-value">{player.restingHeartRate} bpm</span>
                              </div>
                              <div className="player-metric">
                                <span className="metric-label">HRV</span>
                                <span className="metric-value">{player.hrv} ms</span>
                              </div>
                              <div className="player-metric">
                                <span className="metric-label">Sleep</span>
                                <span className="metric-value">{player.sleepHours?.toFixed(1) || '0.0'} hrs</span>
                              </div>
                              <div className="player-metric">
                                <span className="metric-label">Steps</span>
                                <span className="metric-value">{player.steps?.toLocaleString() || '0'}</span>
                              </div>
                              <div className="player-metric">
                                <span className="metric-label">Max HR</span>
                                <span className="metric-value">{player.maxHeartRate || '0'} bpm</span>
                              </div>
                              <div className="player-metric">
                                <span className="metric-label">VO2 Max</span>
                                <span className="metric-value">{player.vo2max || '0'} ml/kg/min</span>
                              </div>
                            </div>
                            
                            <div className="player-metric">
                              <span className="metric-label">Training Load</span>
                              <span className="metric-value">{player.trainingLoad || '0'}</span>
                            </div>
                            
                            <div className="player-metric">
                              <span className="metric-label">Readiness</span>
                              <span className="metric-value">{player.readiness || '0'}%</span>
                              <div className="player-progress">
                                <div 
                                  className="player-progress-bar readiness-bar"
                                  style={{ width: `${player.readiness || 0}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="player-metric">
                              <span className="metric-label">Fatigue</span>
                              <span className="metric-value">{player.fatigue || '0'}%</span>
                              <div className="player-progress">
                                <div 
                                  className="player-progress-bar fatigue-bar"
                                  style={{ width: `${player.fatigue || 0}%` }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="player-card-footer">
                              <button className="view-profile-btn">View Full Profile</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
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