import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar, ComposedChart
} from 'recharts';
import { 
  Card, Grid, Typography, Box, Button, 
  CircularProgress, Alert, useTheme,
  AppBar, Toolbar, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent,
  Tabs, Tab, styled, Select, FormControl, Switch, Tooltip as MuiTooltip
} from '@mui/material';
import { format } from 'date-fns';
import SyncIcon from '@mui/icons-material/Sync';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';
import BugReportIcon from '@mui/icons-material/BugReport';
import TableChartIcon from '@mui/icons-material/TableChart';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import HeartRateMetrics from '../HeartRateMetrics';
import axios from 'axios';
import WhoopConnect from '../WhoopConnect';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import FavoriteIcon from '@mui/icons-material/Favorite';
import RestoreIcon from '@mui/icons-material/Restore';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import './BiometricsDashboard.css';

// Modern, professional color palette
const colors = {
  primary: '#2C3E50',   // Deep blue-gray
  secondary: '#3498DB', // Bright blue
  accent1: '#27AE60',   // Emerald green
  accent2: '#E74C3C',   // Coral red
  accent3: '#F1C40F',   // Sunflower yellow
  background: '#ECF0F1', // Light gray
  text: 'white',        // Changed back to white
  headings: 'white',    // Changed back to white
  success: '#2ECC71',   // Green
  warning: '#F39C12',   // Orange
  error: '#E74C3C',     // Red
};

// Add this constant for developer-only fields
const DEVELOPER_FIELDS = [
  'id',
  'athlete_id',
  'athlete',
  'user_id',
  'created_at',
  'updated_at',
  'source',
  'email',
  'first_name',
  'last_name',
  'gender',
  'birthdate',
];

// Styled components for better animations and aesthetics
const StyledMenu = styled((props) => (
  <Menu
    elevation={3}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 180,
    backgroundColor: '#2C3E50',
    color: '#fff',
    boxShadow: 'rgb(255, 255, 255) 0px 0px 15px -10px',
    '& .MuiMenu-list': {
      padding: '4px 0',
    },
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  padding: '10px 20px',
  margin: '4px 8px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: 'translateX(5px)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: 20,
    color: 'inherit',
  },
  '& .MuiTypography-root': {
    fontSize: '0.95rem',
    fontWeight: 500,
  },
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
}));

const StyledTitle = styled(Typography)(({ theme }) => ({
  fontFamily: '"Poppins", sans-serif',
  fontWeight: 600,
  fontSize: '1.5rem',
  background: 'linear-gradient(45deg, #FFFFFF 30%, #ECF0F1 90%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
}));

function a11yProps(index) {
  return {
    id: `dashboard-tab-${index}`,
    'aria-controls': `dashboard-tabpanel-${index}`,
  };
}

// Add this helper function to filter out empty fields
const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number' && (value === 0 || value === 0.0)) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
};

// Update the getDataColumns function
const getDataColumns = (data, showDevFields = false) => {
  if (!data || data.length === 0) return [];
  
  // Get all possible fields from the first data point
  const allFields = Object.keys(data[0]);
  
  // Filter out developer fields if not in developer mode
  const availableFields = showDevFields 
    ? allFields 
    : allFields.filter(field => !DEVELOPER_FIELDS.includes(field));
  
  // Check which fields have non-zero/non-null values in any record
  const validFields = availableFields.filter(field => {
    return data.some(record => hasValue(record[field]));
  });
  
  // Format the field names for display
  return validFields.map(field => ({
    id: field,
    label: field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }));
};

// Add this function to format cell values
const formatCellValue = (value, fieldName) => {
  if (!hasValue(value)) return '-';
  
  // Handle different types of values
  if (typeof value === 'number') {
    // Format seconds to hours for time fields
    if (fieldName.includes('seconds')) {
      return Number((value / 3600).toFixed(2)) + ' hrs';
    }
    // Format other numeric values to 2 decimal places
    return Number.isInteger(value) ? value : Number(value.toFixed(2));
  }
  
  return value;
};

const BiometricsDashboard = ({ username }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [biometricData, setBiometricData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncMessage, setSyncMessage] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [showCredentialsMenu, setShowCredentialsMenu] = useState(false);
  const [hasActiveSources, setHasActiveSources] = useState(true);
  const [garminProfiles, setGarminProfiles] = useState([]);
  const [activeSource, setActiveSource] = useState(null);
  const [showWhoopConnect, setShowWhoopConnect] = useState(false);
  const [activeSources, setActiveSources] = useState([]);
  const [selectedDataSource, setSelectedDataSource] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [devMode, setDevMode] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    // Get the saved preference from localStorage or default to false
    const savedDarkMode = localStorage.getItem('biometricsDarkMode');
    return savedDarkMode === 'true';
  });
  
  // Update localStorage when dark mode changes
  useEffect(() => {
    localStorage.setItem('biometricsDarkMode', darkMode);
  }, [darkMode]);
  
  // Table styles based on dark mode
  const thStyle = {
    textAlign: 'left',
    padding: '12px 8px',
    border: darkMode ? '1px solid #444' : '1px solid #ccc',
    fontWeight: 'bold',
    backgroundColor: darkMode ? '#2C3E50' : '#f5f7fa',
    color: darkMode ? 'white' : '#000',
    position: 'sticky',
    top: 0,
    zIndex: 1
  };

  const tdStyle = {
    textAlign: 'left',
    padding: '8px',
    border: darkMode ? '1px solid #444' : '1px solid #ccc',
    whiteSpace: 'nowrap',
    color: darkMode ? 'white' : '#000',
    backgroundColor: darkMode ? 'rgba(44, 62, 80, 0.6)' : 'white'
  };
  
  // Override the default styles for Typography components
  const typographyStyles = {
    h6: {
      color: 'white'
    },
    body1: {
      color: 'white'
    },
    body2: {
      color: 'white'
    }
  };
  
  const sources = [
    { id: 'garmin', name: 'Garmin' },
    { id: 'whoop', name: 'WHOOP' }
  ];

  const openMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };

  const openDialog = (title, content) => {
    setDialogTitle(title);
    setDialogContent(content);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setDialogTitle('');
    setDialogContent('');
  };

  const fetchData = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setBiometricData([]);
    
    try {
      // Request 10 days of data by default
      const days = 10;
      console.log(`Fetching biometric data for ${days} days...`);
      const response = await axios.get(`/api/biometrics/?days=${days}`);
      console.log('Raw biometrics data:', response.data);
      
      // Check if we have any data
      if (!response.data || response.data.length === 0) {
        setHasActiveSources(false);
        setError('No data available. Please activate a data source.');
        return;
      }
      
      // Process the raw data array directly
      const processedData = processData(response.data);
      console.log(`Processed ${processedData.length} biometric data entries`);
      console.log('Processed biometrics data:', processedData);
      
      // Sort by date (newest first)
      processedData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setBiometricData(processedData);
      
      // If we have data but no selected source yet, set to first source
      if (processedData.length > 0 && !selectedDataSource && activeSources.length > 0) {
        setSelectedDataSource(activeSources[0].id);
      }
    } catch (error) {
      console.error('Error fetching biometric data:', error);
      setError(`Failed to fetch biometric data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSources = async () => {
    try {
      const response = await axios.get('/api/biometrics/active-sources/');
      if (response.data.success && response.data.sources.length > 0) {
        // Set active source to the first source's ID
        setActiveSource(response.data.sources[0].id);
        // Set selected data source to the first source's ID
        setSelectedDataSource(response.data.sources[0].id);
        // Store the full sources data if needed
        setActiveSources(response.data.sources);
      } else {
        setActiveSource(null);
      }
    } catch (err) {
      console.error('Error fetching active sources:', err);
      setActiveSource(null);
    }
  };

  const activateSource = async (source) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/biometrics/activate-source/', {
        source: source
      });
      if (response.data.success) {
        setActiveSource(source);
        setSyncMessage(`${source} source activated successfully!`);
        await fetchData();
      }
    } catch (err) {
      setError(`Error activating ${source}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    if (activeSource === null) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/biometrics/sync/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.cookie.split('csrftoken=')[1]?.split(';')[0],
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      const messages = [];
      console.log('Sync data:', data);
      
      // Log the general success message
      if (data.data) {
        messages.push({ text: `General Sync Status: ${data.data}`, type: 'info' });
      }
      // Iterate over the success object to determine sync status for each source
      for (const [source, success] of Object.entries(data.success)) {
        const capitalizedSource = source.charAt(0).toUpperCase() + source.slice(1);
        if (success) {
          messages.push({ text: `Successfully Synced: ${capitalizedSource}`, type: 'success' });
        } else {
          messages.push({ text: `Failed to Sync: ${capitalizedSource}`, type: 'error' });
        }
      }
      setSyncMessage(messages);
      fetchData();
    } catch (err) {
      setError(`Error syncing data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processData = (data) => {
    if (!Array.isArray(data)) {
      console.error('processData received non-array data:', data);
      return [];
    }
    
    console.log(`Processing ${data.length} data entries, dates: ${data.map(item => item.date).join(', ')}`);
    
    // Helper function to round numeric values to 2 decimal places
    const roundToTwo = (value) => {
      if (typeof value === 'number') {
        return Number(value.toFixed(2));
      }
      return value;
    };
    
    return data.map(item => {
      try {
        // Convert seconds to hours and handle null/undefined values
        const sleepHours = (item.total_sleep_seconds || 0) / 3600;
        const deepSleepHours = (item.deep_sleep_seconds || 0) / 3600;
        const lightSleepHours = (item.light_sleep_seconds || 0) / 3600;
        const remSleepHours = (item.rem_sleep_seconds || 0) / 3600;
        const awakeHours = (item.awake_seconds || 0) / 3600;

        // Format date as MM/DD for display
        let formattedDate;
        try {
          formattedDate = format(new Date(item.date), 'MM/dd');
        } catch (error) {
          console.warn(`Error formatting date ${item.date}:`, error);
          formattedDate = item.date; // Fallback to original format
        }

        const processedItem = {
          ...item,  // Keep all original data
          originalDate: item.date, // Keep original date for sorting
          date: formattedDate, // Use formatted date for display
          
          // Sleep metrics (in hours)
          sleep_hours: roundToTwo(sleepHours),
          deep_sleep: roundToTwo(deepSleepHours),
          light_sleep: roundToTwo(lightSleepHours),
          rem_sleep: roundToTwo(remSleepHours),
          awake_time: roundToTwo(awakeHours),
          
          // Heart rate metrics (rounded to 2 decimal places)
          resting_heart_rate: roundToTwo(item.resting_heart_rate || 0),
          max_heart_rate: roundToTwo(item.max_heart_rate || 0),
          min_heart_rate: roundToTwo(item.min_heart_rate || 0),
          
          // Activity metrics
          steps: item.total_steps || 0,
          distance: roundToTwo((item.total_distance_meters || 0) / 1000), // Convert to km and round
          total_calories: roundToTwo(item.total_calories || 0),
          active_calories: roundToTwo(item.active_calories || 0),
          
          // Stress metrics
          stress_level: roundToTwo(item.average_stress_level || 0),
          max_stress_level: roundToTwo(item.max_stress_level || 0),
          
          // For health score calculation
          hrv: roundToTwo(item.body_battery_change || item.hrv_ms || 0),
          
          // Whoop specific fields
          recovery_score: roundToTwo(item.recovery_score || 0),
          hrv_ms: roundToTwo(item.hrv_ms || 0),
          strain: roundToTwo(item.strain || 0),
          spo2_percentage: roundToTwo(item.spo2_percentage || 0),
          skin_temp_celsius: roundToTwo(item.skin_temp_celsius || 0),
          respiratory_rate: roundToTwo(item.respiratory_rate || 0),
          sleep_efficiency: roundToTwo(item.sleep_efficiency || 0),
          sleep_consistency: roundToTwo(item.sleep_consistency || 0),
          sleep_performance: roundToTwo(item.sleep_performance || 0),
          sleep_disturbances: roundToTwo(item.sleep_disturbances || 0),
          sleep_cycle_count: roundToTwo(item.sleep_cycle_count || 0),
        };

        return processedItem;
      } catch (error) {
        console.error('Error processing data:', error);
        return null;
      }
    });
  };

  // Add this function to help debug sleep data
  const debugSleepData = (data) => {
    data.forEach(item => {
      console.log(`Date: ${item.date}`);
      console.log(`Raw sleep seconds: ${item.sleep_time_seconds}`);
      console.log(`Calculated sleep hours: ${item.sleep_hours}`);
      console.log('---');
    });
  };

  // Calculate health score based on various metrics
  const calculateHealthScore = (data) => {
    if (!data || data.length === 0) return 0;
    
    const latestData = data[data.length - 1];
    const maxScore = 100;
    
    // Check if it's Whoop data
    if (latestData.source === 'whoop') {
      // For Whoop, use their recovery score if available, otherwise calculate
      if (latestData.recovery_score) {
        return latestData.recovery_score;
      }
      
      // Weight factors for different Whoop metrics
      const weights = {
        sleep: 0.3,
        hrv: 0.3,
        respiratory: 0.2,
        restingHR: 0.2
      };
      
      // Calculate sleep score (based on efficiency and consistency)
      const sleepScore = ((latestData.sleep_efficiency || 80) / 100 * 100) * weights.sleep;
      
      // Calculate HRV score (normalized to 0-100)
      const hrvScore = Math.min((latestData.hrv_ms / 100) * 100, 100) * weights.hrv;
      
      // Calculate respiratory score (15-18 is normal range)
      const respScore = (1 - Math.abs((latestData.respiratory_rate - 16.5) / 5)) * 100 * weights.respiratory;
      
      // Calculate resting heart rate score (lower is better, assuming 40-80 range)
      const hrScore = (1 - ((latestData.resting_heart_rate - 40) / 40)) * 100 * weights.restingHR;
      
      // Calculate total score
      const totalScore = Math.min(
        Math.round(sleepScore + hrvScore + respScore + hrScore),
        maxScore
      );
      
      return totalScore;
    } else {
      // Original calculation for Garmin data
      // Weight factors for different metrics
      const weights = {
        sleep: 0.3,
        activity: 0.3,
        stress: 0.2,
        heartRate: 0.2
      };
      
      // Calculate sleep score
      const sleepScore = (latestData.sleep_hours / 8) * 100 * weights.sleep;
      
      // Calculate activity score
      const activityScore = Math.min((latestData.steps / 10000) * 100, 100) * weights.activity;
      
      // Calculate stress score
      const stressScore = (100 - latestData.stress_level) * weights.stress;
      
      // Calculate heart rate score
      const hrvScore = (latestData.hrv / 100) * 100 * weights.heartRate;
      
      // Calculate total score
      const totalScore = Math.min(
        Math.round(sleepScore + activityScore + stressScore + hrvScore),
        maxScore
      );
      
      return totalScore;
    }
  };

  const handleLogout = async () => {
    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      if (!csrfToken) {
        console.error('No CSRF token found');
        throw new Error('No CSRF token available');
      }

      const response = await fetch('/api/logout/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,  // Add CSRF token
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({}),  // Empty body but needed for POST
      });

      if (response.ok) {
        // Clear all auth-related data
        localStorage.clear();  // Or specifically remove items you want to clear
        // Force reload to clear any remaining state
        window.location.href = '/login';  // Use window.location for a full page reload
      } else {
        console.error('Logout failed:', response.status, response.statusText);
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError(`Failed to logout: ${error.message}`);
    }
    closeMenu();
  };

  const handleSourceActivation = async (source, profile = null) => {
    setLoading(true);
    setError(null);
    setSyncMessage(null);
    
    try {
      const response = await fetch('/api/biometrics/activate-source/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
          'X-CSRF-Token': getCookie('csrftoken'),
          'X-Csrftoken': getCookie('csrftoken'),
        },
        credentials: 'include',
        body: JSON.stringify({ 
          source,
          profile_type: profile
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setActiveSource(source);
        setSyncMessage(`${source} source activated successfully!`);
        await fetchActiveSources();
        await syncData();

          // Fetch raw data after successful activation
        const rawResponse = await fetch('/api/biometrics/raw/', {
          credentials: 'include'
        });
        const rawData = await rawResponse.json();
        
        if (rawData.success) {
          setRawData(rawData.data);
          console.log('Raw data fetched successfully');
        } else {
          console.error('Failed to fetch raw data:', rawData.error);
        }
      
      } else {
        setError(`Source activation failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Error activating source: ${err.message}`);
      console.log('Source activation error:', err);
    } finally {
      setLoading(false);
      setShowSourceMenu(false);
      setShowCredentialsMenu(false);
      setSelectedSource(null);
      closeMenu();
    }
  };

  useEffect(() => {
    if (biometricData.length === 0 && !loading) {
      setHasActiveSources(false);
    }
  }, [biometricData, loading]);

  useEffect(() => {
    const fetchGarminProfiles = async () => {
      try {
        const response = await fetch('/api/biometrics/garmin-profiles/', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setGarminProfiles(data.profiles);
        }
      } catch (error) {
        console.error('Error fetching Garmin profiles:', error);
      }
    };
    
    fetchGarminProfiles();
  }, []);

  useEffect(() => {
    fetchActiveSources();
  }, []);

  useEffect(() => {
    // Call fetchData on component mount
    fetchData();
  }, []);

  useEffect(() => {
    if (biometricData.length > 0) {
      // Filter data based on selected source
      let dataToUse = [];
      
      if (!selectedDataSource || selectedDataSource === 'all') {
        dataToUse = biometricData;
      } else {
        dataToUse = biometricData.filter(item => item.source === selectedDataSource);
      }
      
      // For charts, we want chronological order (oldest to newest from left to right)
      // So we need to reverse the sort order since biometricData is sorted newest first
      const orderedData = [...dataToUse].reverse();
      
      console.log('Original data order (newest first):', 
        dataToUse.slice(0, 3).map(item => item.originalDate || item.date));
      console.log('Reversed data order for charts (oldest first):', 
        orderedData.slice(0, 3).map(item => item.originalDate || item.date));
      
      setFilteredData(orderedData);
    }
  }, [biometricData, selectedDataSource]);

  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

 
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  useEffect(() => {
    const handleError = (error) => {
      console.error('BiometricsDashboard Error:', error);
      setError('An error occurred while displaying the data');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <Box sx={{ width: '100%' }} className={`biometrics-dashboard ${darkMode ? 'dark-mode' : ''}`}>
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '250px',
        zIndex: -1
      }} className="header-gradient" />
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        p: 2
      }} className="header-content">
        {/* Left section with menu and title */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <IconButton
            color="inherit"
            onClick={openMenu}
            sx={{
              color: 'white',
              transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1.2)',
              padding: 0,
              '&:hover': {
                transform: 'scale(1.25) rotate(5deg)',
                backgroundColor: 'transparent',
                color: '#c3e6ff',
                filter: 'drop-shadow(0 0 5px rgba(110, 142, 251, 0.7))',
              },
              '&:active': {
                transform: 'scale(0.9) rotate(-5deg)',
              },
              '& .MuiTouchRipple-root': {
                display: 'none',
              },
            }}
          >
            <MenuIcon fontSize="large" />
          </IconButton>
          
          <Typography variant="h4" sx={{ 
            fontWeight: 600,
            fontFamily: '"Poppins", sans-serif',
            color: 'white',
            whiteSpace: 'nowrap',
            minWidth: '400px'
          }}>
            {username.charAt(0).toUpperCase() + username.slice(1)}'s Pulse Insights
          </Typography>
          
          <StyledMenu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={closeMenu}
          >
            <StyledMenuItem onClick={() => setShowSourceMenu(true)}>
              <SyncIcon />
              <Typography>Activate Data Source</Typography>
            </StyledMenuItem>
            
            <StyledMenuItem onClick={() => {
              closeMenu();
              setTabValue(1);
            }}>
              <TableChartIcon />
              <Typography>View Data Table</Typography>
            </StyledMenuItem>
            
            <StyledMenuItem onClick={() => {
              closeMenu();
              openDialog('Raw Data', JSON.stringify(rawData, null, 2));
            }}>
              <BarChartIcon />
              <Typography>View Raw Data</Typography>
            </StyledMenuItem>
            
            <StyledMenuItem onClick={() => {
              closeMenu();
              openDialog('Errors', error || 'No errors');
            }}>
              <BugReportIcon />
              <Typography>View Errors</Typography>
            </StyledMenuItem>
            
            <Box sx={{ my: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }} />
            
            <StyledMenuItem onClick={handleLogout}>
              <LogoutIcon />
              <Typography>Logout</Typography>
            </StyledMenuItem>
          </StyledMenu>
        </Box>
        
        {/* Spacer to push toggles to right */}
        <Box sx={{ flexGrow: 1 }} />
        
        {/* Right section with toggles */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 2
        }}>
          {/* Dark Mode Toggle */}
          <MuiTooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '4px 12px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              <Brightness4Icon sx={{ mr: 1, color: 'white' }} />
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase': {
                    color: 'white',
                    '&.Mui-checked': {
                      color: 'white',
                      '& + .MuiSwitch-track': {
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      },
                    },
                  },
                  '& .MuiSwitch-track': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    opacity: 1,
                  },
                  '& .MuiSwitch-thumb': {
                    backgroundColor: 'white',
                  },
                }}
              />
            </Box>
          </MuiTooltip>
          
          {/* Dev Mode Toggle */}
          <MuiTooltip title={devMode ? "Disable Developer Mode" : "Enable Developer Mode"}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '4px 12px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              <DeveloperModeIcon sx={{ mr: 1, color: 'white' }} />
              <Switch
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase': {
                    color: 'white',
                    '&.Mui-checked': {
                      color: 'white',
                      '& + .MuiSwitch-track': {
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      },
                    },
                  },
                  '& .MuiSwitch-track': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    opacity: 1,
                  },
                  '& .MuiSwitch-thumb': {
                    backgroundColor: 'white',
                  },
                }}
              />
            </Box>
          </MuiTooltip>
        </Box>
      </Box>
      <Box sx={{ px: 3 }}>
        {/* Dialog for showing raw data or error logs */}
        <Dialog open={showDialog} onClose={closeDialog} maxWidth="md" fullWidth>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogContent>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {dialogContent}
            </pre>
          </DialogContent>
        </Dialog>

        {/* Source Selection Dialog */}
        <Dialog 
          open={showSourceMenu} 
          onClose={() => setShowSourceMenu(false)}
          PaperProps={{
            sx: {
              width: '300px',
              backgroundColor: '#2C3E50',
              color: 'white'
            }
          }}
        >
          <DialogTitle>Select Data Source</DialogTitle>
          <DialogContent>
            {sources.map(source => (
              <StyledMenuItem
                key={source.id}
                onClick={() => {
                  if (source.id === 'whoop') {
                    setShowSourceMenu(false);
                    setShowWhoopConnect(true);
                  } else {
                    setSelectedSource(source.id);
                    setShowSourceMenu(false);
                    setShowCredentialsMenu(true);
                  }
                }}
              >
                <Typography>{source.name}</Typography>
              </StyledMenuItem>
            ))}
          </DialogContent>
        </Dialog>

        {/* Credentials Selection Dialog */}
        <Dialog 
          open={showCredentialsMenu} 
          onClose={() => setShowCredentialsMenu(false)}
          PaperProps={{
            sx: {
              width: '300px',
              backgroundColor: '#2C3E50',
              color: 'white'
            }
          }}
        >
          <DialogTitle>Select Credentials</DialogTitle>
          <DialogContent>
            {garminProfiles.map(profile => (
              <StyledMenuItem
                key={profile.id}
                onClick={() => {
                  handleSourceActivation(selectedSource, profile.id);
                  setShowCredentialsMenu(false);
                }}
              >
                <Typography>{profile.name}</Typography>
              </StyledMenuItem>
            ))}
          </DialogContent>
        </Dialog>

        {/* WHOOP Connect Dialog */}
        <Dialog 
          open={showWhoopConnect} 
          onClose={() => setShowWhoopConnect(false)}
          PaperProps={{
            sx: {
              width: '300px',
              backgroundColor: '#2C3E50',
              color: 'white'
            }
          }}
        >
          <DialogTitle>Connect WHOOP Account</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Connect your WHOOP account to sync your biometric data.
            </Typography>
            <WhoopConnect />
          </DialogContent>
        </Dialog>

        {loading ? (
          <Alert severity="info">Loading...</Alert>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !activeSource ? (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => setShowSourceMenu(true)}
              >
                ACTIVATE SOURCE
              </Button>
            }
          >
            No active data sources found. Please activate Garmin or another data source to see your biometric data.
          </Alert>
        ) : syncMessage && syncMessage.map((msg, index) => (
          <Alert key={index} severity={msg.type} sx={{ mb: 1 }}>
            {msg.text}
          </Alert>
        ))}

        {/* Active Sources Panel */}
        <Card 
          sx={{ 
            mb: 3,
            p: 2,
            backgroundColor: darkMode ? colors.primary : 'white',
            color: darkMode ? 'white' : '#000',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
          className="active-integrations-card"
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: darkMode ? 'white' : '#000' 
            }}>
              Active Integrations
            </Typography>
            {activeSources.length > 0 && (
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  value={selectedDataSource || 'all'}
                  onChange={(e) => setSelectedDataSource(e.target.value)}
                  sx={{
                    color: darkMode ? 'white' : '#000',
                    '.MuiOutlinedInput-notchedOutline': {
                      borderColor: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: darkMode ? 'white' : '#000',
                    },
                    '.MuiSvgIcon-root': {
                      color: darkMode ? 'white' : '#000',
                    },
                  }}
                >
                  <MenuItem value="all">All Data</MenuItem>
                  {activeSources.map((source) => (
                    <MenuItem key={source.id} value={source.id}>
                      {source.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          <Box sx={{ 
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap'
          }}>
            {activeSources && activeSources.map((source) => (
              <Box
                key={source.id}
                sx={{
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                <SyncIcon sx={{ fontSize: 20, color: darkMode ? 'white' : '#000' }} />
                <Typography sx={{ 
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: darkMode ? 'white' : '#000'
                }}>
                  {source.name}
                  {source.profile_type && ` - ${source.profile_type}`}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<SyncIcon />}
              color="secondary"
              onClick={syncData}
              disabled={loading}
            >
              Sync Data
            </Button>
          </Box>
        </Box>

        <Tabs 
          value={tabValue} 
          onChange={handleChangeTab} 
          aria-label="dashboard tabs"
          sx={{
            '& .MuiTab-root': {
              color: darkMode ? 'white' : '#000',
              fontWeight: 500,
            },
            '& .Mui-selected': {
              color: darkMode ? '#6e8efb' : '#6e8efb',
              fontWeight: 600,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#6e8efb',
            }
          }}
        >
          <Tab label="Analytics" {...a11yProps(0)} />
          <Tab label="Data Table" {...a11yProps(1)} />
          <Tab label="Insights" {...a11yProps(2)} />
        </Tabs>

        {tabValue === 0 && (
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              {selectedDataSource === 'whoop' ? (
                // WHOOP-specific visualizations
                <>
                  {/* Heart Rate and Recovery Score */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom sx={{ color: colors.headings }}>Resting Heart Rate & Recovery Score</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="recovery_score" name="Recovery Score" fill="#27AE60" yAxisId="right" />
                          <Line type="monotone" dataKey="resting_heart_rate" name="Resting HR" stroke="#e74c3c" yAxisId="left" strokeWidth={2} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* HRV and Strain */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>HRV & Strain</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="hrv_ms" name="HRV (ms)" fill="#3498DB" yAxisId="left" />
                          <Line type="monotone" dataKey="strain" name="Strain" stroke="#E74C3C" yAxisId="right" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* SPO2 and Body Temperature */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>SPO2 & Skin Temperature</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" domain={[90, 100]} />
                          <YAxis yAxisId="right" orientation="right" domain={[32, 38]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="spo2_percentage" name="SPO2 %" fill="#3498DB" yAxisId="left" />
                          <Line type="monotone" dataKey="skin_temp_celsius" name="Skin Temp (°C)" stroke="#F1C40F" yAxisId="right" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* Respiratory Rate */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>Respiratory Rate</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="respiratory_rate" name="Resp. Rate" stroke="#27AE60" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* Sleep Metrics */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>Sleep Quality Metrics</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="sleep_efficiency" name="Sleep Efficiency" fill="#3498DB" />
                          <Bar dataKey="sleep_consistency" name="Sleep Consistency" fill="#F1C40F" />
                          <Bar dataKey="sleep_performance" name="Sleep Performance" fill="#27AE60" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* Sleep Disturbances and Cycles */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>Sleep Disturbances & Cycles</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="sleep_disturbances" name="Disturbances" fill="#E74C3C" yAxisId="left" />
                          <Line type="monotone" dataKey="sleep_cycle_count" name="Sleep Cycles" stroke="#3498DB" strokeWidth={2} yAxisId="right" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>
                </>
              ) : (
                // Default Garmin visualizations
                <>
                  {/* Heart Rate Trends */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>Heart Rate Trends</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="max_heart_rate" name="Max HR" stroke="#e74c3c" />
                          <Line type="monotone" dataKey="resting_heart_rate" name="Resting HR" stroke="#2ecc71" />
                          <Line type="monotone" dataKey="min_heart_rate" name="Min HR" stroke="#3498db" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* Sleep Duration */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>Sleep Duration</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="sleep_hours" name="Sleep (hrs)" fill="#8e44ad" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* Daily Activity */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>Daily Activity</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="steps" name="Steps" fill="#3498db" yAxisId="left" />
                          <Line type="monotone" dataKey="active_calories" name="Active Calories" stroke="#e74c3c" yAxisId="right" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* Respiration Metrics */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>Respiration Range</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="max_respiration" 
                            name="Max Resp" 
                            stroke="#e74c3c" 
                            fill="#e74c3c" 
                            fillOpacity={0.2} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="average_respiration" 
                            name="Avg Resp" 
                            stroke="#2ecc71" 
                            fill="#2ecc71" 
                            fillOpacity={0.2} 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="lowest_respiration" 
                            name="Min Resp" 
                            stroke="#3498db" 
                            fill="#3498db" 
                            fillOpacity={0.2} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* Calorie Breakdown */}
                  <Grid item xs={12}>
                    <Card sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>Daily Calorie Breakdown</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={filteredData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="total_calories" name="Total Calories" stackId="calories" fill="#3498db" />
                          <Bar dataKey="active_calories" name="Active Calories" stackId="calories" fill="#2ecc71" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ mt: 3 }}>
            {biometricData.length === 0 && !loading ? (
              <Typography variant="body1" color="textSecondary">
                No data to display in table.
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {getDataColumns(biometricData, devMode).map(column => (
                        <th key={column.id} style={thStyle}>
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {biometricData.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                        {getDataColumns(biometricData, devMode).map(column => (
                          <td key={column.id} style={tdStyle}>
                            {formatCellValue(item[column.id], column.id)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
            {devMode && (
              <Typography 
                variant="caption" 
                className="dev-mode-text"
                sx={{ 
                  display: 'block', 
                  mt: 2,
                  fontStyle: 'italic'
                }}
              >
                Developer mode is active - showing all fields including system fields
              </Typography>
            )}
          </Box>
        )}
        
        {tabValue === 2 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" sx={{ 
              mb: 3, 
              color: darkMode ? 'white' : colors.primary,
              fontWeight: 600 
            }}>
              Your Personal Health Insights
            </Typography>
            
            {biometricData.length === 0 && !loading ? (
              <Typography variant="body1" color="textSecondary">
                No data available for insights. Please sync your data.
              </Typography>
            ) : (
              <Grid container spacing={3}>
                {/* Sleep Insight */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    p: 3, 
                    borderRadius: '12px',
                    height: '100%',
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'translateY(-5px)' }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <BedtimeIcon sx={{ 
                        fontSize: 32, 
                        color: '#8e44ad', 
                        mr: 2,
                        p: 1,
                        borderRadius: '50%',
                        backgroundColor: darkMode ? 'rgba(142, 68, 173, 0.2)' : 'rgba(142, 68, 173, 0.1)',
                      }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Sleep Quality</Typography>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedDataSource === 'whoop' 
                        ? `Your sleep performance has been ${biometricData[0]?.sleep_performance > 85 ? 'excellent' : biometricData[0]?.sleep_performance > 70 ? 'good' : 'below average'} 
                          lately. You've been getting an average of ${(biometricData.reduce((acc, item) => acc + (item.sleep_hours || 0), 0) / biometricData.length).toFixed(1)} hours of sleep.`
                        : `Your sleep patterns show you're averaging ${(biometricData.reduce((acc, item) => acc + (item.sleep_hours || 0), 0) / biometricData.length).toFixed(1)} hours per night, 
                          with deep sleep accounting for about ${Math.round(biometricData[0]?.deep_sleep / biometricData[0]?.sleep_hours * 100) || 25}% of your total sleep.`
                      }
                    </Typography>
                    
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Recommendation:</Typography>
                    <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                      {biometricData[0]?.sleep_hours < 7 
                        ? "Try to increase your sleep duration to at least 7 hours for better recovery and performance."
                        : "Maintain your current sleep routine. Consider adding 15 minutes of meditation before bed for even better quality."
                      }
                    </Typography>
                  </Card>
                </Grid>
                
                {/* Activity Insight */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    p: 3, 
                    borderRadius: '12px',
                    height: '100%',
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'translateY(-5px)' }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <DirectionsRunIcon sx={{ 
                        fontSize: 32, 
                        color: '#2ecc71', 
                        mr: 2,
                        p: 1,
                        borderRadius: '50%',
                        backgroundColor: darkMode ? 'rgba(46, 204, 113, 0.2)' : 'rgba(46, 204, 113, 0.1)',
                      }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Activity Level</Typography>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedDataSource === 'whoop' 
                        ? `Your recent strain levels have been ${biometricData[0]?.strain > 15 ? 'very high' : biometricData[0]?.strain > 10 ? 'moderate' : 'low'}. 
                          Your body is handling this load ${biometricData[0]?.recovery_score > 66 ? 'well' : 'with some difficulty'}.`
                        : `You've averaged ${Math.round(biometricData.reduce((acc, item) => acc + (item.steps || 0), 0) / biometricData.length).toLocaleString()} steps daily, 
                          burning approximately ${Math.round(biometricData.reduce((acc, item) => acc + (item.active_calories || 0), 0) / biometricData.length)} active calories.`
                      }
                    </Typography>
                    
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Recommendation:</Typography>
                    <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                      {biometricData[0]?.steps < 7000 || biometricData[0]?.strain < 8
                        ? "Consider increasing your daily activity. Even a 20-minute walk can boost your cardiovascular health."
                        : biometricData[0]?.recovery_score < 33
                        ? "Your body needs more recovery time. Focus on light activities for the next 1-2 days."
                        : "Your activity level is well-balanced with your recovery. Keep up the good work!"
                      }
                    </Typography>
                  </Card>
                </Grid>
                
                {/* Heart Rate Insight */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    p: 3, 
                    borderRadius: '12px',
                    height: '100%',
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'translateY(-5px)' }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <FavoriteIcon sx={{ 
                        fontSize: 32, 
                        color: '#e74c3c', 
                        mr: 2,
                        p: 1,
                        borderRadius: '50%',
                        backgroundColor: darkMode ? 'rgba(231, 76, 60, 0.2)' : 'rgba(231, 76, 60, 0.1)',
                      }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Heart Rate Trends</Typography>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {`Your resting heart rate is ${Math.round(biometricData[0]?.resting_heart_rate || 60)} bpm, which is 
                        ${biometricData[0]?.resting_heart_rate < 60 ? 'excellent' : biometricData[0]?.resting_heart_rate < 70 ? 'good' : 'average'} for your profile.
                        ${selectedDataSource === 'whoop' 
                          ? `Your HRV of ${Math.round(biometricData[0]?.hrv_ms || 50)} ms indicates ${biometricData[0]?.hrv_ms > 70 ? 'strong' : biometricData[0]?.hrv_ms > 50 ? 'good' : 'moderate'} recovery capacity.`
                          : `Your heart rate reaches ${Math.round(biometricData[0]?.max_heart_rate || 150)} bpm during peak activity.`
                        }`
                      }
                    </Typography>
                    
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Recommendation:</Typography>
                    <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                      {biometricData[0]?.resting_heart_rate > 70
                        ? "Your resting heart rate is slightly elevated. Consider more aerobic exercise and stress reduction techniques."
                        : biometricData[0]?.hrv_ms < 50
                        ? "Your heart rate variability could improve. Focus on quality sleep and recovery."
                        : "Your cardiovascular indicators look healthy. Continue your current exercise routine."
                      }
                    </Typography>
                  </Card>
                </Grid>
                
                {/* Recovery Insight */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    p: 3, 
                    borderRadius: '12px',
                    height: '100%',
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'translateY(-5px)' }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <RestoreIcon sx={{ 
                        fontSize: 32, 
                        color: '#3498db', 
                        mr: 2,
                        p: 1,
                        borderRadius: '50%',
                        backgroundColor: darkMode ? 'rgba(52, 152, 219, 0.2)' : 'rgba(52, 152, 219, 0.1)',
                      }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Recovery Status</Typography>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedDataSource === 'whoop' 
                        ? `Your body is ${biometricData[0]?.recovery_score > 66 ? 'well recovered' : biometricData[0]?.recovery_score > 33 ? 'moderately recovered' : 'under-recovered'}.
                          This suggests your ${biometricData[0]?.recovery_score > 66 ? 'body is adapting well to recent training loads' : 'system needs more recovery time'}.`
                        : `Based on your resting heart rate and sleep quality, your recovery level appears 
                          ${biometricData[0]?.resting_heart_rate < (biometricData[1]?.resting_heart_rate || 60) ? 'good' : 'incomplete'}.`
                      }
                    </Typography>
                    
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Recommendation:</Typography>
                    <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                      {(biometricData[0]?.recovery_score < 33) || (biometricData[0]?.resting_heart_rate > (biometricData[1]?.resting_heart_rate || 60) + 5)
                        ? "Focus on recovery today. Consider light activity, proper hydration, and an extra hour of sleep."
                        : (biometricData[0]?.recovery_score < 66) || (biometricData[0]?.resting_heart_rate > (biometricData[1]?.resting_heart_rate || 60))
                        ? "Your body is in a moderate recovery state. Moderate intensity training is appropriate."
                        : "You're well recovered. This is an optimal day for higher intensity training if desired."
                      }
                    </Typography>
                  </Card>
                </Grid>
                
                {/* Long-term Trends Insight */}
                <Grid item xs={12}>
                  <Card sx={{ 
                    p: 3, 
                    borderRadius: '12px',
                    transition: 'transform 0.3s ease',
                    '&:hover': { transform: 'translateY(-5px)' }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <MonitorHeartIcon sx={{ 
                        fontSize: 32, 
                        color: '#f39c12', 
                        mr: 2,
                        p: 1,
                        borderRadius: '50%',
                        backgroundColor: darkMode ? 'rgba(243, 156, 18, 0.2)' : 'rgba(243, 156, 18, 0.1)',
                      }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Health Trends</Typography>
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {`Over the past ${biometricData.length} days, your metrics indicate 
                      ${biometricData[0]?.resting_heart_rate < biometricData[biometricData.length-1]?.resting_heart_rate ? 'improving' : 'stable'} cardiovascular fitness
                      and ${(biometricData.reduce((a, b, i, arr) => i > 0 ? a + (b.sleep_hours > arr[i-1].sleep_hours ? 1 : 0) : 0, 0) > biometricData.length/2) ? 'improving' : 'consistent'} sleep habits.`}
                      
                      {selectedDataSource === 'whoop' 
                        ? ` Your recovery scores have been trending ${biometricData.slice(0, 3).reduce((acc, item) => acc + (item.recovery_score || 0), 0) / 3 > 
                            biometricData.slice(biometricData.length-3).reduce((acc, item) => acc + (item.recovery_score || 0), 0) / 3 ? 'upward' : 'consistently'}.`
                        : ` Your overall activity level has been ${biometricData.slice(0, 3).reduce((acc, item) => acc + (item.steps || 0), 0) / 3 > 
                            biometricData.slice(biometricData.length-3).reduce((acc, item) => acc + (item.steps || 0), 0) / 3 ? 'increasing' : 'steady'}.`
                      }
                    </Typography>
                    
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Personalized Insight:</Typography>
                    <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                      {`Your data suggests that your body responds best to 
                      ${biometricData.find(d => d.sleep_hours > 8)?.resting_heart_rate < biometricData.find(d => d.sleep_hours < 7)?.resting_heart_rate ? 
                        'longer sleep durations' : 'consistent sleep patterns'} 
                      and ${biometricData.find(d => d.steps > 10000) ? 
                        'regular physical activity' : 'balanced activity levels'}. 
                      Consider ${biometricData[0]?.resting_heart_rate > 65 ? 
                        'adding more cardio exercises to your routine' : 'maintaining your current exercise balance'} 
                      to optimize your health metrics.`}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        <HeartRateMetrics 
          resting={filteredData.length > 0 ? filteredData[filteredData.length - 1].resting_heart_rate || 0 : 0}
          average={filteredData.length > 0 ? 
            (selectedDataSource === 'whoop' ? 
              filteredData[filteredData.length - 1].recovery_score || 0 :
              filteredData[filteredData.length - 1].last_seven_days_avg_resting_heart_rate || 0) 
            : 0}
          max={filteredData.length > 0 ? 
            (selectedDataSource === 'whoop' ? 
              filteredData[filteredData.length - 1].strain || 0 :
              filteredData[filteredData.length - 1].max_heart_rate || 0) 
            : 0}
          isWhoop={selectedDataSource === 'whoop'}
        />
        
        {/* Footer */}
        <Box 
          className="footer"
          sx={{ 
            mt: 4, 
            pt: 2
          }}
        >
          <Typography 
            variant="caption" 
            className="footer-text"
            sx={{ 
              display: 'block',
              mb: 1
            }}
          >
            Developed by Andrew Prince and Pulse Project LLC 2025
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default BiometricsDashboard; 