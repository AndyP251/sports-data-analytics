import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar
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
  
  const sources = [
    { id: 'garmin', name: 'Garmin' },
    { id: 'whoop', name: 'Whoop (Coming Soon)' }
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

  const fetchBiometricData = async () => {
    try {
      setLoading(true);
      setError('');
      setSyncMessage('');
      const response = await fetch('/api/biometrics/', { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      console.log('Raw biometric data:', data);
      setRawData(data);

      if (!data || data.length === 0) {
        setSyncMessage('No data available. Try syncing.');
        setBiometricData([]);
      } else {
        const processed = processData(data);
        debugSleepData(processed);
        console.log('Processed data:', processed);
        setBiometricData(processed);
      }
    } catch (err) {
      setError(`Error fetching data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    setLoading(true);
    setError(null);
    setSyncMessage('Syncing data...');

    try {
      const response = await fetch('/api/biometrics/sync/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.cookie.split('csrftoken=')[1]?.split(';')[0],
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setSyncMessage('Data synced successfully!');
        fetchBiometricData();
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
      const sleepHours = (item.sleep_time_seconds || 0) / 3600;
      const deepSleepHours = (item.deep_sleep_seconds || 0) / 3600;
      const lightSleepHours = (item.light_sleep_seconds || 0) / 3600;
      const remSleepHours = (item.rem_sleep_seconds || 0) / 3600;
      const awakeHours = (item.awake_sleep || 0) / 3600;

      return {
        ...item,  // Keep all original data
        date: format(new Date(item.date), 'MM/dd'),
        
        // Sleep metrics (in hours)
        sleep_hours: Number(sleepHours.toFixed(2)),
        deep_sleep: Number(deepSleepHours.toFixed(2)),
        light_sleep: Number(lightSleepHours.toFixed(2)),
        rem_sleep: Number(remSleepHours.toFixed(2)),
        awake_time: Number(awakeHours.toFixed(2)),
        
        // Heart rate metrics
        resting_heart_rate: item.resting_heart_rate || 0,
        max_heart_rate: item.max_heart_rate || 0,
        min_heart_rate: item.min_heart_rate || 0,
        
        // Activity metrics
        total_calories: item.total_calories || 0,
        active_calories: item.active_calories || 0,
        total_steps: item.total_steps || 0,
        
        // Stress metrics
        average_stress_level: item.average_stress_level || 0,
        max_stress_level: item.max_stress_level || 0,
        
        // Additional metrics
        total_distance: (item.total_distance_meters || 0) / 1000, // Convert to km
        
        // For debugging
        raw_sleep_seconds: item.sleep_time_seconds || 0,
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
    setSyncMessage(`Activating ${source} source...`);

    try {
      const response = await fetch('/api/biometrics/activate-source/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        credentials: 'include',
        body: JSON.stringify({ 
          source,
          profile_type: profile
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSyncMessage(`${source} source activated successfully!`);
        await syncData();
      } else {
        setError(`Source activation failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Error activating source: ${err.message}`);
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
        if (loading || biometricData.length > 0) return; // Add check for existing data
        setLoading(true);
        
        try {
            const response = await fetch('/api/biometrics/');
            if (!mounted) return;
            const data = await response.json();
            setBiometricData(data);
        } catch (error) {
            console.error('Error fetching biometric data:', error);
        } finally {
            if (mounted) setLoading(false);
        }
    };

    fetchData();

    return () => {
        mounted = false;
    };
  }, []); // Only fetch on mount

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
                  setSyncMessage('Whoop integration coming soon!');
                  return;
                }
                setSelectedSource(source.id);
                setShowSourceMenu(false);
                setShowCredentialsMenu(true);
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

      <Box sx={{ 
        p: 4, 
        backgroundColor: colors.background,
        minHeight: '100vh'
      }}>
        {/* Add Alert for no active sources */}
        {!hasActiveSources && (
          <Alert 
            severity="info" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => setShowSourceMenu(true)}  // Use the same handler as the menu item
              >
                ACTIVATE SOURCE
              </Button>
            }
          >
            No active data sources found. Please activate Garmin or another data source to see your biometric data.
          </Alert>
        )}

        {/* Sync & Feedback */}
        <Box sx={{ mb: 2 }}>
          {loading && <CircularProgress />}
          {error && !loading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {syncMessage && !loading && <Alert severity="info" sx={{ mb: 2 }}>{syncMessage}</Alert>}

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

        {/* Tabs */}
        <Tabs value={tabValue} onChange={handleChangeTab} aria-label="dashboard tabs">
          <Tab label="Analytics" {...a11yProps(0)} />
          <Tab label="Data Table" {...a11yProps(1)} />
        </Tabs>

        {/* ============= TAB PANEL 0: Analytics Charts ============= */}
        {tabValue === 0 && (
          <Box sx={{ mt: 3 }}>
            {biometricData.length === 0 && !loading ? (
              <Typography variant="body1" color="textSecondary">
                No biometric data to display.
              </Typography>
            ) : (
              <>
                {biometricData.every(item => item.sleep_hours === 0) && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No sleep data available. Try syncing with Garmin again.
                  </Alert>
                )}
                <Grid container spacing={2}>
                  {/* Health Score Card */}
                  <Grid item xs={12} md={4}>
                    <Card sx={{ 
                      p: 3, 
                      height: '100%',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                    }}>
                      <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
                        Overall Health Score
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        height: '250px'
                      }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                          <CircularProgress
                            variant="determinate"
                            value={calculateHealthScore(biometricData)}
                            size={120}
                            thickness={4}
                            sx={{
                              color: theme.palette.success.main,
                              '& .MuiCircularProgress-circle': {
                                strokeLinecap: 'round',
                              },
                            }}
                          />
                          <Box
                            sx={{
                              top: 0,
                              left: 0,
                              bottom: 0,
                              right: 0,
                              position: 'absolute',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="h4" component="div" color="text.primary">
                              {`${calculateHealthScore(biometricData)}%`}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>

                  {/* Sleep Analysis Card */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2 }}>
                      <Typography variant="h6">Sleep Analysis</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={biometricData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="deep_sleep" 
                            name="Deep Sleep (hrs)" 
                            fill={colors.primary} 
                          />
                          <Bar 
                            dataKey="light_sleep" 
                            name="Light Sleep (hrs)" 
                            fill={colors.secondary} 
                          />
                          <Bar 
                            dataKey="rem_sleep" 
                            name="REM Sleep (hrs)" 
                            fill={colors.accent1} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Average Respiration: {biometricData[biometricData.length - 1]?.average_respiration || 0}
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>

                  {/* Heart Rate Card */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 3, borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                      <Typography variant="h5" gutterBottom>Heart Rate Metrics</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={biometricData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={`${colors.primary}15`} />
                          <XAxis dataKey="date" stroke={colors.text} />
                          <YAxis stroke={colors.text} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: colors.background,
                              border: `1px solid ${colors.primary}` 
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="resting_heart_rate" 
                            name="Resting HR" 
                            stroke={colors.primary}
                            strokeWidth={3}
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="avg_heart_rate" 
                            name="Average HR" 
                            stroke={colors.secondary}
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="max_heart_rate" 
                            name="Max HR" 
                            stroke={colors.accent2}
                            strokeWidth={3}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
                        <Typography variant="body2" color="textSecondary">
                          HRV: {biometricData[biometricData.length - 1]?.hrv || 0}ms
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Recovery Score: {biometricData[biometricData.length - 1]?.recovery_score || 0}%
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>

                  {/* Activity Metrics Card */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>Daily Activity</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={biometricData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="calories_active" name="Active Calories" fill="#8884d8" />
                          <Bar dataKey="calories_total" name="Total Calories" fill="#82ca9d" />
                          <Bar dataKey="steps" name="Steps" fill="#ffc658" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* Body Composition Card */}
                  <Grid item xs={12}>
                    <Card sx={{ p: 3, borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                      <Typography variant="h5" gutterBottom>Body Composition Trends</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={biometricData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={`${colors.primary}15`} />
                          <XAxis dataKey="date" stroke={colors.text} />
                          <YAxis stroke={colors.text} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: colors.background,
                              border: `1px solid ${colors.primary}` 
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="weight" 
                            name="Weight (kg)" 
                            stroke={colors.primary}
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="body_fat_percentage" 
                            name="Body Fat %" 
                            stroke={colors.secondary}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>

                  {/* Stress and Recovery Card */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>Stress & Recovery</Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={biometricData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="stress_level" name="Stress Level" stroke="#8884d8" />
                          <Line type="monotone" dataKey="hrv" name="HRV" stroke="#82ca9d" />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}
          </Box>
        )}

        {/* ============= TAB PANEL 1: Data Table ============= */}
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
                      <th style={thStyle}>Total Steps</th>
                      <th style={thStyle}>Active Cals</th>
                      <th style={thStyle}>Total Cals</th>
                      <th style={thStyle}>Sleep (hrs)</th>
                      <th style={thStyle}>Deep Sleep (hrs)</th>
                      <th style={thStyle}>Light Sleep (hrs)</th>
                      <th style={thStyle}>REM Sleep (hrs)</th>
                      {/* Add more columns as needed */}
                    </tr>
                  </thead>
                  <tbody>
                    {biometricData.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                        <td style={tdStyle}>{item.date}</td>
                        <td style={tdStyle}>{item.resting_heart_rate}</td>
                        <td style={tdStyle}>{item.max_heart_rate}</td>
                        <td style={tdStyle}>{item.min_heart_rate}</td>
                        <td style={tdStyle}>{item.total_steps}</td>
                        <td style={tdStyle}>{item.active_calories}</td>
                        <td style={tdStyle}>{item.total_calories}</td>
                        <td style={tdStyle}>{item.sleep_hours.toFixed(2)}</td>
                        <td style={tdStyle}>{item.deep_sleep.toFixed(2)}</td>
                        <td style={tdStyle}>{item.light_sleep.toFixed(2)}</td>
                        <td style={tdStyle}>{item.rem_sleep.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>
        )}

        {/* Heart Rate Metrics component */}
        <HeartRateMetrics 
          resting={biometricData?.resting_heart_rate || 0}
          average={biometricData?.avg_heart_rate || 0}
          max={biometricData?.max_heart_rate || 0}
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