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
  Tabs, Tab, styled
} from '@mui/material';
import { format } from 'date-fns';
import SyncIcon from '@mui/icons-material/Sync';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';
import BugReportIcon from '@mui/icons-material/BugReport';
import TableChartIcon from '@mui/icons-material/TableChart';
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

      return {
        ...item,  // Keep all original data
        date: format(new Date(item.date), 'MM/dd'),
        
        // Sleep metrics (in hours)
        sleep_hours: Number(sleepHours.toFixed(2)),
        deep_sleep: Number(deepSleepHours.toFixed(2)),
        light_sleep: Number(lightSleepHours.toFixed(2)),
        rem_sleep: Number(remSleepHours.toFixed(2)),
        awake_time: Number(awakeHours.toFixed(2)),
        
        // Heart rate metrics (already in correct format)
        resting_heart_rate: item.resting_heart_rate || 0,
        max_heart_rate: item.max_heart_rate || 0,
        min_heart_rate: item.min_heart_rate || 0,
        
        // Activity metrics
        steps: item.total_steps || 0,
        distance: (item.total_distance_meters || 0) / 1000, // Convert to km
        total_calories: item.total_calories || 0,
        active_calories: item.active_calories || 0,
        
        // Stress metrics
        stress_level: item.average_stress_level || 0,
        max_stress_level: item.max_stress_level || 0,
        
        // For health score calculation
        hrv: item.body_battery_change || 0,
      };
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
    let mounted = true;
    
    const fetchData = async () => {
      if (loading || biometricData.length > 0) return;
      setLoading(true);
      
      try {
        const response = await axios.get('/api/biometrics/');
        // console.log('Raw biometrics data:', response.data);
        // Process the raw data array directly
        const processedData = processData(response.data);
        // console.log('Processed biometrics data:', processedData);
        setBiometricData(processedData);
      } catch (error) {
        console.error('Error fetching biometric data:', error);
        setError('Failed to fetch biometric data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

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
      <StyledAppBar position="static">
        <Toolbar>
          <StyledTitle sx={{ flexGrow: 1 }}>
            {username}'s Biometric Insights
          </StyledTitle>
          <IconButton
            edge="end"
            color="inherit"
            aria-label="menu"
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
        </Toolbar>
      </StyledAppBar>

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

      <Box sx={{ 
        p: 4, 
        backgroundColor: colors.background,
        minHeight: '100vh'
      }}>
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
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Active Integrations
          </Typography>
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
              {/* Heart Rate Trends */}
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Heart Rate Trends</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={biometricData}>
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
                    <BarChart data={biometricData}>
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
                    <ComposedChart data={biometricData}>
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
                    <AreaChart data={biometricData}>
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
                    <BarChart data={biometricData}>
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
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>RHR</th>
                      <th style={thStyle}>Max HR</th>
                      <th style={thStyle}>Min HR</th>
                      <th style={thStyle}>Sleep RHR</th>
                      <th style={thStyle}>Sleep (hrs)</th>
                      <th style={thStyle}>Deep Sleep (hrs)</th>
                      <th style={thStyle}>Light Sleep (hrs)</th>
                      <th style={thStyle}>REM Sleep (hrs)</th>
                      <th style={thStyle}>Awake (hrs)</th>
                      <th style={thStyle}>Steps</th>
                      <th style={thStyle}>Distance (km)</th>
                      <th style={thStyle}>Active Cals</th>
                      <th style={thStyle}>Total Cals</th>
                      <th style={thStyle}>Avg Stress</th>
                      <th style={thStyle}>Max Stress</th>
                      <th style={thStyle}>Avg Resp</th>
                      <th style={thStyle}>Min Resp</th>
                      <th style={thStyle}>Max Resp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {biometricData.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                        <td style={tdStyle}>{item.date || 'N/A'}</td>
                        <td style={tdStyle}>{item.resting_heart_rate || '0'}</td>
                        <td style={tdStyle}>{item.max_heart_rate || '0'}</td>
                        <td style={tdStyle}>{item.min_heart_rate || '0'}</td>
                        <td style={tdStyle}>{item.sleep_resting_heart_rate || '0'}</td>
                        <td style={tdStyle}>{(item.sleep_hours || 0).toFixed(2)}</td>
                        <td style={tdStyle}>{(item.deep_sleep || 0).toFixed(2)}</td>
                        <td style={tdStyle}>{(item.light_sleep || 0).toFixed(2)}</td>
                        <td style={tdStyle}>{(item.rem_sleep || 0).toFixed(2)}</td>
                        <td style={tdStyle}>{(item.awake_hours || 0).toFixed(2)}</td>
                        <td style={tdStyle}>{item.total_steps || '0'}</td>
                        <td style={tdStyle}>{(item.distance || 0).toFixed(2)}</td>
                        <td style={tdStyle}>{item.active_calories || '0'}</td>
                        <td style={tdStyle}>{item.total_calories || '0'}</td>
                        <td style={tdStyle}>{item.stress_level || '0'}</td>
                        <td style={tdStyle}>{item.max_stress_level || '0'}</td>
                        <td style={tdStyle}>{(item.average_respiration || 0).toFixed(1)}</td>
                        <td style={tdStyle}>{(item.lowest_respiration || 0).toFixed(1)}</td>
                        <td style={tdStyle}>{(item.highest_respiration || 0).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>
        )}

        <HeartRateMetrics 
          resting={biometricData.length > 0 ? biometricData[biometricData.length - 1].resting_heart_rate || 0 : 0}
          average={biometricData.length > 0 ? biometricData[biometricData.length - 1].last_seven_days_avg_resting_heart_rate || 0 : 0}
          max={biometricData.length > 0 ? biometricData[biometricData.length - 1].max_heart_rate || 0 : 0}
        />
      </Box>
    </Box>
  );
};

// Basic table styles
const thStyle = {
  textAlign: 'left',
  padding: '8px',
  border: '1px solid #ccc',
  fontWeight: 'bold'
};
const tdStyle = {
  textAlign: 'left',
  padding: '8px',
  border: '1px solid #ccc'
};

export default BiometricsDashboard; 