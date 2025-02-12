import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import { 
  Card, Grid, Typography, Box, Button, 
  CircularProgress, Alert, useTheme 
} from '@mui/material';
import { format } from 'date-fns';
import SyncIcon from '@mui/icons-material/Sync';
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

const BiometricsDashboard = () => {
  const theme = useTheme();
  const [biometricData, setBiometricData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);

  const fetchBiometricData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/biometrics/');
      const data = await response.json();
      
      if (data.length === 0) {
        setSyncMessage('No data available. Try syncing.');
      } else {
        setBiometricData(data.map(item => ({
          ...item,
          date: format(new Date(item.date), 'MM/dd'),
          // Ensure numeric values are not null/undefined
          sleep_hours: item.sleep_hours || 0,
          deep_sleep: item.deep_sleep || 0,
          light_sleep: item.light_sleep || 0,
          rem_sleep: item.rem_sleep || 0,
          resting_heart_rate: item.resting_heart_rate || 0,
          max_heart_rate: item.max_heart_rate || 0,
          avg_heart_rate: item.avg_heart_rate || 0,
          calories_active: item.calories_active || 0,
          calories_total: item.calories_total || 0,
          steps: item.steps || 0,
          weight: item.weight || 0,
          body_fat_percentage: item.body_fat_percentage || 0,
          stress_level: item.stress_level || 0,
          hrv: item.hrv || 0
        })));
      }
    } catch (error) {
      setError('Error fetching data: ' + error.message);
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
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      setSyncMessage('Data synced successfully!');
      fetchBiometricData();
    } catch (err) {
      setError(`Error syncing data: ${err.message}`);
      console.error('Sync error:', err);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    fetchBiometricData();
  }, []);

  return (
    <Box sx={{ 
      p: 4, 
      backgroundColor: colors.background,
      minHeight: '100vh'
    }}>
      {/* Dashboard Header */}
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography 
          variant="h3" 
          sx={{ 
            color: colors.primary,
            fontWeight: 600,
            letterSpacing: '-0.5px'
          }}
        >
          Individual Biometric Analytics
        </Typography>
        <Button 
          variant="contained" 
          onClick={syncData} 
          disabled={loading}
          startIcon={<SyncIcon />}
          sx={{
            backgroundColor: colors.secondary,
            '&:hover': {
              backgroundColor: colors.primary,
            },
            borderRadius: '8px',
            px: 3
          }}
        >
          {loading ? 'Syncing...' : 'Sync Data'}
        </Button>
      </Box>

      {/* Status Messages */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            borderRadius: '8px',
            backgroundColor: `${colors.error}15`
          }}
        >
          {error}
        </Alert>
      )}
      
      {syncMessage && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3,
            borderRadius: '8px',
            backgroundColor: `${colors.secondary}15`
          }}
        >
          {syncMessage}
        </Alert>
      )}

      {biometricData.length > 0 && (
        <Grid container spacing={3}>
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
          <Grid item xs={12} md={8}>
            <Card sx={{ 
              p: 3, 
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <Typography variant="h5" gutterBottom>Sleep Analysis</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={biometricData}>
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
                  <Area 
                    type="monotone" 
                    dataKey="deep_sleep" 
                    name="Deep Sleep" 
                    stackId="1" 
                    fill={colors.primary} 
                    stroke={colors.primary}
                    fillOpacity={0.8}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="light_sleep" 
                    name="Light Sleep" 
                    stackId="1" 
                    fill={colors.secondary} 
                    stroke={colors.secondary}
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rem_sleep" 
                    name="REM Sleep" 
                    stackId="1" 
                    fill={colors.accent1} 
                    stroke={colors.accent1}
                    fillOpacity={0.4}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
                <Typography variant="body2" color="textSecondary">
                  Sleep Score: {biometricData[biometricData.length - 1]?.sleep_score || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Sleep: {biometricData[biometricData.length - 1]?.sleep_hours || 0}hrs
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
      )}

      {/* Heart Rate Metrics component */}
      <HeartRateMetrics 
        resting={biometricData?.resting_heart_rate || 0}
        average={biometricData?.avg_heart_rate || 0}
        max={biometricData?.max_heart_rate || 0}
      />
    </Box>
  );
};

export default BiometricsDashboard; 