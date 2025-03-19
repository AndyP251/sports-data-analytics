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
  
  /* Dev Mode Styles */
  .dev-mode-toggle {
    display: flex;
    align-items: center;
    margin-right: 20px;
  }
  
  .toggle-label {
    margin-right: 10px;
    color: #9e9e9e;
  }
  
  .toggle-label span.active {
    color: #ffffff;
    font-weight: 600;
  }
  
  .switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
  }
  
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #444;
    transition: .3s;
  }
  
  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .3s;
  }
  
  input:checked + .slider {
    background-color: #007bff;
  }
  
  input:checked + .slider:before {
    transform: translateX(20px);
  }
  
  .slider.round {
    border-radius: 34px;
  }
  
  .slider.round:before {
    border-radius: 50%;
  }
  
  /* Raw Data Styles */
  .raw-data-section {
    background-color: #1e1e1e;
    border-radius: 12px;
    padding: 20px;
    margin-top: 20px;
  }
  
  .raw-data-player-select {
    margin-bottom: 20px;
  }
  
  .player-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }
  
  .player-select-btn {
    padding: 8px 15px;
    background-color: #333;
    color: #e0e0e0;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .player-select-btn:hover {
    background-color: #444;
  }
  
  .player-select-btn.active {
    background-color: #007bff;
    color: white;
  }
  
  .raw-data-display {
    background-color: #2a2a2a;
    border-radius: 8px;
    padding: 15px;
  }
  
  .raw-data-json {
    background-color: #1a1a1a;
    padding: 15px;
    border-radius: 5px;
    color: #e0e0e0;
    font-family: monospace;
    font-size: 13px;
    overflow-x: auto;
    max-height: 500px;
    overflow-y: auto;
  }
  
  .loading-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 50px 0;
    color: #9e9e9e;
  }
  
  .loading-data .mini-spinner {
    margin-bottom: 15px;
  }
  
  /* Section Actions Styles */
  .section-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .action-button {
    margin-left: 10px;
    padding: 6px 12px;
    border-radius: 4px;
    background-color: #2b5797;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  }
  
  .action-button:hover {
    background-color: #1e3a6e;
  }
  
  .action-button:disabled {
    background-color: #62738f;
    cursor: not-allowed;
  }
  
  /* Special button styles */
  .sync-button {
    background-color: #0c7b93;
  }
  
  .sync-button:hover {
    background-color: #096680;
  }
  
  .action-button:first-child {
    margin-left: 0;
  }
  
  /* Data source indicator */
  .data-source {
    display: inline-block;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 3px;
    margin-left: 8px;
  }
  
  .data-source.api {
    background-color: #4caf50;
    color: white;
  }
  
  .data-source.mock {
    background-color: #ff9800;
    color: white;
  }
  
  /* Position Comparison Styles */
  .position-comparison-section,
  .training-optimization-section {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .api-endpoint-note {
    font-size: 13px;
    color: #9e9e9e;
    margin-bottom: 15px;
  }
  
  .api-endpoint-note code {
    background-color: #2a2a2a;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: monospace;
  }
  
  .notable-differences {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }
  
  .difference-card {
    background-color: #2a2a2a;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .difference-card h5 {
    margin: 0 0 10px 0;
    color: #ffffff;
    font-size: 16px;
  }
  
  .difference-percent {
    font-size: 14px;
    font-weight: 600;
    color: #ff9800;
    margin: 5px 0;
  }
  
  .position-comparison {
    display: flex;
    justify-content: space-between;
    margin: 10px 0;
    background-color: #333;
    border-radius: 5px;
    padding: 8px;
  }
  
  .comparison-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 48%;
  }
  
  .comparison-item.highest .position-value {
    color: #4caf50;
  }
  
  .comparison-item.lowest .position-value {
    color: #f44336;
  }
  
  .position-name {
    font-size: 13px;
    color: #e0e0e0;
    margin-bottom: 5px;
  }
  
  .position-value {
    font-size: 16px;
    font-weight: 600;
  }
  
  .insight {
    font-size: 13px;
    color: #bdbdbd;
    font-style: italic;
    margin: 10px 0 0 0;
    line-height: 1.4;
  }
  
  /* Training Optimization Styles */
  .position-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 15px 0;
  }
  
  .position-opt-btn {
    padding: 6px 12px;
    background-color: #333;
    color: #e0e0e0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }
  
  .position-opt-btn:hover {
    background-color: #444;
  }
  
  .position-opt-btn.active {
    background-color: #007bff;
    color: white;
  }
  
  .optimization-placeholder {
    background-color: #2a2a2a;
    border-radius: 8px;
    padding: 15px;
  }
  
  .placeholder-recommendations {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }
  
  .recommendation-card {
    background-color: #333;
    border-radius: 8px;
    padding: 15px;
    border-left: 4px solid;
  }
  
  .recommendation-card.high {
    border-left-color: #f44336;
  }
  
  .recommendation-card.medium {
    border-left-color: #ff9800;
  }
  
  .recommendation-card.low {
    border-left-color: #4caf50;
  }
  
  .recommendation-header {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .priority-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 8px;
  }
  
  .priority-indicator.high {
    background-color: #f44336;
  }
  
  .priority-indicator.medium {
    background-color: #ff9800;
  }
  
  .priority-indicator.low {
    background-color: #4caf50;
  }
  
  .recommendation-card h5 {
    margin: 0;
    font-size: 15px;
    color: #ffffff;
  }
  
  .recommendation-card p {
    font-size: 13px;
    color: #e0e0e0;
    margin: 5px 0 10px 0;
    line-height: 1.4;
  }
  
  .metrics-involved {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 10px;
  }
  
  .metric-tag {
    padding: 4px 8px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    font-size: 12px;
    color: #e0e0e0;
  }
`;

const CoachDashboard = () => {
  const [coachInfo, setCoachInfo] = useState({
    username: '',
    team: '',
    team_id: '',
    specialization: '',
    athletes: [],
    team_athletes: []
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
  const [devMode, setDevMode] = useState(true); // Dev mode on by default
  const [rawPlayerData, setRawPlayerData] = useState({});
  const [selectedRawPlayer, setSelectedRawPlayer] = useState(null);
  const [positionComparisonData, setPositionComparisonData] = useState(null);
  const [optimizationPosition, setOptimizationPosition] = useState(null);
  const [trainingOptimizationData, setTrainingOptimizationData] = useState(null);
  const [syncError, setSyncError] = useState(null); // New state for sync error messages
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
          athletes: authData.team_athletes || [],
          team_athletes: authData.team_athletes || []
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
  coachInfo.team_athletes.forEach(athlete => {
    const position = athlete.position || 'Unknown';
    if (positions.hasOwnProperty(position)) {
      positions[position]++;
    } else {
      positions['Unknown']++;
    }
  });

  // Effect to fetch biometric data when team tab is selected
  useEffect(() => {
    if (activeTab === 'team' && coachInfo.team_athletes.length > 0) {
      if (devMode) {
        // Use the direct fetch method instead of fetchRealBiometricData
        fetchDirectAthleteData();
      } else {
        fetchTeamBiometricData();
      }
    }
  }, [activeTab, coachInfo.team_athletes, devMode]);

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

  // Toggle dev mode
  const toggleDevMode = () => {
    const newDevMode = !devMode;
    setDevMode(newDevMode);
    
    // If switching to dev mode, fetch real data
    if (newDevMode && activeTab === 'team') {
      fetchRealBiometricData();
    } else if (!newDevMode && activeTab === 'team') {
      // If switching to mock mode, generate mock data
      fetchTeamBiometricData();
    }
    
    // If switching from dev mode and we're on the raw data tab, switch to team tab
    if (!newDevMode && activeTab === 'raw-data') {
      setActiveTab('team');
    }
  };

  // Helper function to get cookie by name
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Ensure we have a valid CSRF token
  const ensureCSRFToken = async () => {
    // Try to get the existing CSRF token
    let csrftoken = getCookie('csrftoken');
    
    // If there's no token, get one by making a GET request to an endpoint that sets CSRF cookies
    if (!csrftoken) {
      console.log("No CSRF token found, fetching a new one...");
      try {
        // Make a GET request to a Django view that sets the CSRF cookie
        await fetch('/api/verify-dev-password/', {
          method: 'GET',
          credentials: 'include',
        });
        
        // Try to get the token again
        csrftoken = getCookie('csrftoken');
        console.log("New CSRF token obtained:", csrftoken ? "Yes" : "No");
      } catch (error) {
        console.error("Error obtaining CSRF token:", error);
      }
    }
    
    return csrftoken;
  };

  // Update the fetchRealBiometricData function to use proper authentication
  const fetchRealBiometricData = async () => {
    if (!coachInfo || !coachInfo.team_id) {
      console.error("Coach information or team ID not available");
      return;
    }
    
    setSyncError(null);
    setLoadingBiometrics(true);
    
    try {
      // Ensure we have a valid CSRF token
      const csrfToken = await ensureCSRFToken();
      
      if (!csrfToken) {
        console.error("Failed to obtain CSRF token");
        setSyncError("Authentication error: Failed to obtain security token");
        setLoadingBiometrics(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        'X-CSRF-TOKEN': csrfToken,
        'CSRF-Token': csrfToken
      };
      
      // First attempt a direct database query using core_biometric_data table
      // This is a custom approach to bypass the 404 issues with standard endpoints
      try {
        console.log("Attempting to fetch data directly from CoreBiometricData...");
        
        // Get all athlete IDs from the team athletes in the coachInfo
        const athletes = coachInfo.team_athletes || [];
        const athleteIds = athletes.map(athlete => athlete.id);
        
        if (athleteIds.length === 0) {
          console.warn("No athlete IDs available");
          setSyncError("No athletes found in the team roster");
          setLoadingBiometrics(false);
          return;
        }
        
        console.log(`Attempting to fetch biometric data for ${athleteIds.length} athletes`);
        
        // Use a special endpoint to directly query the database
        const dbDataResponse = await fetch('/api/biometrics/db-info/', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            athlete_ids: athleteIds,
            days: 7,
            team_id: coachInfo.team_id // Include team_id to help server identify athletes
          })
        });
        
        if (dbDataResponse.ok) {
          const dbData = await dbDataResponse.json();
          console.log(`Successfully fetched CoreBiometricData for ${Object.keys(dbData.data || {}).length} athletes`);
          
          // Process the data from CoreBiometricData
          if (dbData && dbData.data && Object.keys(dbData.data).length > 0) {
            processCoreBiometricData(dbData.data);
            return;
          } else {
            console.warn("No CoreBiometricData found, falling back to position query");
          }
        } else {
          console.warn(`Failed to fetch CoreBiometricData: ${dbDataResponse.status}`);
          const errorText = await dbDataResponse.text();
          console.error("CoreBiometricData error:", errorText);
        }
      } catch (dbError) {
        console.error("Error fetching from CoreBiometricData:", dbError);
      }
      
      // If direct database query fails, fall back to position biometrics endpoint
      const response = await fetch('/api/coach/position-biometrics/?days=7', {
        method: 'GET',
        credentials: 'include',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Position biometric data:", data);
        
        // Check if we got meaningful data
        if (data && Object.keys(data).length > 0) {
          setTeamBiometricData(data);
          
          // Fetch athletes for each position
          for (const position of Object.keys(data)) {
            try {
              const athletesResponse = await fetch(`/api/coach/position/${position}/athletes/?days=7`, {
                method: 'GET',
                credentials: 'include',
                headers
              });
              
              if (athletesResponse.ok) {
                const athletes = await athletesResponse.json();
                
                // Update player data for this position
                setPlayerDataByPosition(prevState => ({
                  ...prevState,
                  [position]: athletes
                }));
                
                // Store raw data
                const rawData = {};
                athletes.forEach(athlete => {
                  rawData[athlete.username] = {
                    ...athlete,
                    source: 'api'
                  };
                });
                
                setRawPlayerData(prev => ({
                  ...prev,
                  ...rawData
                }));
              }
            } catch (positionError) {
              console.error(`Error fetching athletes for position ${position}:`, positionError);
            }
          }
        } else {
          // No real data available, use mock data
          console.log("No position data available, using mock data");
          fetchTeamBiometricData();
        }
      } else {
        console.warn(`Failed to fetch position biometrics: ${response.status}`);
        fetchTeamBiometricData();
      }
    } catch (error) {
      console.error('Error in fetchRealBiometricData:', error);
      setSyncError(`Error fetching biometric data: ${error.message}`);
      // Fall back to mock data
      fetchTeamBiometricData();
    } finally {
      setLoadingBiometrics(false);
    }
  };
  
  // Process data that comes directly from CoreBiometricData table
  const processCoreBiometricData = (biometricData) => {
    console.log("Processing CoreBiometricData...");
    
    try {
      // Initialize data structures
      const allPlayerData = {};
      const playersByPosition = {
        'FORWARD': [],
        'MIDFIELDER': [],
        'DEFENDER': [],
        'GOALKEEPER': [],
        'Unknown': []
      };
      
      // Track metrics by position for averages
      const metricsByPosition = {
        'FORWARD': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
        'MIDFIELDER': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
        'DEFENDER': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
        'GOALKEEPER': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
        'Unknown': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 }
      };
      
      // Process data for each athlete
      Object.entries(biometricData).forEach(([athleteId, athleteData]) => {
        // Use team_athletes array instead of athletes array
        const athlete = coachInfo.team_athletes.find(a => a.id === athleteId);
        
        if (!athlete) {
          console.warn(`Athlete with ID ${athleteId} not found in team_athletes`);
          return;
        }
        
        const position = athlete.position || 'Unknown';
        const username = athlete.username;
        
        // Calculate averages from the data
        const averages = {
          resting_heart_rate: calculateAverage(athleteData, 'resting_heart_rate'),
          hrv_ms: calculateAverage(athleteData, 'hrv_ms'),
          recovery_score: calculateAverage(athleteData, 'recovery_score'),
          sleep_hours: calculateAverage(athleteData, 'total_sleep_seconds') / 3600, // Convert seconds to hours
          total_steps: calculateAverage(athleteData, 'total_steps'),
          max_heart_rate: calculateAverage(athleteData, 'max_heart_rate'),
          vo2_max: 50, // Default value as it might not be in CoreBiometricData
          training_load: calculateAverage(athleteData, 'strain') * 10, // Scale strain as training load
          fatigue_score: 100 - (calculateAverage(athleteData, 'recovery_score') || 50),
          readiness_score: calculateAverage(athleteData, 'recovery_score')
        };
        
        // Prepare daily data
        const daily_data = athleteData.map(day => ({
          date: day.date,
          resting_heart_rate: day.resting_heart_rate,
          hrv_ms: day.hrv_ms,
          recovery_score: day.recovery_score,
          sleep_hours: day.total_sleep_seconds / 3600,
          steps: day.total_steps,
          max_heart_rate: day.max_heart_rate,
          strain: day.strain,
          // Add other metrics as needed
        }));
        
        // Store raw data for this athlete
        allPlayerData[username] = {
          athlete: {
            id: athleteId,
            username: username,
            position: position
          },
          averages: averages,
          daily_data: daily_data,
          source: 'api',
          status: "ok",
          message: "Data loaded from CoreBiometricData table"
        };
        
        // Create player record for the position
        playersByPosition[position].push({
          id: athleteId,
          firstName: username?.split(' ')[0] || '',
          lastName: username?.split(' ').slice(1).join(' ') || '',
          username: username,
          position: position,
          restingHeartRate: averages.resting_heart_rate || 0,
          hrv: averages.hrv_ms || 0,
          recoveryScore: averages.recovery_score || 0,
          sleepHours: averages.sleep_hours || 0,
          steps: averages.total_steps || 0,
          maxHeartRate: averages.max_heart_rate || 0,
          vo2max: averages.vo2_max || 0,
          trainingLoad: averages.training_load || 0,
          fatigue: averages.fatigue_score || 0,
          readiness: averages.readiness_score || 0
        });
        
        // Add to position metrics for averages
        metricsByPosition[position].count += 1;
        if (averages.resting_heart_rate) metricsByPosition[position].resting_hr += averages.resting_heart_rate;
        if (averages.hrv_ms) metricsByPosition[position].hrv_ms += averages.hrv_ms;
        if (averages.recovery_score) metricsByPosition[position].recovery_score += averages.recovery_score;
        if (averages.sleep_hours) metricsByPosition[position].sleep_hours += averages.sleep_hours;
        if (averages.total_steps) metricsByPosition[position].steps += averages.total_steps;
      });
      
      // Calculate team averages by position
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
      
      console.log("Processed CoreBiometricData:", {
        teamBiometricAverages,
        playersByPosition,
        allPlayerData
      });
      
      // Update state with the processed data
      setTeamBiometricData(teamBiometricAverages);
      setPlayerDataByPosition(playersByPosition);
      setRawPlayerData(allPlayerData);
      setSyncError(null);
      
    } catch (error) {
      console.error("Error processing CoreBiometricData:", error);
      fetchTeamBiometricData(); // Fall back to mock data
    }
  };
  
  // Helper function to calculate average of a specific field in an array of data points
  const calculateAverage = (dataArray, field) => {
    if (!dataArray || dataArray.length === 0) return null;
    
    const validValues = dataArray
      .map(item => item[field])
      .filter(value => value !== null && value !== undefined && !isNaN(value));
    
    if (validValues.length === 0) return null;
    
    const sum = validValues.reduce((acc, value) => acc + value, 0);
    return sum / validValues.length;
  };

  // Update the syncTeamData function to use proper authentication
  const syncTeamData = async () => {
    if (!coachInfo || !coachInfo.team_id) {
      setSyncError("No coach information or team ID available");
      return;
    }
    
    // Clear any previous error
    setSyncError(null);
    setLoadingBiometrics(true);
    
    try {
      // Check if there are any athletes before attempting sync
      const athletes = coachInfo.team_athletes || [];
      
      if (athletes.length === 0) {
        setSyncError("No athletes assigned to this team. Cannot sync team data without athletes.");
        setLoadingBiometrics(false);
        return;
      }
      
      // Get all athlete IDs
      const athleteIds = athletes.map(athlete => athlete.id);
      
      // Log detailed information about athletes for debugging
      console.log("Attempting to sync data for team:", coachInfo.team_id);
      console.log(`Found ${athletes.length} athletes to sync`);
      console.log("First few athletes:", athletes.slice(0, 3).map(a => ({
        id: a.id,
        username: a.username,
        permissions: a.data_permissions
      })));
      
      // Ensure we have a valid CSRF token
      const csrfToken = await ensureCSRFToken();
      
      if (!csrfToken) {
        console.error("Failed to obtain CSRF token");
        setSyncError("Authentication error: Failed to obtain security token");
        setLoadingBiometrics(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        'X-CSRF-TOKEN': csrfToken,
        'CSRF-Token': csrfToken
      };
      
      // Include all athlete IDs and team_id in the request
      const requestBody = {
        days: 7,
        force_refresh: true,
        team_id: coachInfo.team_id,
        athlete_ids: athleteIds
      };
      
      console.log(`Sending sync request for ${athleteIds.length} athletes with team_id: ${coachInfo.team_id}`);
      
      const response = await fetch('/api/coach/sync-team-data/', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      console.log('Sync response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sync response data:', data);
        setSyncError(null);
        // Success! Now refresh the data
        fetchRealBiometricData();
      } else {
        console.warn(`Failed to sync team data: ${response.status}`);
        let errorText = '';
        
        try {
          const errorResponse = await response.json();
          errorText = JSON.stringify(errorResponse);
        } catch (e) {
          // If we can't parse JSON, try to get text
          errorText = await response.text();
        }
        
        console.error('Error response:', errorText);
        
        // Display appropriate error message based on status code
        if (response.status === 400) {
          if (errorText.includes("No athletes found")) {
            setSyncError(`No athletes found for this team (Team ID: ${coachInfo.team_id}). The server cannot find the athletes even though the UI shows ${athletes.length} athletes. This may be a server-side issue.`);
          } else {
            setSyncError(`Bad request: ${errorText}`);
          }
        } else if (response.status === 403) {
          setSyncError("Permission denied. You may not have the required access level.");
        } else if (response.status === 500) {
          setSyncError("Server error. Please try again later or contact support.");
        } else {
          setSyncError(`Failed to sync team data: ${response.status} - ${errorText || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error syncing team data:', error);
      setSyncError(`Error syncing team data: ${error.message}`);
    } finally {
      setLoadingBiometrics(false);
    }
  };

  // Update the fetchPositionComparison function to use proper authentication
  const fetchPositionComparison = async () => {
    setSyncError(null); // Clear any previous errors
    setLoadingBiometrics(true);
    
    try {
      // Check if there are any athletes before attempting to fetch data
      if (coachInfo.athletes.length === 0) {
        setSyncError("No athletes assigned to this team. Cannot fetch position comparison data.");
        setLoadingBiometrics(false);
        return;
      }
      
      // Ensure we have a valid CSRF token
      const csrfToken = await ensureCSRFToken();
      
      if (!csrfToken) {
        console.error("Failed to obtain CSRF token");
        setSyncError("Authentication error: Failed to obtain security token");
        setLoadingBiometrics(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        'X-CSRF-TOKEN': csrfToken,
        'CSRF-Token': csrfToken
      };
      
      const response = await fetch('/api/coach/position-comparison/', {
        method: 'GET',
        credentials: 'include',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Position comparison data:', data);
        
        // Check if we got meaningful data
        if (!data || !data.notable_differences) {
          setSyncError("No position comparison data available. You may need to sync team data first.");
          setLoadingBiometrics(false);
          return;
        }
        
        setPositionComparisonData(data);
      } else {
        console.warn('Failed to fetch position comparison data');
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        // Display appropriate error message based on status code
        if (response.status === 400) {
          setSyncError("Bad request: The server couldn't process the position comparison request.");
        } else if (response.status === 403) {
          setSyncError("Permission denied. You may not have the required access level.");
        } else if (response.status === 404) {
          setSyncError("Position comparison data not found. Try syncing team data first.");
        } else {
          setSyncError(`Failed to fetch position comparison data: ${response.status} - ${errorText || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error fetching position comparison data:', error);
      setSyncError(`Error fetching position comparison data: ${error.message}`);
    } finally {
      setLoadingBiometrics(false);
    }
  };

  // Update the fetchTrainingOptimization function to use proper authentication
  const fetchTrainingOptimization = async (position) => {
    setSyncError(null); // Clear any previous errors
    setLoadingBiometrics(true);
    
    try {
      // Check if there are any athletes before attempting to fetch data
      if (coachInfo.athletes.length === 0) {
        setSyncError("No athletes assigned to this team. Cannot fetch training optimization data.");
        setLoadingBiometrics(false);
        return;
      }
      
      // Ensure we have a valid CSRF token
      const csrfToken = await ensureCSRFToken();
      
      if (!csrfToken) {
        console.error("Failed to obtain CSRF token");
        setSyncError("Authentication error: Failed to obtain security token");
        setLoadingBiometrics(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        'X-CSRF-TOKEN': csrfToken,
        'CSRF-Token': csrfToken
      };
      
      // Build the URL with query parameters if position is provided
      let url = '/api/coach/training-optimization/';
      if (position) {
        url += `?position=${encodeURIComponent(position)}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Training optimization data:', data);
        
        // Check if we got meaningful data
        if (!data || (!data.recommendations && !data.message)) {
          setSyncError("No training optimization data available. You may need to sync team data first.");
          setLoadingBiometrics(false);
          return;
        }
        
        setTrainingOptimizationData(data);
        setOptimizationPosition(position);
      } else {
        console.warn('Failed to fetch training optimization data');
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        // Display appropriate error message based on status code
        if (response.status === 400) {
          setSyncError("Bad request: The server couldn't process the training optimization request.");
        } else if (response.status === 403) {
          setSyncError("Permission denied. You may not have the required access level.");
        } else if (response.status === 404) {
          setSyncError("Training optimization data not found. Try syncing team data first.");
        } else {
          setSyncError(`Failed to fetch training optimization data: ${response.status} - ${errorText || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error fetching training optimization data:', error);
      setSyncError(`Error fetching training optimization data: ${error.message}`);
    } finally {
      setLoadingBiometrics(false);
    }
  };

  // Function to format raw data for display
  const formatRawData = (data) => {
    if (!data) return 'No data available';
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return 'Error formatting data';
    }
  };

  // Add a function to test direct API access
  const testApiAccess = async () => {
    setSyncError(null);
    setLoadingBiometrics(true);
    
    try {
      // Ensure we have a valid CSRF token
      const csrfToken = await ensureCSRFToken();
      
      if (!csrfToken) {
        console.error("Failed to obtain CSRF token");
        setSyncError("Authentication error: Failed to obtain security token");
        setLoadingBiometrics(false);
        return;
      }

      // Make a simple API check to see the raw coach auth data
      const authResponse = await fetch('/api/check-coach-auth/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        }
      });
      
      const authData = await authResponse.json();
      console.log("Raw auth response:", authData);
      
      // Check get team athletes endpoint
      const teamsResponse = await fetch('/api/teams/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
        }
      });
      
      const teamsData = await teamsResponse.json();
      console.log("Teams response:", teamsData);
      
      // If team ID exists, try to fetch its athletes
      if (coachInfo.team_id) {
        const teamAthletesResponse = await fetch(`/api/team-athletes/${coachInfo.team_id}/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'X-CSRFToken': csrfToken,
          }
        });
        
        if (teamAthletesResponse.ok) {
          const teamAthletesData = await teamAthletesResponse.json();
          console.log(`Athletes for team ${coachInfo.team_id}:`, teamAthletesData);
        } else {
          console.error(`Failed to fetch athletes for team ${coachInfo.team_id}:`, teamAthletesResponse.status);
          const errorText = await teamAthletesResponse.text();
          console.error("Error response:", errorText);
        }
      }
      
      setSyncError("API access test completed. Check browser console for results.");
    } catch (error) {
      console.error("API access test error:", error);
      setSyncError(`API access test failed: ${error.message}`);
    } finally {
      setLoadingBiometrics(false);
    }
  };

  // Add a new function to directly fetch athlete data without using sync-team-data endpoint
  const fetchDirectAthleteData = async () => {
    if (!coachInfo || !coachInfo.team_id) {
      alert("Coach information or team ID not available");
      return;
    }
    
    // Add debug logs
    console.log("coachInfo:", coachInfo);
    console.log("team_athletes property exists:", coachInfo.hasOwnProperty("team_athletes"));
    console.log("athletes property exists:", coachInfo.hasOwnProperty("athletes"));
    
    const athletes = coachInfo.team_athletes || [];
    
    // Log the actual content
    console.log(`Athletes array (${athletes.length}):`, athletes);
    
    if (athletes.length === 0) {
      alert("No athletes assigned to this team");
      return;
    }
    
    console.log("Attempting to fetch data directly for athletes:", athletes.length);
    
    // Get CSRF token
    const csrfToken = await ensureCSRFToken();
    if (!csrfToken) {
      console.error("Failed to obtain CSRF token");
      alert("Authentication error: Failed to obtain security token");
      return;
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken
    };
    
    // Reset data structures
    const newRawPlayerData = {};
    const athletesWithData = [];
    const mockCounter = {value: 0};
    const realCounter = {value: 0};
    
    // First attempt a direct database query using CoreBiometricData table
    try {
      console.log("Attempting to fetch data directly from CoreBiometricData...");
      
      // Get all athlete IDs
      const athleteIds = athletes.map(athlete => athlete.id);
      
      // Use the db-info endpoint to query the database directly
      const dbDataResponse = await fetch('/api/biometrics/db-info/', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          athlete_ids: athleteIds,
          days: 7,
          team_id: coachInfo.team_id
        })
      });
      
      if (dbDataResponse.ok) {
        const dbData = await dbDataResponse.json();
        
        if (dbData && dbData.data && Object.keys(dbData.data).length > 0) {
          console.log(`CoreBiometricData found for ${Object.keys(dbData.data).length} athletes`);
          
          // Update raw player data with data from CoreBiometricData
          for (const athleteId in dbData.data) {
            const athlete = athletes.find(a => a.id === athleteId);
            if (athlete) {
              const formattedData = {
                athlete: athlete,
                source: 'api',
                message: `Real data from CoreBiometricData for ${athlete.username}`,
                data: dbData.data[athleteId]
              };
              
              newRawPlayerData[athlete.username] = formattedData;
              athletesWithData.push(athlete.username);
              realCounter.value++;
            }
          }
          
          // If we've found data for all athletes in CoreBiometricData, skip individual fetches
          if (Object.keys(dbData.data).length === athletes.length) {
            setRawPlayerData(newRawPlayerData);
            setPlayerList(athletesWithData);
            
            if (athletesWithData.length > 0 && !selectedRawPlayer) {
              setSelectedRawPlayer(athletesWithData[0]);
            }
            
            alert(`Successfully retrieved real data for ${realCounter.value} athletes from CoreBiometricData table!`);
            return;
          }
        } else {
          console.warn("No CoreBiometricData found, falling back to individual athlete endpoints");
        }
      } else {
        console.warn(`Failed to fetch CoreBiometricData: ${dbDataResponse.status}`);
      }
    } catch (dbError) {
      console.error("Error fetching from CoreBiometricData:", dbError);
    }
    
    // If we didn't get data for all athletes from CoreBiometricData, fall back to individual fetching
    for (const athlete of athletes) {
      // Skip athletes we already have data for
      if (newRawPlayerData[athlete.username]) {
        continue;
      }
      
      const position = athlete.position || 'UNKNOWN';
      console.log(`Fetching data for athlete: ${athlete.username}, position: ${position}`);
      
      try {
        // First attempt to get real data from the API
        const response = await fetch(`/api/coach/athlete/${athlete.id}/biometrics/?days=7`, {
          method: 'GET',
          credentials: 'include',
          headers
        });
        
        if (response.ok) {
          const data = await response.json();
          newRawPlayerData[athlete.username] = {
            athlete: athlete,
            source: 'api',
            message: `Real data for ${athlete.username}`,
            data: data
          };
          athletesWithData.push(athlete.username);
          realCounter.value++;
        } else {
          console.warn(`Failed to fetch data for athlete ${athlete.username}: ${response.status}`);
          
          // Fallback to using mock data if the API fails
          const mockData = generateMockAthleteData(athlete);
          newRawPlayerData[athlete.username] = {
            athlete: athlete,
            source: 'mock',
            message: `Mock data generated for ${athlete.username}`,
            data: mockData
          };
          console.log(`Generated mock data for ${athlete.username}:`, mockData);
          athletesWithData.push(athlete.username);
          mockCounter.value++;
        }
      } catch (error) {
        console.error(`Error fetching data for athlete ${athlete.username}:`, error);
        // Still provide mock data in case of error
        const mockData = generateMockAthleteData(athlete);
        newRawPlayerData[athlete.username] = {
          athlete: athlete,
          source: 'mock',
          message: `Mock data generated for ${athlete.username} (after error)`,
          data: mockData
        };
        athletesWithData.push(athlete.username);
        mockCounter.value++;
      }
    }
    
    // Update state with collected data
    setRawPlayerData(newRawPlayerData);
    setPlayerList(athletesWithData);
    
    if (athletesWithData.length > 0 && !selectedRawPlayer) {
      setSelectedRawPlayer(athletesWithData[0]);
    }
    
    alert(`Direct fetch complete! Real data: ${realCounter.value} athletes, Mock data: ${mockCounter.value} athletes`);
  };

  // Helper function to generate mock data for all athletes
  const generateMockDataForAllAthletes = () => {
    const allPlayerData = {};
    const playersByPosition = {
      'FORWARD': [],
      'MIDFIELDER': [],
      'DEFENDER': [],
      'GOALKEEPER': [],
      'Unknown': []
    };
    
    const metricsByPosition = {
      'FORWARD': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
      'MIDFIELDER': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
      'DEFENDER': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
      'GOALKEEPER': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 },
      'Unknown': { count: 0, resting_hr: 0, hrv_ms: 0, recovery_score: 0, sleep_hours: 0, steps: 0 }
    };
    
    // Generate mock data for each athlete
    // Use team_athletes array instead of athletes array
    if (!coachInfo || !coachInfo.team_athletes) {
      console.error("No team_athletes array available in coachInfo");
      return;
    }
    
    coachInfo.team_athletes.forEach(athlete => {
      const position = athlete.position || 'Unknown';
      const mockData = generateMockAthleteData(athlete);
      const averages = mockData.averages;
      
      // Store raw data
      allPlayerData[athlete.username] = {
        ...mockData,
        source: 'mock'
      };
      
      // Create player record
      playersByPosition[position].push({
        id: athlete.id,
        firstName: athlete.username?.split(' ')[0] || '',
        lastName: athlete.username?.split(' ').slice(1).join(' ') || '',
        username: athlete.username,
        position: position,
        restingHeartRate: averages.resting_heart_rate,
        hrv: averages.hrv_ms,
        recoveryScore: averages.recovery_score,
        sleepHours: averages.sleep_hours,
        steps: averages.total_steps,
        maxHeartRate: averages.max_heart_rate,
        vo2max: averages.vo2_max,
        trainingLoad: averages.training_load,
        fatigue: averages.fatigue_score,
        readiness: averages.readiness_score
      });
      
      // Add to position metrics
      metricsByPosition[position].count += 1;
      metricsByPosition[position].resting_hr += averages.resting_heart_rate;
      metricsByPosition[position].hrv_ms += averages.hrv_ms;
      metricsByPosition[position].recovery_score += averages.recovery_score;
      metricsByPosition[position].sleep_hours += averages.sleep_hours;
      metricsByPosition[position].steps += averages.total_steps;
    });
    
    // Calculate position averages
    const teamBiometricAverages = {};
    
    for (const [position, metrics] of Object.entries(metricsByPosition)) {
      if (metrics.count > 0) {
        teamBiometricAverages[position] = {
          count: metrics.count,
          resting_hr: metrics.resting_hr / metrics.count,
          hrv_ms: metrics.hrv_ms / metrics.count,
          recovery_score: metrics.recovery_score / metrics.count,
          sleep_hours: metrics.sleep_hours / metrics.count,
          steps: metrics.steps / metrics.count
        };
      }
    }
    
    return {
      allPlayerData,
      playersByPosition,
      teamBiometricAverages
    };
  };

  // Add a function to generate realistic mock data for an athlete
  const generateMockAthleteData = (athlete) => {
    const { id, username, position } = athlete;
    
    // Use the ID as a seed for pseudorandom values
    const numericSeed = parseInt(id.replace(/[^0-9]/g, '').substring(0, 8), 10) || 123456;
    const seed = numericSeed / 100000000;
    
    // Helper function to generate consistent random values
    const getRandomValue = (min, max, seedOffset = 0) => {
      const randomValue = Math.sin(seed + seedOffset) * 10000;
      return min + (Math.abs(randomValue) % 1) * (max - min);
    };
    
    // Generate position-specific mock data
    const positionAdjustments = {
      FORWARD: {
        resting_heart_rate: 5,  // Higher for forwards
        hrv_ms: -8,
        recovery_score: -5,
        sleep_hours: -0.5,
        max_heart_rate: 8,
        vo2_max: 3,
        training_load: 20,
        fatigue_score: 10,
        readiness_score: -5
      },
      MIDFIELDER: {
        resting_heart_rate: 3,
        hrv_ms: -5,
        recovery_score: -3,
        sleep_hours: -0.3,
        max_heart_rate: 5,
        vo2_max: 5,
        training_load: 15,
        fatigue_score: 8,
        readiness_score: -3
      },
      DEFENDER: {
        resting_heart_rate: 0,
        hrv_ms: 0,
        recovery_score: 0,
        sleep_hours: 0,
        max_heart_rate: 0,
        vo2_max: 0,
        training_load: 0,
        fatigue_score: 0,
        readiness_score: 0
      },
      GOALKEEPER: {
        resting_heart_rate: -3,
        hrv_ms: 8,
        recovery_score: 5,
        sleep_hours: 0.3,
        max_heart_rate: -5,
        vo2_max: -2,
        training_load: -10,
        fatigue_score: -5,
        readiness_score: 5
      }
    };
    
    // Get adjustments for this athlete's position
    const adjustments = positionAdjustments[position] || positionAdjustments.DEFENDER;
    
    // Generate base metrics with some randomness but consistent for the same athlete
    const baseSleepHours = getRandomValue(6.5, 8.5, 0.1);
    const baseHRV = getRandomValue(50, 85, 0.2);
    const baseRestingHR = getRandomValue(52, 65, 0.3);
    const baseRecoveryScore = getRandomValue(65, 95, 0.4);
    const baseReadiness = getRandomValue(70, 95, 0.5);
    
    // Create mock biometric data
    const mockBiometricData = {
      athlete: {
        id,
        name: username,
        position: position || 'Unknown'
      },
      averages: {
        resting_heart_rate: Math.round(baseRestingHR + adjustments.resting_heart_rate),
        hrv_ms: Math.round(baseHRV + adjustments.hrv_ms),
        recovery_score: Math.round(baseRecoveryScore + adjustments.recovery_score),
        sleep_hours: parseFloat((baseSleepHours + adjustments.sleep_hours).toFixed(1)),
        total_steps: Math.round(getRandomValue(8000, 15000, 0.6)),
        max_heart_rate: Math.round(getRandomValue(180, 195, 0.7) + adjustments.max_heart_rate),
        vo2_max: Math.round(getRandomValue(48, 60, 0.8) + adjustments.vo2_max),
        training_load: Math.round(getRandomValue(250, 350, 0.9) + adjustments.training_load),
        fatigue_score: Math.round(getRandomValue(30, 70, 1.0) + adjustments.fatigue_score),
        readiness_score: Math.round(baseReadiness + adjustments.readiness_score)
      },
      // Daily data for last 7 days
      daily_data: Array.from({ length: 7 }, (_, i) => {
        const dayOffset = i / 10;
        return {
          date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
          resting_heart_rate: Math.round(baseRestingHR + adjustments.resting_heart_rate + getRandomValue(-3, 3, dayOffset)),
          hrv_ms: Math.round(baseHRV + adjustments.hrv_ms + getRandomValue(-5, 5, dayOffset + 0.1)),
          recovery_score: Math.round(baseRecoveryScore + adjustments.recovery_score + getRandomValue(-8, 8, dayOffset + 0.2)),
          sleep_hours: parseFloat((baseSleepHours + adjustments.sleep_hours + getRandomValue(-0.5, 0.5, dayOffset + 0.3)).toFixed(1)),
          total_steps: Math.round(getRandomValue(7000, 16000, dayOffset + 0.4)),
          training_load: i % 2 === 0 ? Math.round(getRandomValue(230, 370, dayOffset + 0.5)) : null // Training days with rest days
        };
      }),
      status: "ok",
      message: "Mock data generated for " + username
    };
    
    return mockBiometricData;
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
          
          {/* Dev Mode Toggle */}
          <div className="dev-mode-toggle">
            <div className="toggle-label">
              <span className={devMode ? 'active' : ''}>Dev Mode</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={devMode} 
                onChange={toggleDevMode}
              />
              <span className="slider round"></span>
            </label>
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
        {devMode && (
          <div 
            className={`dashboard-tab ${activeTab === 'raw-data' ? 'active' : ''}`}
            onClick={() => setActiveTab('raw-data')}
          >
            Raw Data
          </div>
        )}
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
              {devMode && (
                <div className="section-actions">
                  <button className="action-button" onClick={fetchDirectAthleteData}>
                    Direct Fetch
                  </button>
                  <button className="action-button" onClick={fetchRealBiometricData}>
                    Fetch Team Data
                  </button>
                  <button className="action-button sync-button" onClick={syncTeamData}>
                    Sync Team Data
                  </button>
                </div>
              )}
            </div>

            {/* Display sync errors if any */}
            {syncError && (
              <div className="error-message" style={{
                backgroundColor: "#2a0000", 
                color: "#ff6b6b", 
                padding: "12px", 
                borderRadius: "8px", 
                marginBottom: "16px",
                border: "1px solid #ff6b6b"
              }}>
                <strong>Error:</strong> {syncError}
              </div>
            )}

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
                    {coachInfo.athletes.length === 0 && (
                      <div className="empty-team-notice" style={{
                        marginTop: "15px", 
                        padding: "10px", 
                        backgroundColor: "#2a0000", 
                        borderRadius: "8px", 
                        border: "1px solid #ff6b6b"
                      }}>
                        <p style={{ color: "#ff6b6b" }}><strong>Notice:</strong> Your team has no athletes assigned.</p>
                        <p style={{ color: "#ff9e9e", fontSize: "14px" }}>You need to add athletes to your team before you can sync or view biometric data.</p>
                      </div>
                    )}
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
                              <h4 className="player-name">
                                {player.firstName || ''} {player.lastName || ''}
                                {rawPlayerData[player.username]?.source && (
                                  <span className={`data-source ${rawPlayerData[player.username].source}`} style={{fontSize: '10px', marginLeft: '5px', padding: '1px 4px', fontWeight: 'normal'}}>
                                    {rawPlayerData[player.username].source === 'api' ? 'API' : 'Mock'}
                                  </span>
                                )}
                              </h4>
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

        {/* Raw Data Tab - Only visible in Dev Mode */}
        {activeTab === 'raw-data' && devMode && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Raw Player Data</h2>
              <div className="section-actions">
                <button className="action-button" onClick={fetchDirectAthleteData}>
                  Direct Fetch
                </button>
                <button className="action-button" onClick={fetchRealBiometricData}>
                  Fetch Team Data
                </button>
                <button className="action-button sync-button" onClick={syncTeamData}>
                  Sync Team Data
                </button>
              </div>
            </div>

            {/* Display sync errors if any */}
            {syncError && (
              <div className="error-message" style={{
                backgroundColor: "#2a0000", 
                color: "#ff6b6b", 
                padding: "12px", 
                borderRadius: "8px", 
                marginBottom: "16px",
                border: "1px solid #ff6b6b"
              }}>
                <strong>Error:</strong> {syncError}
              </div>
            )}

            {/* Debug Information Section */}
            <div className="debug-section" style={{
              backgroundColor: "#1a1a1a",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: "1px solid #333"
            }}>
              <h3 style={{ color: "#4dabf7", marginTop: 0 }}>Debug Information</h3>
              
              <div style={{ marginBottom: "15px", color: "#e0e0e0", fontSize: "14px", lineHeight: "1.5" }}>
                <p><strong>Data Fetch Methods:</strong></p>
                <ul style={{ paddingLeft: "20px" }}>
                  <li><strong>Direct Fetch:</strong> First attempts to query CoreBiometricData directly from the database, then falls back to athlete API endpoints with mock data generation. This is the recommended method.</li>
                  <li><strong>Fetch Team Data:</strong> Similar to Direct Fetch but focuses on position-based data aggregation first.</li>
                  <li><strong>Sync Team Data:</strong> Attempts to sync team data via <code>/api/coach/sync-team-data/</code> (currently failing with No Athletes error).</li>
                </ul>
                <p><strong>CoreBiometricData Integration:</strong> Both Direct Fetch and Fetch Team Data now query the CoreBiometricData table directly through the <code>/api/biometrics/db-info/</code> endpoint when fetching actual athlete data from the database.</p>
              </div>
              
              <div style={{ marginBottom: "15px" }}>
                <button 
                  onClick={testApiAccess}
                  style={{
                    backgroundColor: "#2b5797",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginBottom: "15px",
                    marginRight: "10px"
                  }}
                >
                  Test API Access
                </button>
                
                <button 
                  onClick={async () => {
                    try {
                      const csrfToken = await ensureCSRFToken();
                      const athleteIds = coachInfo.team_athletes.map(athlete => athlete.id);
                      
                      console.log(`Using ${athleteIds.length} athlete IDs from team_athletes for direct DB query`);
                      
                      const response = await fetch('/api/biometrics/db-info/', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                          'Content-Type': 'application/json',
                          'X-CSRFToken': csrfToken
                        },
                        body: JSON.stringify({
                          athlete_ids: athleteIds,
                          days: 7,
                          team_id: coachInfo.team_id
                        })
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        console.log("CoreBiometricData Query Results:", data);
                        alert(`Query successful! Found data for ${Object.keys(data.data || {}).length} athletes.`);
                      } else {
                        console.error("Failed to query CoreBiometricData:", response.status);
                        alert(`Failed to query CoreBiometricData: ${response.status}`);
                      }
                    } catch (error) {
                      console.error("Error querying CoreBiometricData:", error);
                      alert(`Error: ${error.message}`);
                    }
                  }}
                  style={{
                    backgroundColor: "#0C7B93",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginBottom: "15px"
                  }}
                >
                  Query CoreBiometricData
                </button>
                
                <h4 style={{ color: "#e0e0e0", marginBottom: "5px" }}>Team Information:</h4>
                <pre style={{ 
                  backgroundColor: "#2a2a2a", 
                  padding: "10px", 
                  borderRadius: "5px", 
                  overflow: "auto",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  color: "#e0e0e0"
                }}>
                  {JSON.stringify({
                    team_name: coachInfo.team,
                    team_id: coachInfo.team_id,
                    athlete_count: coachInfo.team_athletes.length,
                  }, null, 2)}
                </pre>
              </div>

              <div>
                <h4 style={{ color: "#e0e0e0", marginBottom: "5px" }}>Athletes Summary:</h4>
                <pre style={{ 
                  backgroundColor: "#2a2a2a", 
                  padding: "10px", 
                  borderRadius: "5px", 
                  overflow: "auto",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  color: "#e0e0e0",
                  maxHeight: "300px"
                }}>
                  {JSON.stringify(coachInfo.team_athletes.map(a => ({
                    id: a.id,
                    username: a.username,
                    email: a.email,
                    position: a.position,
                    data_permissions: a.data_permissions
                  })), null, 2)}
                </pre>
              </div>
            </div>

            {loadingBiometrics ? (
              <div className="loading-data">
                <div className="mini-spinner"></div>
                <p>Loading raw biometric data...</p>
              </div>
            ) : Object.keys(rawPlayerData).length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No raw data available</h3>
                <p>No biometric data could be fetched from the API. Try using the Sync Team Data button to manually trigger a sync.</p>
                {coachInfo.athletes.length === 0 && (
                  <p className="error-hint" style={{ color: "#ff6b6b", marginTop: "10px" }}>
                    Note: Your team has no athletes assigned. Please add athletes to your team first.
                  </p>
                )}
              </div>
            ) : (
              <div className="raw-data-section">
                <div className="raw-data-player-select">
                  <h3>Select Athlete</h3>
                  <div className="player-selector">
                    {Object.keys(rawPlayerData).map(username => (
                      <button
                        key={username}
                        className={`player-select-btn ${selectedRawPlayer === username ? 'active' : ''}`}
                        onClick={() => setSelectedRawPlayer(username)}
                      >
                        {username}
                      </button>
                    ))}
                  </div>
                </div>
                
                {selectedRawPlayer && (
                  <div className="raw-data-display">
                    <h3>Data for {selectedRawPlayer}
                      {rawPlayerData[selectedRawPlayer]?.source && (
                        <span className={`data-source ${rawPlayerData[selectedRawPlayer].source}`}>
                          {rawPlayerData[selectedRawPlayer].source === 'api' ? 'API Data' : 'Mock Data'}
                        </span>
                      )}
                    </h3>
                    
                    {rawPlayerData[selectedRawPlayer]?.message && (
                      <div className="data-source-info" style={{
                        margin: '10px 0',
                        padding: '8px 12px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '4px',
                        fontSize: '13px',
                        color: '#e0e0e0'
                      }}>
                        <strong>Source Info:</strong> {rawPlayerData[selectedRawPlayer].message}
                      </div>
                    )}
                    
                    <pre className="raw-data-json">
                      {formatRawData(rawPlayerData[selectedRawPlayer])}
                    </pre>
                  </div>
                )}
                
                {/* Position Comparison Section */}
                <div className="position-comparison-section">
                  <h3>Position Comparison Data</h3>
                  <p className="api-endpoint-note">This data comes from the <code>/api/coach/position-comparison/</code> endpoint</p>
                  
                  <button 
                    className="action-button"
                    onClick={() => fetchPositionComparison()}
                  >
                    Load Position Comparison
                  </button>
                  
                  {positionComparisonData && (
                    <div className="comparison-data">
                      <h4>Notable Differences Between Positions</h4>
                      {positionComparisonData.notable_differences && 
                       positionComparisonData.notable_differences.length > 0 ? (
                        <div className="notable-differences">
                          {positionComparisonData.notable_differences.map((diff, idx) => (
                            <div key={idx} className="difference-card">
                              <h5>{diff.metric.replace('_', ' ').toUpperCase()}</h5>
                              <p className="difference-percent">{diff.difference_percent}% difference</p>
                              <div className="position-comparison">
                                <div className="comparison-item highest">
                                  <span className="position-name">{diff.highest_position}</span>
                                  <span className="position-value">{diff.highest_value}</span>
                                </div>
                                <div className="comparison-item lowest">
                                  <span className="position-name">{diff.lowest_position}</span>
                                  <span className="position-value">{diff.lowest_value}</span>
                                </div>
                              </div>
                              <p className="insight">{diff.insight}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No significant differences found between positions</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Training Optimization Section */}
                <div className="training-optimization-section">
                  <h3>Training Optimization</h3>
                  <p className="api-endpoint-note">This data comes from the <code>/api/coach/training-optimization/</code> endpoint</p>
                  
                  <div className="position-selector">
                    <button 
                      className={`position-opt-btn ${optimizationPosition === null ? 'active' : ''}`}
                      onClick={() => fetchTrainingOptimization(null)}
                    >
                      All Positions
                    </button>
                    {Object.keys(playerDataByPosition)
                      .filter(pos => playerDataByPosition[pos].length > 0)
                      .map(pos => (
                        <button 
                          key={pos}
                          className={`position-opt-btn ${optimizationPosition === pos ? 'active' : ''}`}
                          onClick={() => fetchTrainingOptimization(pos)}
                        >
                          {pos}
                        </button>
                      ))
                    }
                  </div>
                  
                  {trainingOptimizationData && (
                    <div className="optimization-data">
                      <h4>Recommendations for {trainingOptimizationData.position}</h4>
                      {trainingOptimizationData.status === 'scaffold' ? (
                        <div className="optimization-placeholder">
                          <p>{trainingOptimizationData.message}</p>
                          <div className="placeholder-recommendations">
                            {trainingOptimizationData.recommendations?.map((rec, idx) => (
                              <div key={idx} className={`recommendation-card ${rec.priority}`}>
                                <div className="recommendation-header">
                                  <span className={`priority-indicator ${rec.priority}`}></span>
                                  <h5>{rec.title}</h5>
                                </div>
                                <p>{rec.description}</p>
                                <div className="metrics-involved">
                                  {rec.metrics_involved.map(metric => (
                                    <span key={metric} className="metric-tag">{metric}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p>{trainingOptimizationData.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachDashboard;