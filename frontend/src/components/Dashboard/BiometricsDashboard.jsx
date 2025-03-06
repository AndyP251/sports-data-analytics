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
  Tabs, Tab, styled, Select, FormControl, Switch
} from '@mui/material';
import { format } from 'date-fns';
import SyncIcon from '@mui/icons-material/Sync';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';
import BugReportIcon from '@mui/icons-material/BugReport';
import TableChartIcon from '@mui/icons-material/TableChart';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import HeartRateMetrics from '../HeartRateMetrics';
import axios from 'axios';
import WhoopConnect from '../WhoopConnect';

// Modern, professional color palette
const colors = {
  primary: '#2C3E50',   // Deep blue-gray
  secondary: '#3498DB', // Bright blue
  accent1: '#27AE60',   // Emerald green
  accent2: '#E74C3C',   // Coral red
  accent3: '#F1C40F',   // Sunflower yellow
  background: '#ECF0F1', // Light gray
  text: '#2C3E50',      // Deep blue-gray
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
  const [syncMessage, setSyncMessage] = useState(null);
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
    if (loading || biometricData.length > 0) return;
    setLoading(true);
    
    try {
      const response = await axios.get('/api/biometrics/');
      // console.log('Raw biometrics data:', response.data);
      
      // Check if we have any data
      if (!response.data || response.data.length === 0) {
        setHasActiveSources(false);
        setError('No data available. Please activate a data source.');
        return;
      }
      
      // Process the raw data array directly
      const processedData = processData(response.data);
      console.log('Processed biometrics data:', processedData);
      setBiometricData(processedData);
      
      // If we have data but no selected source yet, set to first source
      if (processedData.length > 0 && !selectedDataSource && activeSources.length > 0) {
        setSelectedDataSource(activeSources[0].id);
      }
    } catch (error) {
      console.error('Error fetching biometric data:', error);
      setError('Failed to fetch biometric data');
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
        setError(null);
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
      // setError('No data source selected');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/biometrics/sync/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.cookie.split('csrftoken=')[1]?.split(';')[0],
          'X-CSRF-Token': document.cookie.split('csrftoken=')[1]?.split(';')[0],
          'X-Csrftoken': document.cookie.split('csrftoken=')[1]?.split(';')[0],
          'X-CSRF-Token': document.cookie.split('csrftoken=')[1]?.split(';')[0],
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setSyncMessage('Data synced successfully!');
        fetchData();
      } else {
        setError(`Sync failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Error syncing data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processData = (data) => {
    return data.map(item => {
      // Convert seconds to hours and handle null/undefined values
      const sleepHours = (item.total_sleep_seconds || 0) / 3600;
      const deepSleepHours = (item.deep_sleep_seconds || 0) / 3600;
      const lightSleepHours = (item.light_sleep_seconds || 0) / 3600;
      const remSleepHours = (item.rem_sleep_seconds || 0) / 3600;
      const awakeHours = (item.awake_seconds || 0) / 3600;

      // Helper function to round numeric values to 2 decimal places
      const roundToTwo = (value) => {
        if (typeof value === 'number') {
          return Number(value.toFixed(2));
        }
        return value;
      };

      const processedItem = {
        ...item,  // Keep all original data
        date: format(new Date(item.date), 'MM/dd'),
        
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
      if (!selectedDataSource || selectedDataSource === 'all') {
        setFilteredData(biometricData);
      } else {
        setFilteredData(biometricData.filter(item => item.source === selectedDataSource));
      }
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
    <Box sx={{ width: '100%' }}>
      <Box sx={{
        background: 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '200px',
        zIndex: -1
      }} />
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2,
        color: 'white'
      }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 600,
          fontFamily: '"Poppins", sans-serif',
        }}>
          {username.charAt(0).toUpperCase() + username.slice(1)}'s Pulse Insights
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '4px 12px',
            borderRadius: '4px',
          }}>
            <DeveloperModeIcon sx={{ mr: 1 }} />
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
          <IconButton
            color="inherit"
            onClick={openMenu}
            sx={{
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.1)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
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
        ) : syncMessage ? (
          <Alert severity="success" sx={{ mb: 3 }}>{syncMessage}</Alert>
        ) : (
          <Alert severity="success" sx={{ mb: 3 }}>
            Currently using {activeSource} as your data source
          </Alert>
        )}

        {/* Active Sources Panel */}
        <Card 
          sx={{ 
            mb: 3,
            p: 2,
            backgroundColor: colors.primary,
            color: 'white',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Active Integrations
            </Typography>
            {activeSources.length > 0 && (
              <FormControl sx={{ minWidth: 200 }}>
                <Select
                  value={selectedDataSource || 'all'}
                  onChange={(e) => setSelectedDataSource(e.target.value)}
                  sx={{
                    color: 'white',
                    '.MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'white',
                    },
                    '.MuiSvgIcon-root': {
                      color: 'white',
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
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  }
                }}
              >
                <SyncIcon sx={{ fontSize: 20 }} />
                <Typography sx={{ 
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
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

        <Tabs value={tabValue} onChange={handleChangeTab} aria-label="dashboard tabs">
          <Tab label="Analytics" {...a11yProps(0)} />
          <Tab label="Data Table" {...a11yProps(1)} />
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
                      <Typography variant="h6" gutterBottom>Resting Heart Rate & Recovery Score</Typography>
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
                  <thead style={{ backgroundColor: '#eee' }}>
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
                sx={{ 
                  display: 'block', 
                  mt: 2, 
                  color: 'text.secondary',
                  fontStyle: 'italic'
                }}
              >
                Developer mode is active - showing all fields including system fields
              </Typography>
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
      </Box>
    </Box>
  );
};

// Update the table styles
const thStyle = {
  textAlign: 'left',
  padding: '12px 8px',
  border: '1px solid #ccc',
  fontWeight: 'bold',
  backgroundColor: '#2C3E50',
  color: 'white',
  position: 'sticky',
  top: 0,
  zIndex: 1
};

const tdStyle = {
  textAlign: 'left',
  padding: '8px',
  border: '1px solid #ccc',
  whiteSpace: 'nowrap'
};

export default BiometricsDashboard; 