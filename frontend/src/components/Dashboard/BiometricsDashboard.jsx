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
          date: format(new Date(item.date), 'MM/dd')
        })));
      }
    } catch (error) {
      setError('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSyncMessage('Syncing data...');
      
      const response = await fetch('/api/biometrics/sync/', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      if (result.success) {
        setSyncMessage('Sync successful!');
        await fetchBiometricData();
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      setError('Error syncing data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate health score based on various metrics
  const calculateHealthScore = (data) => {
    if (!data || data.length === 0) return 0;
    const latestData = data[data.length - 1];
    
    // Normalize and weight different factors
    const sleepScore = (latestData.sleep_hours / 8) * 100 * 0.3;
    const hrvScore = (latestData.hrv / 100) * 100 * 0.2;
    const stressScore = ((100 - latestData.stress_level) / 100) * 100 * 0.2;
    const activityScore = (latestData.calories_active / 1000) * 100 * 0.3;
    
    return Math.min(Math.round(sleepScore + hrvScore + stressScore + activityScore), 100);
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
          Athlete Biometric Analytics
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
                <RadialBarChart 
                  width={250} 
                  height={250} 
                  innerRadius="60%" 
                  outerRadius="100%" 
                  data={[{
                    name: 'Health Score',
                    value: calculateHealthScore(biometricData),
                    fill: colors.accent3
                  }]} 
                  startAngle={90} 
                  endAngle={-270}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={30}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: '2rem',
                      fill: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {calculateHealthScore(biometricData)}%
                  </text>
                </RadialBarChart>
              </Box>
            </Card>
          </Grid>

          {/* Sleep Overview Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Sleep Analysis</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={biometricData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="deep_sleep" name="Deep Sleep" stackId="1" fill="#8884d8" />
                  <Area type="monotone" dataKey="light_sleep" name="Light Sleep" stackId="1" fill="#82ca9d" />
                  <Area type="monotone" dataKey="rem_sleep" name="REM Sleep" stackId="1" fill="#ffc658" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Grid>

          {/* Heart Rate Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Heart Rate Metrics</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={biometricData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="resting_heart_rate" name="Resting HR" stroke="#8884d8" />
                  <Line type="monotone" dataKey="avg_heart_rate" name="Average HR" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="max_heart_rate" name="Max HR" stroke="#ff7300" />
                </LineChart>
              </ResponsiveContainer>
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
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Body Composition</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={biometricData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="weight" name="Weight" stroke="#8884d8" />
                  <Line type="monotone" dataKey="body_fat_percentage" name="Body Fat %" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="bmi" name="BMI" stroke="#ffc658" />
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
    </Box>
  );
};

export default BiometricsDashboard; 