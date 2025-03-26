import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar, ComposedChart,
  Cell, PieChart, Pie, Scatter,
  ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Card, Grid, Typography, Box, Button,
  CircularProgress, Alert, useTheme,
  AppBar, Toolbar, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent,
  Tabs, Tab, styled, Select, FormControl, Switch, Tooltip as MuiTooltip,
  ListItemIcon, ListItemText, Chip, CardContent, List, ListItem, ListItemSecondaryAction
} from '@mui/material';
import { format } from 'date-fns';
import SyncIcon from '@mui/icons-material/Sync';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import RestoreIcon from '@mui/icons-material/Restore';
import BugReportIcon from '@mui/icons-material/BugReport';
import TableChartIcon from '@mui/icons-material/TableChart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import SpaIcon from '@mui/icons-material/Spa';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import InfoIcon from '@mui/icons-material/Info';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import CategoryIcon from '@mui/icons-material/Category';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ButtonGroup from '@mui/material/ButtonGroup';
import Divider from '@mui/material/Divider';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import HeartRateMetrics from '../HeartRateMetrics';
import axios from 'axios';
import WhoopConnect from '../WhoopConnect';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import './BiometricsDashboard.css';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DataArrayIcon from '@mui/icons-material/DataArray';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import RefreshIcon from '@mui/icons-material/Refresh';
import whoopBlackPuck from '../../assets/whoop-black-hollow.png';
import whoopWhiteCircle from '../../assets/whoop-white-circle.png';
import whoopBlack from '../../assets/whoop-black.png';
import whoopWhite from '../../assets/whoop-white.png';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

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
  // WHOOP brand colors
  whoopBlack: '#000000',
  whoopWhite: '#FFFFFF',
  whoopTeal: '#00F19F',
  whoopStrain: '#0093E7',
  whoopSleep: '#7BA1BB',
  whoopRecoveryBlue: '#67AEE6',
  whoopRecoveryHigh: '#16EC06',
  whoopRecoveryMedium: '#FFDE00',
  whoopRecoveryLow: '#FF0026',
  whoopBackground: '#283339',
  whoopBackgroundDark: '#101518',
  whoopCardBackground: 'rgba(52, 152, 219, 0.1)',
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
))(() => ({
  '& .MuiPaper-root': {
    borderRadius: 12,
    marginTop: 8,
    minWidth: 200,
  },
}));

const StyledMenuItem = styled(MenuItem)(() => ({
  margin: '4px 8px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateX(5px)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: 20,
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

// Add TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

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

// Add this helper function before the BiometricsDashboard component
const getSourceDescription = (source) => {
  switch(source) {
    case 'garmin':
      return 'Connect to your Garmin Connect account to sync activity, sleep, and health data.';
    case 'whoop':
      return 'Track recovery, strain, and sleep metrics with your WHOOP membership.';
    case 'fitbit':
      return 'Sync steps, exercise, sleep, and heart rate data from your Fitbit device.';
    case 'oura':
      return 'Access sleep, readiness, and activity metrics from your Oura Ring.';
    case 'apple_health':
      return 'Import comprehensive health and fitness data from your Apple Health app.';
    default:
      return 'Connect to sync your biometric data.';
  }
};

// Add this at the top level before any components
const createLogCollector = () => {
  const logGroups = {};
  let isExpanded = false;
  
  // Toggle function that can be called from console
  window.toggleDetailedLogs = () => {
    isExpanded = !isExpanded;
    console.log(`Detailed logs are now ${isExpanded ? 'EXPANDED' : 'COLLAPSED'}`);
    if (isExpanded) {
      // Print all collected logs when expanded
      Object.keys(logGroups).forEach(group => {
        console.groupCollapsed(`${group} (${logGroups[group].length} entries)`);
        logGroups[group].forEach(entry => console.log(entry));
        console.groupEnd();
      });
    }
  };
  
  return {
    collect: (groupName, message) => {
      if (!logGroups[groupName]) {
        logGroups[groupName] = [];
      }
      logGroups[groupName].push(message);
      
      // Only log the first occurrence of each group type
      if (logGroups[groupName].length === 1) {
        console.log(`${groupName}: 1 entry (call window.toggleDetailedLogs() to see all ${groupName} logs)`);
      } else if (logGroups[groupName].length % 10 === 0) {
        // Periodically update count
        console.log(`${groupName}: ${logGroups[groupName].length} entries collected`);
      }
    }
  };
};

// Create the log collector
const logCollector = createLogCollector();

// Add this WHOOP detection utility
const whoopDetector = {
  detected: false,
  // Check once if WHOOP is available in data
  checkInData: (data) => {
    if (!whoopDetector.detected && data) {
      const whoopItems = Object.values(data).flat().filter(item => 
        item && item.source === 'whoop'
      );
      if (whoopItems.length > 0) {
        whoopDetector.detected = true;
      }
    }
    return whoopDetector.detected;
  },
  // Check once if WHOOP is in active sources
  checkInSources: (sources) => {
    if (!whoopDetector.detected && sources && sources.length) {
      if (sources.some(source => source.id === "whoop")) {
        whoopDetector.detected = true;
      }
    }
    return whoopDetector.detected;
  }
};

// Suppress verbose logs
const suppressVerboseLogs = () => {
  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  // Create a log suppression system
  const suppressedGroups = {
    'sleep_conversion': {
      patterns: [
        /Unusually high sleep hours/,
        /Raw item data/,
        /Converting from milliseconds/,
        /Sleep hours adjusted/,
        /Using conversion factor/,
        /Sleep hours fixed/
      ],
      count: 0,
      lastReported: 0
    }
  };
  
  // Replace console.log
  console.log = function(...args) {
    if (args.length > 0 && typeof args[0] === 'string') {
      // Check if message matches any suppression pattern
      for (const [group, config] of Object.entries(suppressedGroups)) {
        const matches = config.patterns.some(pattern => pattern.test(args[0]));
        if (matches) {
          config.count++;
          // Only report periodically
          if (config.count === 1 || config.count % 30 === 0) {
            originalConsoleLog.apply(console, [`${group}: ${config.count} logs suppressed (see window.showSuppressedLogSummary())`]);
            config.lastReported = config.count;
          }
          return; // Skip logging this message
        }
      }
    }
    // If we get here, log normally
    originalConsoleLog.apply(console, args);
  };
  
  // Add method to view summary
  window.showSuppressedLogSummary = () => {
    originalConsoleLog.call(console, "=== Suppressed Log Summary ===");
    for (const [group, config] of Object.entries(suppressedGroups)) {
      originalConsoleLog.call(console, `${group}: ${config.count} logs suppressed`);
    }
    originalConsoleLog.call(console, "============================");
  };
};

// Initialize log suppression
suppressVerboseLogs();

const BiometricsDashboard = ({ username }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  // Dev mode flag - set to true for development, false for production
  const DEV_MODE = true;
  
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
  // Add new state variables for visualization modules
  const [visualizationModules, setVisualizationModules] = useState([]);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [moduleMenuAnchor, setModuleMenuAnchor] = useState(null);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [showAddModuleDialog, setShowAddModuleDialog] = useState(false);
  // Add new state variables for insights
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [insightCategories, setInsightCategories] = useState([]);
  const [insightTrends, setInsightTrends] = useState({});
  const [selectedInsightCategory, setSelectedInsightCategory] = useState('all');
  const [insightPriorityFilter, setInsightPriorityFilter] = useState('all');
  const [insightsFetching, setInsightsFetching] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [insightTabValue, setInsightTabValue] = useState(0);
  const [expandedInsightId, setExpandedInsightId] = useState(null);
  // Add this near the beginning of the component where other state variables are defined
  const [scrolled, setScrolled] = useState(false);
  const [dashboardTab, setDashboardTab] = useState(0); // New state for dashboard tabs
  // Add a state variable to track WHOOP data presence
  const [whoopDataPresent, setWhoopDataPresent] = useState(false);
  // Add a state variable to track WHOOP data presence
  const [hasWhoopData, setHasWhoopData] = useState(false);
  // Add state for WHOOP design mode
  const [whoopDesignActive, setWhoopDesignActive] = useState(false);

  // Use a ref instead of state to avoid re-renders
  const whoopRef = useRef({
    detected: false,
    checked: false
  });

  // Update localStorage when dark mode changes
  useEffect(() => {
    localStorage.setItem('biometricsDarkMode', darkMode);
  }, [darkMode]);

  // Add this effect to handle scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
    { 
      id: 'garmin', 
      name: 'Garmin', 
      description: 'Connect your Garmin device to sync your fitness data including activities, sleep, heart rate, and more.'
    },
    { 
      id: 'whoop', 
      name: 'WHOOP', 
      description: 'Connect your WHOOP strap to import sleep, recovery, and strain metrics for a complete health analysis.'
    }
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

  // Modify the fetchData function to include source-specific debugging
  const fetchData = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setBiometricData([]);

    try {
      // Request 30 days of data by default
      const days = 30;
      console.log(`Fetching biometric data for ${days} days...`);
      
      // Add source parameter if a specific source is selected
      const sourceParam = selectedDataSource && selectedDataSource !== 'all' 
        ? `&source=${selectedDataSource}` 
        : '';
      
      // Request data with optional source filter
      const response = await axios.get(`/api/biometrics/?days=${days}${sourceParam}`);
      console.log('Raw biometrics data:', response.data);

      // Add debugging for source inspection
      const sourcesInData = [...new Set(response.data.map(item => item.source))];
      console.log('Sources available in API response:', sourcesInData);
      
      // Check for Garmin data specifically
      const garminData = response.data.filter(item => 
        String(item.source || '').toLowerCase() === 'garmin'
      );
      console.log(`Found ${garminData.length} Garmin entries in API response`);
      
      // If we have active sources but no data, try to sync first before showing error
      if (!response.data || response.data.length === 0) {
        // If we have active sources but no data, try to sync first before showing error
        if (activeSources && activeSources.length > 0) {
          console.log('No data found but sources are active. Attempting to sync data...');
          await syncData();

          // Try fetching data again after sync
          const retryResponse = await axios.get(`/api/biometrics/?days=${days}${sourceParam}`);
          console.log('Raw biometrics data after sync:', retryResponse.data);

          if (!retryResponse.data || retryResponse.data.length === 0) {
            setHasActiveSources(false);
            setError('No data available. Please activate a data source or check your integration credentials.');
            return;
          }

          // Process the raw data after successful sync
          const processedData = processData(retryResponse.data);
          console.log(`Processed ${processedData.length} biometric data entries after sync`);
          console.log('Processed biometrics data:', processedData);

          // Sort by date (newest first)
          processedData.sort((a, b) => new Date(b.date) - new Date(a.date));
          setBiometricData(processedData);
          return;
        }

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

  // Add a function to ensure a CSRF token is available
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

  const handleSourceActivation = async (source, profile = null) => {
    console.log(`Activating source: ${source} with profile: ${profile}`);
    setLoading(true);
    setError(null);
    clearSyncMessages();

    try {
      // Make sure we have a CSRF token
      const csrftoken = await ensureCSRFToken();
      
      if (!csrftoken) {
        console.error("Failed to obtain CSRF token");
        addSyncMessage("Authentication error. Please try refreshing the page.", 'error');
        setLoading(false);
        return;
      }
      
      console.log(`Using CSRF token: ${csrftoken}`);
      
      // Use axios instead of fetch for better CSRF handling
      const response = await axios.post(
        '/api/biometrics/activate-source/', 
        {
          source,
          profile_type: profile
        },
        {
          headers: {
            'X-CSRFToken': csrftoken,
            // Include multiple CSRF header variations to ensure compatibility
            'X-CSRF-TOKEN': csrftoken,
            'CSRF-Token': csrftoken
          },
          withCredentials: true
        }
      );

      console.log(`Activation response status:`, response.status);
      const data = response.data;
      console.log('Activation response data:', data);

      if (data.success) {
        setActiveSource(source);
        addSyncMessage(`${source} source activated successfully!`);
        addSyncMessage(`Note: It may take up to a minute for your data to appear. Please be patient.`, 'info');
        await fetchActiveSources();
        await syncData();
      } else {
        const errorMsg = `Source activation failed: ${data.message || 'Unknown error'}`;
        console.error(errorMsg);
        setError(errorMsg);
        addSyncMessage(errorMsg, 'error');
      }
    } catch (err) {
      // Detailed error logging
      console.error('Source activation error:', err);
      
      // Handle different types of errors
      let errorMsg;
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        console.error('Error response headers:', err.response.headers);
        
        if (err.response.status === 403) {
          errorMsg = `Authentication error (403 Forbidden): CSRF token may be invalid`;
        } else {
          errorMsg = `Error activating source: ${err.response.data.message || err.response.status}`;
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('Error request:', err.request);
        errorMsg = `No response from server. Please check your connection.`;
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMsg = `Error: ${err.message}`;
      }
      
      setError(errorMsg);
      addSyncMessage(errorMsg, 'error');
      
      // As a fallback for dev/testing, try using a simplified approach
      if (err.response && err.response.status === 403) {
        console.log("Attempting to use mock data for testing/development");
        // For demo purposes, simulate success
        setActiveSource(source);
        addSyncMessage(`DEV MODE: Simulating successful connection to ${source}`, 'info');
        
        // If we have a function to update active sources, call it
        if (fetchActiveSources) {
          try {
            await fetchActiveSources();
          } catch (e) {
            console.error("Error fetching active sources after simulated activation:", e);
          }
        }
      }
    } finally {
      setLoading(false);
      setShowSourceMenu(false);
      setShowCredentialsMenu(false);
      setSelectedSource(null);
    }
  };

  const syncData = async (specificSource = null, forceRefresh = false) => {
    // Safely validate the specificSource parameter
    const isValidSource = specificSource && 
                         (typeof specificSource === 'string' || 
                          (typeof specificSource === 'object' && specificSource.id));
    
    // Only proceed if we have an active source or a valid specific source
    if (activeSource === null && !isValidSource) {
      console.log('No active source or valid specific source to sync');
      addSyncMessage('Please select a valid data source to sync', 'warning');
      return;
    }
    
    setLoading(true);
    clearSyncMessages(); // Clear existing messages before sync
    try {
      // Create request body with specific source if provided, ensuring it's a valid string
      const sourceToSync = isValidSource ? 
                         (typeof specificSource === 'string' ? specificSource : specificSource.id) :
                         null;
      
      const requestBody = {
        ...(sourceToSync ? { source: sourceToSync } : {}),
        force_refresh: forceRefresh
      };
      
      console.log('Syncing with request body:', requestBody);
      
      if (forceRefresh) {
        addSyncMessage('Performing force refresh - this may take longer than a normal sync...', 'info');
      }
      
      const response = await fetch('/api/biometrics/sync/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.cookie.split('csrftoken=')[1]?.split(';')[0],
        },
        body: JSON.stringify(requestBody),
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

      // Check if there's an error message in the response
      if (data.error) {
        messages.push({ text: `Sync Error: ${data.error}`, type: 'error' });
      }

      // Iterate over the success object to determine sync status for each source
      if (data.success) {
        for (const [source, success] of Object.entries(data.success)) {
          const capitalizedSource = source.charAt(0).toUpperCase() + source.slice(1);
          if (success) {
            messages.push({ text: `Successfully Synced: ${capitalizedSource}`, type: 'success' });
          } else {
            // Check if we have source-specific error information
            const errorMsg = data.errors && data.errors[source]
              ? data.errors[source]
              : `Failed to Sync: ${capitalizedSource}`;

            // Customize message for rate limit errors
            const isRateLimit = errorMsg.includes('Rate limit') || errorMsg.includes('429');
            const messageType = isRateLimit ? 'warning' : 'error';
            const displayMsg = isRateLimit
              ? `${capitalizedSource}: ${errorMsg}. Data in database is still available.`
              : `Failed to Sync: ${capitalizedSource}`;

            messages.push({ text: displayMsg, type: messageType });
          }
        }
      }

      // It's fine to set messages directly here as they're already in the correct format
      setSyncMessage(messages);
      fetchData();
    } catch (err) {
      const errorMsg = err.message;
      const isRateLimit = errorMsg.includes('Rate limit') || errorMsg.includes('429');
      const messageType = isRateLimit ? 'warning' : 'error';
      const displayMsg = isRateLimit
        ? `Sync limited: ${errorMsg}. Existing data is still available.`
        : `Error syncing data: ${errorMsg}`;

      setError(displayMsg);
      addSyncMessage(displayMsg, messageType);
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
    
    // Look for WHOOP data and set state if found
    const whoopItems = Object.values(data).flat().filter(item => 
      item && (item.source === 'whoop' || (item.metadata && item.metadata.source === 'whoop'))
    );
    
    // Only set state if WHOOP data is found and state hasn't been set yet
    if (whoopItems.length > 0 && !whoopRef.current.detected) {
      whoopRef.current.detected = true;
      whoopRef.current.checked = true;
    }
    
    return data.map(item => {
      try {
        // Enhance source detection logic
        // If item has WHOOP-specific fields but no source, mark as WHOOP
        if (!item.source && (item.recovery_score || item.hrv_ms)) {
          item.source = 'whoop';
        }
        
        // Convert seconds to hours and handle null/undefined values
        const sleepHours = (item.total_sleep_seconds || 0) / 3600;
        const deepSleepHours = (item.deep_sleep_seconds || 0) / 3600;
        const lightSleepHours = (item.light_sleep_seconds || 0) / 3600;
        const remSleepHours = (item.rem_sleep_seconds || 0) / 3600;
        const awakeHours = (item.awake_seconds || 0) / 3600;
        const inBedHours = (item.total_in_bed_seconds || 0) / 3600;
        
        // Debug unusual sleep values
        if (sleepHours > 24) {
          console.warn(`Unusually high sleep hours detected: ${sleepHours} hours (${item.total_sleep_seconds} seconds) for date ${item.date}`);
          console.log('Raw item data:', item);
        }
        
        // Determine if the data is in milliseconds (values would be ~1000x larger than expected)
        // Most reasonable sleep values should be between 0-12 hours
        const isMilliseconds = item.total_sleep_seconds > 50000 || 
                               item.deep_sleep_seconds > 20000 || 
                               item.light_sleep_seconds > 20000 || 
                               item.rem_sleep_seconds > 20000;

        // Apply appropriate conversion factor
        const conversionFactor = isMilliseconds ? 3600000 : 3600;

        // Convert values using the correct factor
        const fixedSleepHours = (item.total_sleep_seconds || 0) / conversionFactor;
        const fixedDeepSleepHours = (item.deep_sleep_seconds || 0) / conversionFactor;
        const fixedLightSleepHours = (item.light_sleep_seconds || 0) / conversionFactor;
        const fixedRemSleepHours = (item.rem_sleep_seconds || 0) / conversionFactor;
        const fixedAwakeHours = (item.awake_seconds || 0) / conversionFactor;
        const fixedInBedHours = (item.total_in_bed_seconds || 0) / conversionFactor;

        // Log the conversion for debugging
        if (isMilliseconds) {
          console.log(`Converting from milliseconds for date ${item.date}:`);
          console.log(`Sleep hours adjusted from ${sleepHours} to ${fixedSleepHours}`);
          console.log(`Using conversion factor: ${conversionFactor}`);
        }
        
        // Add additional logging for debugging
        if (fixedSleepHours !== sleepHours) {
          console.log(`Sleep hours fixed from ${sleepHours} to ${fixedSleepHours} for date ${item.date}`);
        }

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
          sleep_hours: roundToTwo(fixedSleepHours),
          deep_sleep: roundToTwo(fixedDeepSleepHours),
          light_sleep: roundToTwo(fixedLightSleepHours),
          rem_sleep: roundToTwo(fixedRemSleepHours),
          awake_time: roundToTwo(fixedAwakeHours),
          inBed_time: roundToTwo(fixedInBedHours),

          // Heart rate metrics (rounded to 2 decimal places)
          resting_heart_rate: roundToTwo(item.resting_heart_rate || 0),
          max_heart_rate: roundToTwo(item.max_heart_rate || 0),
          min_heart_rate: roundToTwo(item.min_heart_rate || 0),

          // Activity metrics
          steps: item.total_steps || 0,
          distance: roundToTwo((item.total_distance_meters || 0) / 1000), // Convert to km and round
          total_calories: roundToTwo(item.total_calories || 0),
          active_calories: roundToTwo(item.active_calories || 0),
          
          // If source is WHOOP, convert kilojoules to calories (1 kilojoule = 0.239 kilocalories)
          whoop_calories: item.source === 'whoop' && item.kilojoules ? roundToTwo(item.kilojoules * 0.239) : 0,

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

  // Add this helper function to get health score explanation for tooltip
  const getHealthScoreExplanation = (source) => {
    if (source === 'whoop') {
      return `WHOOP Health Score Calculation:
• If available, uses WHOOP's native recovery score
• Otherwise calculated with these weights:
  - Sleep quality: 30%
  - Heart Rate Variability (HRV): 30%
  - Respiratory rate: 20%
  - Resting heart rate: 20%`;
    } else if (source === 'oura') {
      return `Oura Health Score Calculation:
• Primarily based on Oura's readiness score
• Factors include: sleep quality, HRV, resting heart rate, and recovery index`;
    } else if (source === 'garmin') {
      return `Garmin Health Score Calculation:
• Based on Body Battery and other Garmin metrics
• Factors include: sleep quality, stress level, and activity`;
    } else if (source === 'fitbit') {
      return `Fitbit Health Score Calculation:
• Based on Fitbit's Daily Readiness score when available
• Otherwise calculated from: sleep score (40%), resting heart rate (30%), and activity level (30%)`;
    }
    return `Health Score Calculation:
• Sleep quality: 35%
• Recovery metrics (HRV, resting HR): 35%
• Activity balance: 30%
• Score ranges from 0-100, with higher being better`;
  };

  const handleLogout = async () => {
    try {
      // Get CSRF token from cookie
      const csrfToken = getCookie('csrftoken');

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
        window.location.href = '/?force_clear=1';  // Root URL is the homepage
      } else {
        console.error('Logout failed:', response.status, response.statusText);
        const errorMsg = 'Logout failed';
        setError(errorMsg);
        addSyncMessage(errorMsg, 'error');
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Logout error:', error);
      const errorMsg = `Failed to logout: ${error.message}`;
      setError(errorMsg);
      addSyncMessage(errorMsg, 'error');
    }
    closeMenu();
  };

  const addSyncMessage = (message, type = 'success') => {
    // Create a message object with type and text
    const messageObj = { type, text: message };

    // If syncMessage is null or empty, create a new array with the new message
    if (!syncMessage || syncMessage.length === 0) {
      setSyncMessage([messageObj]);
    } else if (Array.isArray(syncMessage)) {
      // If it's already an array, add the new message
      setSyncMessage([...syncMessage, messageObj]);
    } else {
      // If it's not an array (probably a string from old code), convert to array
      setSyncMessage([messageObj]);
    }
  };

  const clearSyncMessages = () => {
    setSyncMessage([]);
  };

  const fetchRawData = async () => {
    setLoading(true);
    clearSyncMessages();
    addSyncMessage('Fetching raw data...', 'info');

    try {
      const response = await fetch('/api/biometrics/raw/', {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        // Store the raw data in state (just for reference)
        setRawData(data.data);
        addSyncMessage(`Successfully fetched ${data.data.length} raw data items`);
        console.log('Raw data fetched successfully');

        // Create a download with the full raw data
        downloadRawData(data.data);
      } else {
        addSyncMessage(`Failed to fetch raw data: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error fetching raw data:', error);
      addSyncMessage(`Error fetching raw data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadRawData = (data) => {
    try {
      // Create a Blob with the data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Set filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `raw-biometric-data-${timestamp}.json`;

      // Configure and trigger download
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      addSyncMessage(`Downloaded raw data as ${filename}`);
    } catch (error) {
      console.error('Error creating download:', error);
      addSyncMessage(`Error creating download: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    if (biometricData.length === 0 && !loading) {
      // Only set to false if we don't have active sources
      if (!activeSources || activeSources.length === 0) {
        setHasActiveSources(false);
      } else {
        // Make sure active sources is true if we have sources
        setHasActiveSources(true);
      }
    } else if (biometricData.length > 0) {
      // If we have data, we definitely have active sources
      setHasActiveSources(true);
    }
  }, [biometricData, loading, activeSources]);

  useEffect(() => {
    const fetchGarminProfiles = async () => {
      try {
        console.log('Fetching Garmin profiles...');
        const response = await fetch('/api/biometrics/garmin-profiles/', { 
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Garmin profiles received:', data);
          if (data.profiles && Array.isArray(data.profiles)) {
            setGarminProfiles(data.profiles);
          } else {
            console.error('Unexpected Garmin profiles format:', data);
            // Set default profiles as fallback
            setGarminProfiles([
              {
                id: 'default',
                type: 'default',
                name: 'Default Garmin Account',
                description: 'Connect your Garmin Connect account to sync activity, sleep, and health data.'
              }
            ]);
          }
        } else {
          console.error('Error fetching Garmin profiles:', response.status);
          // Set default profiles as fallback
          setGarminProfiles([
            {
              id: 'default',
              type: 'default',
              name: 'Default Garmin Account',
              description: 'Connect your Garmin Connect account to sync activity, sleep, and health data.'
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching Garmin profiles:', error);
        // Set default profiles as fallback
        setGarminProfiles([
          {
            id: 'default',
            type: 'default',
            name: 'Default Garmin Account',
            description: 'Connect your Garmin Connect account to sync activity, sleep, and health data.'
          }
        ]);
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

  // Add a new effect to check for OAuth callback parameters
  useEffect(() => {
    // Check if we're coming back from an OAuth redirect by looking at URL params
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthProvider = urlParams.get('provider');
    const oauthError = urlParams.get('oauth_error');
    const errorDescription = urlParams.get('error_description');
    const errorMessage = urlParams.get('message');
    
    // If we have URL parameters indicating OAuth flow
    if (oauthProvider || oauthSuccess || oauthError) {
      console.log(`Detected OAuth parameters: provider=${oauthProvider}, success=${oauthSuccess}, error=${oauthError}`);
      
      // Handle OAuth success
      if (oauthSuccess === 'true' && oauthProvider) {
        addSyncMessage(`Successfully connected to ${oauthProvider}!`);
        // Refresh active sources and data after successful OAuth
        fetchActiveSources().then(() => syncData(oauthProvider));
      } 
      // Handle OAuth errors
      else if (oauthError) {
        console.error(`OAuth error: ${oauthError}`);
        
        // Format user-friendly error message
        let displayError = '';
        
        if (oauthError === 'rate_limited') {
          displayError = 'WHOOP is rate limiting requests. Please try again later.';
        } else if (oauthError === 'invalid_state') {
          displayError = 'Authentication session expired. Please try connecting again.';
        } else if (errorDescription) {
          displayError = errorDescription;
        } else if (errorMessage) {
          displayError = errorMessage;
        } else {
          displayError = `Error: ${oauthError}`;
        }
        
        addSyncMessage(`Error connecting to ${oauthProvider || 'service'}: ${displayError}`, 'error');
      }
      
      // Clean up URL parameters to avoid processing them again on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    
    // Check for WHOOP callback with state parameter
    const storedWhoopState = localStorage.getItem('whoopOAuthState');
    if (storedWhoopState && window.location.pathname === '/dashboard') {
      // We just returned from WHOOP authorization, need to ensure session is intact
      console.log("Detected return from WHOOP authorization");
      
      // Ensure we have a valid CSRF token
      ensureCSRFToken().then(() => {
        // Check if we need to refresh active sources
        fetchActiveSources();
      });
      
      // Clean up stored state
      localStorage.removeItem('whoopOAuthState');
    }
  }, []);

  // Also modify the useEffect that filters data based on selectedDataSource for better debugging
  useEffect(() => {
    if (biometricData.length > 0) {
      // More detailed debugging of source values
      console.log("Detailed source analysis:");
      
      const sourceValuesMap = {};
        biometricData.forEach(item => {
          const source = item.source || 'unknown';
        if (!sourceValuesMap[source]) {
          sourceValuesMap[source] = {
            count: 1,
            example: { 
              date: item.date, 
              source: item.source,
              sourceType: typeof item.source,
              hasGarminFields: !!(item.steps || item.body_battery),
              hasWhoopFields: !!(item.recovery_score || item.hrv_ms),
              availableFields: Object.keys(item).filter(k => 
                item[k] !== null && item[k] !== undefined && 
                !['id', 'date', 'source'].includes(k)
              ).slice(0, 5)
            }
          };
      } else {
          sourceValuesMap[source].count++;
        }
      });
      console.log("Source values and examples:", sourceValuesMap);
      
      // Filter data based on selected source
      let dataToUse = [];

      if (!selectedDataSource || selectedDataSource === 'all') {
        dataToUse = biometricData;
        console.log('Using all data sources');
      } else {
        console.log('selectedDataSource:', selectedDataSource);
        
        // Add extensive debugging to find WHOOP data
        const sourceCounts = {};
        biometricData.forEach(item => {
          const source = String(item.source || '').toLowerCase().trim();
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        console.log('Sources found in biometricData:', sourceCounts);
        
        // Check for WHOOP specifically
        const whoopItems = biometricData.filter(item => {
          const source = String(item.source || '').toLowerCase().trim();
          return source.includes('whoop') || 
                 (item.recovery_score !== undefined && item.recovery_score > 0) || 
                 (item.hrv_ms !== undefined && item.hrv_ms > 0);
        });
        console.log('Potential WHOOP items found:', whoopItems.length);
        
        // Enhanced matching for better filtering
        dataToUse = biometricData.filter(dataItem => {
          const itemSource = String(dataItem.source || '').toLowerCase().trim();
          const targetSource = String(selectedDataSource || '').toLowerCase().trim();
          
          // Exact match
          if (itemSource === targetSource) {
            return true;
          }
          
          // Partial match (includes)
          if (itemSource.includes(targetSource) || targetSource.includes(itemSource)) {
            return true;
          }
          
          // For WHOOP, also match based on WHOOP-specific fields
          if (targetSource === 'whoop' && 
              ((dataItem.recovery_score !== undefined && dataItem.recovery_score > 0) || 
               (dataItem.hrv_ms !== undefined && dataItem.hrv_ms > 0))) {
            console.log('Found WHOOP data via fields:', dataItem);
            return true;
          }
          
          return false;
        });
        
        console.log(`Found ${dataToUse.length} items matching source: ${selectedDataSource}`);
        
        // If no WHOOP data found but WHOOP was selected, show detailed debugging
        if (dataToUse.length === 0 && String(selectedDataSource || '').toLowerCase() === 'whoop') {
          console.log('No WHOOP data found despite selecting WHOOP. Checking all entries:');
          biometricData.slice(0, 10).forEach((item, index) => {
            console.log(`Item ${index}:`, {
              source: item.source,
              sourceType: typeof item.source,
              hasWhoopFields: !!(item.recovery_score || item.hrv_ms),
              hasGarminFields: !!(item.steps || item.body_battery),
              recoveryScore: item.recovery_score,
              hrvMs: item.hrv_ms
            });
          });
        }
      }
      
      console.log('dataToUse:', dataToUse);
      
      // Group data by date to handle multiple entries per day from different sources
      const dataByDate = {};
      dataToUse.forEach(item => {
        const dateKey = item.originalDate || item.date;
        if (!dataByDate[dateKey]) {
          dataByDate[dateKey] = [];
        }
        dataByDate[dateKey].push(item);
      });

      // Merge multiple entries for the same date by prioritizing non-zero values
      const mergedDataByDate = Object.keys(dataByDate).map(dateKey => {
        // If only one entry for this date, use it directly
        if (dataByDate[dateKey].length === 1) {
          return dataByDate[dateKey][0];
        }

        // If multiple entries, merge them prioritizing non-zero values
        const mergedEntry = { ...dataByDate[dateKey][0] }; // Start with first entry
        
        // Go through other entries and update any fields with non-zero/non-null values
        dataByDate[dateKey].slice(1).forEach(entry => {
          Object.keys(entry).forEach(key => {
            const value = entry[key];
            // Skip null, undefined, and 0 values if we already have a value
            if (value !== null && value !== undefined && value !== 0) {
              if (mergedEntry[key] === 0 || mergedEntry[key] === null || mergedEntry[key] === undefined) {
                mergedEntry[key] = value;
              }
            }
          });
        });
        
        return mergedEntry;
      });

      // For charts, we want chronological order (oldest to newest from left to right)
      const orderedData = [...mergedDataByDate].sort((a, b) => {
        // Convert date strings to Date objects for proper comparison
        const formatDateString = (str) => {
          // If the date is in MM/DD format, convert to YYYY-MM-DD using current year
          if (/^\d{2}\/\d{2}$/.test(str)) {
            const currentYear = new Date().getFullYear();
            const [month, day] = str.split('/');
            return `${currentYear}-${month}-${day}`;
          }
          return str;
        };
        
        // Handle original dates first, then formatted dates
        const dateA = new Date(formatDateString(a.originalDate || a.date));
        const dateB = new Date(formatDateString(b.originalDate || b.date));
        
        // Fall back to string comparison if date parsing fails
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          const strA = a.originalDate || a.date;
          const strB = b.originalDate || b.date;
          return strA.localeCompare(strB);
        }
        
        return dateA - dateB;
      });

      console.log('Original data order (newest first):',
        dataToUse.slice(0, 3).map(item => item.originalDate || item.date));
      console.log('Merged and ordered data for charts (oldest first):',
        orderedData.slice(0, 3).map(item => item.originalDate || item.date));

      // Add debug logging for health snapshot metrics
      if (orderedData.length > 0) {
        const latestData = orderedData[orderedData.length - 1];
        console.log('Health Snapshot latest data:', {
          date: latestData.originalDate || latestData.date,
          resting_heart_rate: latestData.resting_heart_rate,
          recovery_score: latestData.recovery_score,
          sleep_hours: latestData.sleep_hours,
          steps: latestData.steps,
          source: latestData.source
        });
      } else {
        console.log('No data available for Health Snapshot');
      }

      setFilteredData(orderedData);
    }
  }, [biometricData, selectedDataSource]);

  // Add a function to separate data by source for better visualization
  const getSourceSpecificData = (data, source) => {
    if (!data || data.length === 0) return [];
    return data.filter(item => 
      String(item.source || '').toLowerCase() === String(source || '').toLowerCase()
    );
  };

  // Function to determine which visualization to show based on data availability
  const shouldShowVisualization = (dataSource, requiredFields) => {
    if (!filteredData || filteredData.length === 0) return false;
    
    // If specific source requested, check if we have that source data
    const sourceData = dataSource === 'all' ? 
      filteredData : 
      filteredData.filter(item => String(item.source || '').toLowerCase() === String(dataSource || '').toLowerCase());
    
    if (sourceData.length === 0) return false;
    
    // Check if required fields have data
    return requiredFields.every(field => {
      return sourceData.some(item => item[field] !== undefined && item[field] !== null);
    });
  };

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

  // Footer section with download button
  const renderFooter = () => {
    // Define the download handler function directly within renderFooter
    const handleRawDataDownload = () => {
      if (typeof fetchRawData === 'function') {
        fetchRawData();
      } else {
        console.error('fetchRawData function is not available');
        // Fallback implementation
        setLoading(true);
        clearSyncMessages();
        addSyncMessage('Fetching raw data...', 'info');

        fetch('/api/biometrics/raw/', {
          credentials: 'include'
        })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              setRawData(data.data);
              addSyncMessage(`Successfully fetched ${data.data.length} raw data items`);

              // Create a download with the data
              const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `raw-biometric-data-${timestamp}.json`;

              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();

              setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }, 100);

              addSyncMessage(`Downloaded raw data as ${filename}`);
            } else {
              addSyncMessage(`Failed to fetch raw data: ${data.error || 'Unknown error'}`, 'error');
            }
          })
          .catch(error => {
            console.error('Error fetching raw data:', error);
            addSyncMessage(`Error fetching raw data: ${error.message}`, 'error');
          })
          .finally(() => {
            setLoading(false);
          });
      }
    };

    // Add console logs to check if WHOOP is detected as an active source
    console.log("Active sources in footer:", activeSources);
    console.log("Is WHOOP active?", activeSources.includes('whoop'));

    // Helper function to check if a source is active
    const isSourceActive = (sourceId) => {
      console.log("Checking if source is active:", sourceId, activeSources);
      return activeSources.some(source => 
        source.id === sourceId || source.source === sourceId || source.name === sourceId
      );
    };

    // Log the full structure of activeSources and check more explicitly for WHOOP
    console.log("Active sources in footer:", activeSources);
    
    // DIRECT check for WHOOP by ID
    const hasWhoop = activeSources.some(source => source.id === "whoop");
    console.log("Has WHOOP source by direct ID check:", hasWhoop);

    return (
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          width: '100%',
        }}
      >
        {/* Add WHOOP attribution if design mode is active */}
        {whoopDesignActive && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Box 
              component="img" 
              src={darkMode ? whoopWhiteCircle : whoopBlackPuck} 
              alt="WHOOP" 
        sx={{ 
                height: '50px', 
                width: 'auto',
                mb: 1
              }} 
            />
            <Typography 
              variant="body2" 
              sx={{ 
                  textAlign: 'center',
                fontFamily: "'Proxima Nova', 'Helvetica Neue', Helvetica, Arial, sans-serif",
                letterSpacing: '0.05em',
              }}
            >
              Powered by WHOOP
                </Typography>
              </Box>
        )}
        
        {/* Existing raw data button */}
                <Button
                                  variant="outlined"
          color="primary"
          size="small"
          onClick={handleRawDataDownload}
          sx={{ 
            mb: 2,
            ...(whoopDesignActive && {
              borderColor: colors.whoopTeal,
              color: colors.whoopTeal,
            })
          }}
          disabled={loading || !activeSources || activeSources.length === 0}
          startIcon={<BarChartIcon />}
        >
          Download Raw Data
        </Button>
        <Typography
          variant="caption"
          className="footer-text"
          sx={{
            display: 'block',
            mb: 1,
            fontFamily: whoopDesignActive ? 
              "'Proxima Nova', 'Helvetica Neue', Helvetica, Arial, sans-serif" : 
              'inherit',
          }}
        >
          Developed by Andrew Prince and Pulse Project LLC 2025
        </Typography>
      </Box>
    );
  };

  // Add this function near your other utility functions in BiometricsDashboard
  const diagnoseGarminIssue = async () => {
    console.log("Running Garmin data diagnosis...");
    setLoading(true);
    try {
      // First, try a direct request for Garmin data only
      const garminResponse = await axios.get('/api/biometrics/?days=60&source=garmin');
      console.log('Garmin-specific request response:', garminResponse.data);
      
      // Then get all sources for comparison
      const allResponse = await axios.get('/api/biometrics/?days=60');
      
      // Count data by source
      const sourceCounts = {};
      allResponse.data.forEach(item => {
        const source = item.source || 'unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      
      console.log('All sources in response:', sourceCounts);
      
      // Try to directly check database info via a new endpoint (you'd need to add this)
      try {
        const dbInfoResponse = await axios.get('/api/biometrics/db-info/');
        console.log('Database info:', dbInfoResponse.data);
      } catch (error) {
        console.log('Database info endpoint not available');
      }
      
      // Show a detailed diagnostic message
      const diagnosticMessage = `
        Diagnosis Results:
        - Total records: ${allResponse.data.length}
        - Sources found: ${Object.keys(sourceCounts).join(', ')}
        - Garmin records: ${garminResponse.data.length}
        
        This information suggests that ${garminResponse.data.length === 0 ? 
          "Garmin data is NOT being stored in the database correctly." : 
          "Garmin data IS in the database but may have filtering issues."}
      `;
      
      // Display results in an alert or dialog
      console.log(diagnosticMessage);
      openDialog("Garmin Data Diagnosis", diagnosticMessage);
      
    } catch (error) {
      console.error('Error during diagnosis:', error);
      setError(`Diagnosis error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to register available visualization modules
  const getAvailableModules = () => {
    return [
      {
        id: 'rhr-recovery',
        title: 'Resting Heart Rate & Recovery Score',
        description: 'Track your resting heart rate trend and daily recovery score',
        source: 'whoop',
        requiredFields: ['resting_heart_rate', 'recovery_score'],
        height: 300,
        render: (data) => (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="recovery_score" 
              name="Recovery Score" 
              fill={whoopDesignActive ? colors.whoopRecoveryBlue : "#27AE60"} 
              yAxisId="right" 
            >
              {whoopDesignActive && data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getWhoopRecoveryColor(entry.recovery_score)} 
                />
              ))}
            </Bar>
            <Line 
              type="monotone" 
              dataKey="resting_heart_rate" 
              name="Resting HR" 
              stroke={whoopDesignActive ? colors.whoopRecoveryBlue : "#e74c3c"} 
              yAxisId="left" 
              strokeWidth={2} 
            />
          </ComposedChart>
        )
      },
      {
        id: 'hrv-strain',
        title: 'HRV & Strain',
        description: 'Heart rate variability and daily strain metric',
        source: 'whoop',
        requiredFields: ['hrv_ms', 'strain'],
        height: 300,
        render: (data) => (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="hrv_ms" 
              name="HRV (ms)" 
              fill={whoopDesignActive ? colors.whoopRecoveryBlue : "#3498DB"} 
              yAxisId="left" 
            />
            <Line 
              type="monotone" 
              dataKey="strain" 
              name="Strain" 
              stroke={whoopDesignActive ? colors.whoopStrain : "#E74C3C"} 
              yAxisId="right" 
            />
          </ComposedChart>
        )
      },
      {
        id: 'sleep-metrics',
        title: 'Sleep Quality Metrics',
        description: 'Sleep efficiency, consistency and performance tracking',
        source: 'whoop',
        requiredFields: ['sleep_efficiency', 'sleep_consistency', 'sleep_performance'],
        height: 300,
        render: (data) => (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="sleep_efficiency" 
              name="Sleep Efficiency" 
              fill={whoopDesignActive ? colors.whoopSleep : "#3498DB"} 
            />
            <Bar 
              dataKey="sleep_consistency" 
              name="Sleep Consistency" 
              fill={whoopDesignActive ? colors.whoopTeal : "#F1C40F"} 
            />
            <Bar 
              dataKey="sleep_performance" 
              name="Sleep Performance" 
              fill={whoopDesignActive ? colors.whoopRecoveryBlue : "#27AE60"} 
            />
          </ComposedChart>
        )
      },
      {
        id: 'heart-rate-trends',
        title: 'Heart Rate Trends',
        description: 'Max, resting, and minimum heart rate over time',
        source: 'garmin',
        requiredFields: ['max_heart_rate', 'resting_heart_rate', 'min_heart_rate'],
        height: 300,
        render: (data) => (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="max_heart_rate" name="Max HR" stroke="#e74c3c" />
            <Line type="monotone" dataKey="resting_heart_rate" name="Resting HR" stroke="#2ecc71" />
            <Line type="monotone" dataKey="min_heart_rate" name="Min HR" stroke="#3498db" />
          </LineChart>
        )
      },
      {
        id: 'sleep-duration',
        title: 'Sleep Duration',
        description: 'Total sleep hours per night',
        source: 'garmin',
        requiredFields: ['sleep_hours'],
        height: 300,
        render: (data) => (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" domain={[0, 'dataMax + 2']} tickFormatter={(value) => `${value}h`} />
            <Tooltip formatter={(value) => [`${value} hours`, 'Sleep']} />
            <Bar yAxisId="left" dataKey="sleep_hours" name="Sleep Hours" fill="#3498db" />
          </BarChart>
        )
      },
      {
        id: 'steps-distance',
        title: 'Steps & Distance',
        description: 'Daily steps and distance traveled',
        source: 'garmin',
        requiredFields: ['steps', 'distance_meters'],
        height: 300,
        render: (data) => (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar dataKey="steps" name="Steps" fill="#3498db" yAxisId="left" />
            <Line type="monotone" dataKey="distance_meters" name="Distance (m)" stroke="#27AE60" yAxisId="right" strokeWidth={2} />
          </ComposedChart>
        )
      },
      {
        id: 'combined-sleep',
        title: 'Sleep Comparison (All Sources)',
        description: 'Compare sleep duration across different data sources',
        source: 'all',
        requiredFields: [],
        height: 300,
        render: (data) => {
          // Create datasets for each source that has sleep data
          const whoopData = getSourceSpecificData(data, 'whoop');
          const garminData = getSourceSpecificData(data, 'garmin');
          
          // Check if each source has actual sleep data
          const hasWhoopSleepData = whoopData.some(item => item.sleep_hours > 0);
          const hasGarminSleepData = garminData.some(item => item.sleep_hours > 0);
          
          // Combine data into a single format for the chart
          const combinedData = [];
          
          // Process all unique dates from sources that have data
          const datesToInclude = [];
          if (hasWhoopSleepData) datesToInclude.push(...whoopData.map(item => item.date));
          if (hasGarminSleepData) datesToInclude.push(...garminData.map(item => item.date));
          
          const allDates = [...new Set(datesToInclude)].sort();
          
          allDates.forEach(date => {
            const dataPoint = { date };
            
            if (hasWhoopSleepData) {
              const whoopItem = whoopData.find(item => item.date === date);
              if (whoopItem) dataPoint.whoop_sleep = whoopItem.sleep_hours || 0;
            }
            
            if (hasGarminSleepData) {
              const garminItem = garminData.find(item => item.date === date);
              if (garminItem) dataPoint.garmin_sleep = garminItem.sleep_hours || 0;
            }
            
            combinedData.push(dataPoint);
          });
          
          return (
            <BarChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" domain={[0, 'dataMax + 2']} tickFormatter={(value) => `${value}h`} />
              <Tooltip formatter={(value) => [`${value} hours`, null]} />
              <Legend />
              {hasWhoopSleepData && <Bar yAxisId="left" dataKey="whoop_sleep" name="WHOOP Sleep (hrs)" fill="#9b59b6" />}
              {hasGarminSleepData && <Bar yAxisId="left" dataKey="garmin_sleep" name="Garmin Sleep (hrs)" fill="#3498db" />}
            </BarChart>
          );
        }
      },
      {
        id: 'combined-rhr',
        title: 'Resting Heart Rate Comparison',
        description: 'Compare resting HR across different data sources',
        source: 'all',
        requiredFields: [],
        height: 300,
        render: (data) => {
          // Create datasets for each source that has RHR data
          const whoopData = getSourceSpecificData(data, 'whoop');
          const garminData = getSourceSpecificData(data, 'garmin');
          
          // Combine data into a single format for the chart
          const combinedData = [];
          
          // Process all unique dates
          const allDates = [...new Set([
            ...whoopData.map(item => item.date),
            ...garminData.map(item => item.date)
          ])].sort();
          
          allDates.forEach(date => {
            const whoopItem = whoopData.find(item => item.date === date);
            const garminItem = garminData.find(item => item.date === date);
            
            combinedData.push({
              date,
              'whoop_rhr': whoopItem?.resting_heart_rate || null,
              'garmin_rhr': garminItem?.resting_heart_rate || null
            });
          });
          
          return (
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="whoop_rhr" name="WHOOP RHR" stroke="#9b59b6" strokeWidth={2} />
              <Line type="monotone" dataKey="garmin_rhr" name="Garmin RHR" stroke="#3498db" strokeWidth={2} />
            </LineChart>
          );
        }
      },
      {
        id: 'training-load-index',
        title: 'Training Load Index',
        description: 'Combined metric showing training intensity over time',
        source: 'all',
        requiredFields: [],
        height: 300,
        render: (data) => {
          // Calculate a combined training load index
          const processedData = data.map(item => {
            // Calculate a training load score based on available metrics
            let trainingLoad = 0;
            let contributions = [];
            
            if (item.strain) {
              trainingLoad += item.strain * 0.7; // WHOOP strain is a good indicator
              contributions.push(`Strain: ${Math.round(item.strain * 0.7)}`);
            }
            
            if (item.max_heart_rate && item.resting_heart_rate) {
              // Heart rate reserve utilization
              const hrReserve = item.max_heart_rate - item.resting_heart_rate;
              const hrContribution = hrReserve * 0.05;
              trainingLoad += hrContribution;
              contributions.push(`HR: ${Math.round(hrContribution)}`);
            }
            
            if (item.steps) {
              // Steps contribution, capped to avoid overweighting
              const stepsContribution = Math.min(item.steps / 1000, 5); 
              trainingLoad += stepsContribution;
              contributions.push(`Steps: ${Math.round(stepsContribution)}`);
            }
            
            if (item.sleep_hours) {
              // Recovery factor - less sleep means higher effective load
              const optimalSleep = 8;
              const sleepDeficit = Math.max(0, optimalSleep - item.sleep_hours);
              const sleepContribution = sleepDeficit * 2;
              trainingLoad += sleepContribution;
              contributions.push(`Sleep: ${Math.round(sleepContribution)}`);
            }
            
            // Categorize the load
            let loadCategory = 'Low';
            let color = '#2ecc71'; // Green
            
            if (trainingLoad > 15) {
              loadCategory = 'High';
              color = '#e74c3c'; // Red
            } else if (trainingLoad > 8) {
              loadCategory = 'Moderate';
              color = '#f39c12'; // Orange
            }
            
            return {
              ...item,
              date: item.date,
              training_load: Math.round(trainingLoad),
              load_category: loadCategory,
              load_color: color,
              load_details: contributions.join(', ')
            };
          });
          
          // Sort by date
          processedData.sort((a, b) => new Date(a.date) - new Date(b.date));
          
          // Only include last 14 days for clarity
          const recentData = processedData.slice(-14);
          
          return (
            <ComposedChart data={recentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Box sx={{ 
                        p: 1.5, 
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        boxShadow: 2,
                        color: 'white',
                        backgroundColor: whoopDesignActive ? colors.whoopBackgroundDark : 'rgba(44, 62, 80, 0.95)',
                        ...(whoopDesignActive && {
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                        })
                      }}>
                        <Typography variant="subtitle2" sx={{ color: 'white' }}>{data.date}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: data.load_color }}>
                          Load: {data.training_load} ({data.load_category})
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255, 255, 255, 0.8)' }}>
                          {data.load_details}
                        </Typography>
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar 
                dataKey="training_load" 
                name="Training Load Index" 
              >
                {recentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.load_color} />
                ))}
              </Bar>
              <Line 
                type="monotone" 
                dataKey="training_load" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ stroke: '#8884d8', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          );
        }
      },
      {
        id: 'recovery-readiness',
        title: 'Recovery Readiness',
        description: 'Daily recovery status based on multiple metrics',
        source: 'all',
        requiredFields: [],
        height: 300,
        render: (data) => {
          // Calculate a readiness score from available metrics
          const processedData = data.map(item => {
            let recoveryScore = 0;
            let factors = [];
            
            // Start with WHOOP recovery if available (scale of 100)
            if (item.recovery_score) {
              recoveryScore = item.recovery_score;
              factors.push(`WHOOP: ${item.recovery_score}`);
            } 
            // Otherwise calculate from other metrics
            else {
              // Base score - neutral starting point
              recoveryScore = 70;
              
              // HRV contribution (higher HRV = better recovery)
              if (item.hrv_ms) {
                const hrvContribution = Math.min(Math.max(item.hrv_ms - 50, 0) / 10, 15);
                recoveryScore += hrvContribution;
                factors.push(`HRV: +${Math.round(hrvContribution)}`);
              }
              
              // RHR contribution (lower RHR usually = better recovery)
              if (item.resting_heart_rate) {
                // Assume 45-75 is normal range, lower is better
                const rhrNormalized = Math.min(Math.max(item.resting_heart_rate, 45), 75);
                const rhrContribution = (75 - rhrNormalized) / 2;
                recoveryScore += rhrContribution;
                factors.push(`RHR: +${Math.round(rhrContribution)}`);
              }
              
              // Sleep contribution
              if (item.sleep_hours) {
                const sleepContribution = (item.sleep_hours >= 7) ? 10 : (item.sleep_hours - 4) * 3;
                recoveryScore += sleepContribution;
                factors.push(`Sleep: ${sleepContribution > 0 ? '+' : ''}${Math.round(sleepContribution)}`);
              }
              
              // Sleep quality if available (e.g. efficiency)
              if (item.sleep_efficiency) {
                const efficiencyContribution = (item.sleep_efficiency - 80) / 2;
                recoveryScore += efficiencyContribution;
                factors.push(`Efficiency: ${efficiencyContribution > 0 ? '+' : ''}${Math.round(efficiencyContribution)}`);
              }
              
              // Cap at 0-100 range
              recoveryScore = Math.max(0, Math.min(100, recoveryScore));
            }
            
            // Determine category and color
            let category = 'Good';
            let color = '#2ecc71'; // Green
            
            if (recoveryScore < 33) {
              category = 'Poor';
              color = '#e74c3c'; // Red
            } else if (recoveryScore < 66) {
              category = 'Moderate';
              color = '#f39c12'; // Orange
            }
            
            return {
              ...item,
              date: item.date,
              readiness_score: Math.round(recoveryScore),
              readiness_category: category,
              readiness_color: color,
              readiness_factors: factors.join(', ')
            };
          });
          
          // Sort by date
          processedData.sort((a, b) => new Date(a.date) - new Date(b.date));
          
          // Only include last 14 days for clarity
          const recentData = processedData.slice(-14);
          
          return (
            <ComposedChart data={recentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <Box sx={{ 
                        p: 1.5, 
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        boxShadow: 2,
                        backgroundColor: 'black'
                        
                      }}>
                        <Typography variant="subtitle2">{data.date}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: data.readiness_color }}>
                          Readiness: {data.readiness_score}% ({data.readiness_category})
                        </Typography>
                        {data.readiness_factors && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            {data.readiness_factors}
                          </Typography>
                        )}
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="readiness_score" 
                name="Recovery Readiness" 
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
              />
              <ReferenceLine y={33} stroke="#e74c3c" strokeDasharray="3 3" />
              <ReferenceLine y={66} stroke="#f39c12" strokeDasharray="3 3" />
            </ComposedChart>
          );
        }
      },
      {
        id: 'sleep-analysis',
        title: 'Sleep Quality Analysis',
        description: 'Detailed breakdown of sleep metrics',
        source: 'whoop',
        requiredFields: ['sleep_hours', 'sleep_efficiency'],
        height: 300,
        render: (data) => {
          // Focus on sleep quality metrics
          const recentData = data
            .filter(item => item.sleep_hours && item.sleep_hours > 0)
            .slice(-10); // Show last 10 days with sleep data
          
          return (
            <RadarChart outerRadius={100} width={500} height={300} data={recentData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="date" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar 
                name="Sleep Efficiency" 
                dataKey="sleep_efficiency" 
                stroke="#3498db" 
                fill="#3498db" 
                fillOpacity={0.4} 
              />
              {recentData[0]?.sleep_performance && (
                <Radar 
                  name="Sleep Performance" 
                  dataKey="sleep_performance" 
                  stroke="#8e44ad" 
                  fill="#8e44ad" 
                  fillOpacity={0.4} 
                />
              )}
              {recentData[0]?.sleep_consistency && (
                <Radar 
                  name="Sleep Consistency" 
                  dataKey="sleep_consistency" 
                  stroke="#2ecc71" 
                  fill="#2ecc71" 
                  fillOpacity={0.4} 
                />
              )}
              {recentData[0]?.rem_sleep_percentage && (
                <Radar 
                  name="REM Sleep %" 
                  dataKey="rem_sleep_percentage" 
                  stroke="#f39c12" 
                  fill="#f39c12" 
                  fillOpacity={0.4} 
                />
              )}
              <Legend />
              <Tooltip formatter={(value) => [`${value}%`, null]} />
            </RadarChart>
          );
        }
      },
      {
        id: 'health-score-trends',
        title: 'Health Score Trends',
        description: 'Overall health score calculated from multiple metrics',
        source: 'all',
        requiredFields: [],
        height: 300,
        render: (data) => {
          // Use existing health score calculation
          const processedData = data.map(item => {
            // Only process if there are metrics available
            if (!item.resting_heart_rate && !item.hrv_ms && !item.sleep_hours) {
              return null;
            }
            
            // Get health score using existing function
            const score = calculateHealthScore([item]);
            
            return {
              ...item,
              date: item.date,
              health_score: score
            };
          }).filter(Boolean);
          
          // Sort by date
          processedData.sort((a, b) => new Date(a.date) - new Date(b.date));
          
          return (
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="health_score" name="Health Score" stroke="#8884d8" strokeWidth={2} />
              <ReferenceLine y={70} label="Target" stroke="green" strokeDasharray="3 3" />
            </LineChart>
          );
        }
      }
    ];
  };

  // Function to initialize default modules
  const initializeDefaultModules = () => {
    const availableModules = getAvailableModules();
    
    // Default configuration
    const defaultModuleIds = [
      'combined-rhr', 
      'recovery-readiness',
      'training-load-index',
      'combined-sleep', 
      'health-score-trends',
      'rhr-recovery', 
      'sleep-analysis',
      'heart-rate-trends', 
      'steps-distance'
    ];
    
    // Filter available modules for defaults only
    const defaultModules = availableModules.filter(
      module => defaultModuleIds.includes(module.id)
    );
    
    setVisualizationModules(defaultModules);
  };

  // Function to handle adding a new module
  const handleAddModule = (moduleId) => {
    const availableModules = getAvailableModules();
    const moduleToAdd = availableModules.find(m => m.id === moduleId);
    
    if (moduleToAdd) {
      setVisualizationModules(prev => [...prev, moduleToAdd]);
    }
    setShowAddModuleDialog(false);
  };

  // Function to handle removing a module
  const handleRemoveModule = (moduleId) => {
    setVisualizationModules(prev => prev.filter(m => m.id !== moduleId));
  };

  // Function to open module menu
  const handleOpenModuleMenu = (event, moduleId) => {
    setModuleMenuAnchor(event.currentTarget);
    setActiveModuleId(moduleId);
  };

  // Function to close module menu
  const handleCloseModuleMenu = () => {
    setModuleMenuAnchor(null);
    setActiveModuleId(null);
  };

  // Initialize default modules when dashboard mounts
  useEffect(() => {
    initializeDefaultModules();
  }, []);

  // Define the renderModuleVisualizations function to render all modules
  const renderModuleVisualizations = (data) => {
    if (!data || data.length === 0) {
      return (
        <Grid item xs={12}>
          <Alert severity="info">
            No data available for the selected source: {selectedDataSource}. 
            Try selecting a different source or syncing more data.
          </Alert>
        </Grid>
      );
    }

    return (
      <>
        {/* Header with controls for edit mode */}
        <Grid item xs={12}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                color: darkMode ? 'white' : colors.primary,
                fontFamily: whoopDesignActive ? 
                  "'Proxima Nova', 'Helvetica Neue', Helvetica, Arial, sans-serif" : 
                  'inherit',
                fontWeight: whoopDesignActive ? 'bold' : 600,
                letterSpacing: whoopDesignActive ? '0.1em' : 'inherit',
                textTransform: whoopDesignActive ? 'uppercase' : 'none'
              }}
            >
              Biometrics Dashboard
              {whoopDesignActive && (
                <Box 
                  component="span" 
                  sx={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    ml: 1, 
                    fontSize: '0.5em', 
                    opacity: 0.7 
                  }}
                >Powered by 
                  <Box 
                    component="img" 
                    src={darkMode ? whoopBlack : whoopWhite} 
                    alt="WHOOP" 
                    sx={{ 
                      height: '24px', 
                      width: 'auto',
                      mr: 0.5,
                      filter: darkMode ? 'invert(1)' : 'none' 
                    }} 
                  />
                  
                </Box>
              )}
            </Typography>
            
            {/* Show WHOOP design indicator in dev mode */}
            {whoopDesignActive && devMode && (
              <Chip 
                label="WHOOP Design Active" 
                color="secondary"
                size="small"
                sx={{ 
                  mr: 2, 
                  backgroundColor: colors.whoopTeal,
                  color: 'black'
                }}
              />
            )}
            
            <Box>
              {editModeEnabled ? (
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => setEditModeEnabled(false)}
                  startIcon={<CheckIcon />}
                  sx={{ 
                    mr: 1,
                    backgroundColor: whoopDesignActive ? colors.whoopTeal : undefined,
                    color: whoopDesignActive ? 'black' : undefined,
                  }}
                >
                  Done Editing
                </Button>
              ) : (
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => setEditModeEnabled(true)}
                  startIcon={<EditIcon />}
                  sx={{ 
                    mr: 1,
                    borderColor: whoopDesignActive ? colors.whoopTeal : undefined,
                    color: whoopDesignActive ? colors.whoopTeal : undefined,
                  }}
                >
                  Customize Dashboard
                </Button>
              )}
            </Box>
          </Box>
        </Grid>
        
        {/* Render each visualization module */}
        {visualizationModules.map(module => {
          // Check if we have the required data for this module
          const hasRequiredData = module.source === 'all' || 
            shouldShowVisualization(module.source, module.requiredFields);
          
          if (!hasRequiredData) {
            return null;
          }
          
          // Get source-specific data if needed
          const moduleData = module.source === 'all' 
            ? data 
            : getSourceSpecificData(data, module.source);
          
          // Determine data type for WHOOP attribution
          const dataType = module.id.includes('recovery') ? 'recovery' :
                         module.id.includes('sleep') ? 'sleep' :
                         module.id.includes('strain') ? 'strain' : null;
          
          // Apply WHOOP background to ALL cards when design is active
          const cardBackground = whoopDesignActive
            ? `linear-gradient(135deg, ${colors.whoopBackground} 0%, ${colors.whoopBackgroundDark} 100%)`
            : undefined;
          
          return (
            <Grid item xs={12} md={6} key={module.id}>
              <Card sx={{ 
                p: 2, 
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                background: cardBackground,
              }}>
                {/* Module header with title and action menu */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  mb: 1
                }}>
                  <Box>
                    {whoopDesignActive ? 
                      renderChartHeader(module.title, dataType) :
                      <Typography variant="h6" gutterBottom sx={{ color: colors.headings }}>
                        {module.title}
                      </Typography>
                    }
                    {(devMode || editModeEnabled) && 
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
                        Source: {module.source === 'all' ? 'Combined Sources' : module.source.toUpperCase()}
                      </Typography>
                    }
                  </Box>
                  
                  {editModeEnabled && (
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleOpenModuleMenu(e, module.id)}
                      sx={{ mt: -1, mr: -1 }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>
                
                {/* Module visualization */}
                <Box sx={{ overflow: 'hidden' }}>
                  <ResponsiveContainer width="100%" height={module.height || 300} style={{ overflow: 'visible', maxHeight: '100%' }}>
                    {module.render(moduleData)}
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>
          );
        })}
        
        {/* Add module button (only visible in edit mode) */}
        {editModeEnabled && (
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                p: 2, 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '2px dashed rgba(0, 0, 0, 0.12)',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                }
              }}
              onClick={() => setShowAddModuleDialog(true)}
            >
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center'
              }}>
                <AddCircleOutlineIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" color="primary">Add Visualization</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 1 }}>
                  Click to add a new visualization module to your dashboard
                </Typography>
              </Box>
            </Card>
          </Grid>
        )}
        
        {/* Module menu */}
        <Menu
          anchorEl={moduleMenuAnchor}
          open={Boolean(moduleMenuAnchor)}
          onClose={handleCloseModuleMenu}
        >
          <MenuItem onClick={() => {
            handleRemoveModule(activeModuleId);
            handleCloseModuleMenu();
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Remove" />
          </MenuItem>
        </Menu>
        
        {/* Module Selection Dialog */}
        <Dialog
          open={showAddModuleDialog}
          onClose={() => setShowAddModuleDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Add Visualization Module</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {getAvailableModules().map(module => {
                // Check if module is already added
                const isAlreadyAdded = visualizationModules.some(m => m.id === module.id);
                
                return (
                  <Grid item xs={12} md={6} key={module.id}>
                    <Card 
                      sx={{ 
                        p: 2, 
                        opacity: isAlreadyAdded ? 0.6 : 1,
                        cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                        position: 'relative',
                        '&:hover': {
                          boxShadow: isAlreadyAdded ? 'none' : '0 4px 20px rgba(0,0,0,0.1)',
                          transform: isAlreadyAdded ? 'none' : 'translateY(-4px)'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onClick={() => !isAlreadyAdded && handleAddModule(module.id)}
                    >
                      {isAlreadyAdded && (
                        <Box sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1,
                        }}>
                          <Chip label="Already Added" color="primary" variant="outlined" />
                        </Box>
                      )}
                      <Typography variant="h6" gutterBottom>
                        {module.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {module.description}
                      </Typography>
                      <Box sx={{ 
                        mt: 2, 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}>
                        <Chip 
                          label={module.source === 'all' ? 'Combined Sources' : module.source.toUpperCase()} 
                          size="small" 
                          color={
                            module.source === 'all' ? 'primary' : 
                            module.source === 'whoop' ? 'secondary' : 
                            'warning'
                          }
                          variant="outlined"
                        />
                        {!isAlreadyAdded && (
                          <IconButton size="small" color="primary">
                            <AddCircleOutlineIcon />
                          </IconButton>
                        )}
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  // Enhance the fetchInsights function
  const fetchInsights = async (specificSource = null) => {
    if (insightsFetching) return;
    
    setInsightsFetching(true);
    setInsightsError(null);
    
    try {
      // Fetch categories
      const categoriesResponse = await fetch('/api/insights/categories/', {
        credentials: 'include'
      });
      const categoriesData = await categoriesResponse.json();
      
      if (categoriesData.success) {
        setInsightCategories(categoriesData.categories);
      }
      
      // Determine which source to use - prioritize specifically requested source
      const sourceToUse = specificSource || selectedDataSource;
      const sourceParam = sourceToUse && sourceToUse !== 'all' 
        ? `&source=${sourceToUse}` 
        : '';
      
      // Fetch insights
      const insightsResponse = await fetch(`/api/insights/generate/?days=30${sourceParam}`, {
        credentials: 'include'
      });
      const insightsData = await insightsResponse.json();
      
      if (insightsData.success) {
        if (insightsData.insights && insightsData.insights.length > 0) {
          setInsights(insightsData.insights);
        } else {
          addSyncMessage(`No insights available for ${sourceToUse || 'selected sources'}. Try a different source.`, 'info');
        }
      }
      
      // Fetch recommendations
      const recommendationsResponse = await fetch(`/api/insights/recommendations/?days=30${sourceParam}`, {
        credentials: 'include'
      });
      const recommendationsData = await recommendationsResponse.json();
      
      if (recommendationsData.success) {
        setRecommendations(recommendationsData.recommendations || []);
      }
      
      // Fetch trends
      const trendsResponse = await fetch(`/api/insights/trends/?days=30${sourceParam}`, {
        credentials: 'include'
      });
      const trendsData = await trendsResponse.json();
      
      if (trendsData.success) {
        setInsightTrends(trendsData.trends || {});
      }
      
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsightsError('Failed to fetch insights. Please try again later.');
    } finally {
      setInsightsFetching(false);
    }
  };

  // Update the useEffect hook for insights
  useEffect(() => {
    if (tabValue === 2) {
      // Clear previous insights when changing tabs or data sources
      setInsights([]);
      setRecommendations([]);
      setInsightTrends({});
      
      // Fetch new insights
      fetchInsights();
    }
  }, [tabValue, selectedDataSource]);

  // Submit feedback for an insight
  const submitInsightFeedback = async (insightId, feedbackType, feedback = '') => {
    try {
      const response = await fetch('/api/insights/user-feedback/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
          insight_id: insightId,
          type: feedbackType,
          feedback
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the local state to reflect the feedback
        // This is just UI feedback - no need to modify the actual insights
        addSyncMessage(`Thank you for your feedback!`, 'success');
      } else {
        addSyncMessage(`Failed to submit feedback: ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      addSyncMessage('Failed to submit feedback. Please try again later.', 'error');
    }
  };
  
  // Helper function to get icon component by name
  const getIconByName = (iconName) => {
    const iconMap = {
      'BedtimeIcon': <BedtimeIcon />,
      'DirectionsRunIcon': <DirectionsRunIcon />,
      'RestoreIcon': <RestoreIcon />,
      'FavoriteIcon': <FavoriteIcon />,
      'MonitorHeartIcon': <MonitorHeartIcon />,
      'RestaurantIcon': <RestaurantIcon />,
      'SpaIcon': <SpaIcon />,
      'EmojiEventsIcon': <EmojiEventsIcon />,
      'InfoIcon': <InfoIcon />
    };
    
    return iconMap[iconName] || <InfoIcon />;
  };
  
  // Filter insights by category and priority
  const getFilteredInsights = () => {
    return insights.filter(insight => {
      const categoryMatch = selectedInsightCategory === 'all' || insight.category === selectedInsightCategory;
      const priorityMatch = insightPriorityFilter === 'all' || insight.priority === insightPriorityFilter;
      return categoryMatch && priorityMatch;
    });
  };
  
  // Get trend icon based on trend direction
  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <ArrowUpwardIcon color="success" />;
    if (trend === 'decreasing') return <ArrowDownwardIcon color="error" />;
    return <RemoveIcon color="action" />;
  };
  
  // Handle clicking on an insight accordion
  const handleInsightAccordionChange = (insightId) => (event, isExpanded) => {
    setExpandedInsightId(isExpanded ? insightId : null);
  };
  
  // Handle changing insight tabs
  const handleInsightTabChange = (event, newValue) => {
    setInsightTabValue(newValue);
  };

  // Add a style rule for all ResponsiveContainer instances
  useEffect(() => {
    // Add a style tag to the document
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      /* Target all possible scroll containers */
      .recharts-wrapper {
        overflow: visible !important;
      }
      .recharts-surface {
        overflow: visible !important;
      }
      /* Target the ResponsiveContainer */
      .recharts-responsive-container {
        overflow: visible !important;
      }
      /* Target any potential chart containers */
      .MuiCard-root .recharts-wrapper,
      .MuiCard-root .recharts-responsive-container,
      .MuiCardContent-root .recharts-wrapper,
      .MuiCardContent-root .recharts-responsive-container {
        overflow: visible !important;
      }
      /* Ensure no scrollbars on card content */
      .MuiCardContent-root {
        overflow: hidden !important;
      }
      /* Target any chart parent containers */
      [class*="chart-container"],
      [class*="chart"] {
        overflow: hidden !important;
      }
      /* Hide scrollbars but allow mouse wheel scrolling for the page itself */
      ::-webkit-scrollbar {
        width: 0px;
        height: 0px;
        background: transparent;
      }
      /* Completely hide all scrollbars in charts */
      .recharts-wrapper::-webkit-scrollbar,
      .recharts-surface::-webkit-scrollbar,
      .recharts-responsive-container::-webkit-scrollbar,
      .MuiCardContent-root::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
      }
      
      /* Firefox scrollbar hiding */
      .recharts-wrapper, .recharts-surface, .recharts-responsive-container, .MuiCardContent-root {
        scrollbar-width: none;
      }
      
      /* IE scrollbar hiding */
      .recharts-wrapper, .recharts-surface, .recharts-responsive-container, .MuiCardContent-root {
        -ms-overflow-style: none;
      }
      /* Fix for dark mode text in charts */
      .recharts-text {
        fill: ${darkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'};
      }
      .recharts-cartesian-axis-tick-value tspan {
        fill: ${darkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)'};
      }
      /* Fix for tooltip in dark mode */
      .recharts-tooltip-wrapper {
        filter: ${darkMode ? 'invert(0.85) hue-rotate(180deg)' : 'none'};
      }
      
      /* Fix for Recovery Readiness labels */
      .recharts-tooltip-wrapper .recharts-default-tooltip {
        background-color: white !important;
        border-radius: 5px;
        padding: 8px !important;
        box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.15);
      }
      
      /* Make sure text is visible */
      .recharts-tooltip-wrapper .recharts-default-tooltip .recharts-tooltip-item-list {
        color: rgba(0, 0, 0, 0.87);
      }
    `;
    document.head.appendChild(styleTag);
    
    // Clean up the style tag when the component unmounts
    return () => {
      document.head.removeChild(styleTag);
    };
  }, [darkMode]);

  useEffect(() => {
    // Add specific fixes for individual charts right after mount
    const fixChartScrollbars = () => {
      // Target specific chart containers by their titles/headers
      const allHeadings = document.querySelectorAll('div[role="heading"], h1, h2, h3, h4, h5, h6, .MuiTypography-root');
      const sleepCharts = [];
      const respirationCharts = [];
      
      // Find headings with the specific text
      allHeadings.forEach(heading => {
        if (heading.textContent && heading.textContent.includes('Sleep Duration')) {
          sleepCharts.push(heading);
        }
        if (heading.textContent && heading.textContent.includes('Respiration Range')) {
          respirationCharts.push(heading);
        }
      });
      
      // Function to find and fix parent containers
      const fixParentContainer = (element) => {
        if (!element) return;
        // Navigate up to find chart container
        let parent = element.parentElement;
        for (let i = 0; i < 5; i++) { // Look up to 5 levels up
          if (parent) {
            // Apply styles to any overflow containers
            const containers = parent.querySelectorAll('div');
            containers.forEach(container => {
              const style = window.getComputedStyle(container);
              if (style.overflow === 'auto' || style.overflow === 'scroll' || 
                  style.overflowX === 'auto' || style.overflowX === 'scroll' ||
                  style.overflowY === 'auto' || style.overflowY === 'scroll') {
                container.style.overflow = 'hidden';
              }
            });
            parent = parent.parentElement;
          }
        }
      };
      
      // Apply fixes
      sleepCharts.forEach(fixParentContainer);
      respirationCharts.forEach(fixParentContainer);
    };
    
    // Run initial fix
    setTimeout(fixChartScrollbars, 1000);
    
    // Run fix again if window is resized
    window.addEventListener('resize', fixChartScrollbars);
    
    return () => {
      window.removeEventListener('resize', fixChartScrollbars);
    };
  }, []);

  // Handle dashboard tab change
  const handleDashboardTabChange = (event, newValue) => {
    setDashboardTab(newValue);
  };

  // Add the removeDataSource function to disconnect a data source
  const removeDataSource = async (sourceId) => {
    if (!sourceId) {
      console.error('No source ID provided for disconnection');
      addSyncMessage('Error: No source specified for disconnection', 'error');
      return;
    }
    
    // Format the source name for display
    const sourceName = sourceId.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Confirm with the user before disconnecting
    if (!window.confirm(`Are you sure you want to disconnect ${sourceName}? This will remove all associated data connections.`)) {
      return;
    }
    
    setLoading(true);
    clearSyncMessages();
    
    try {
      // Make sure we have a CSRF token
      const csrftoken = await ensureCSRFToken();
      
      if (!csrftoken) {
        console.error("Failed to obtain CSRF token");
        addSyncMessage("Authentication error. Please try refreshing the page.", 'error');
        setLoading(false);
        return;
      }
      
      console.log('Using CSRF token:', csrftoken);
      
      // Use axios instead of fetch for better error handling
      const response = await axios.post(
        '/api/biometrics/remove-source/',
        { source: sourceId },
        {
          headers: {
            'X-CSRFToken': csrftoken,
            // Include multiple CSRF header variations to ensure compatibility
            'X-CSRF-TOKEN': csrftoken,
            'CSRF-Token': csrftoken
          },
          withCredentials: true
        }
      );
      
      console.log('Disconnect response:', response.status, response.data);
      
      const data = response.data;
      
      if (data.success) {
        addSyncMessage(`Successfully disconnected ${sourceName}`, 'success');
        
        // Update local state to remove the disconnected source
        setActiveSources(prevSources => 
          prevSources.filter(source => {
            const id = source.id || source;
            return id !== sourceId;
          })
        );
        
        // If the currently selected data source is the one being removed, reset to 'all'
        if (selectedDataSource === sourceId) {
          setSelectedDataSource('all');
        }
        
        // Refresh data after disconnection
        await fetchActiveSources();
        await fetchData();
        
        // Show notice to the user about refreshing the page if needed
        addSyncMessage('Disconnection complete. You may need to refresh the page to see all changes.', 'info');
      } else {
        const errorMsg = data.message || data.error || 'Unknown error during disconnection';
        addSyncMessage(`Error disconnecting source: ${errorMsg}`, 'error');
      }
    } catch (error) {
      console.error('Error disconnecting source:', error);
      
      // Handle different types of errors
      let errorMsg;
      if (error.response) {
        // The request was made and the server responded with a status code outside 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        if (error.response.status === 403) {
          errorMsg = `Authentication error (403 Forbidden): CSRF token may be invalid`;
          
          // For development purposes only - simulate success
          console.log("Development mode: simulating successful disconnection");
          addSyncMessage(`DEV MODE: Simulated disconnection of ${sourceName}`, 'info');
          
          // Update UI to reflect disconnection
          setActiveSources(prevSources => 
            prevSources.filter(source => {
              const id = source.id || source;
              return id !== sourceId;
            })
          );
          
          // If the currently selected data source is the one being removed, reset to 'all'
          if (selectedDataSource === sourceId) {
            setSelectedDataSource('all');
          }
          
          // Try to fetch active sources
          try {
            await fetchActiveSources();
          } catch (e) {
            console.error("Error refreshing active sources:", e);
          }
        } else {
          errorMsg = `Error disconnecting source: ${error.response.data?.message || error.response.status}`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        errorMsg = `No response from server. Please check your connection.`;
      } else {
        // Something happened in setting up the request
        errorMsg = `Error: ${error.message}`;
      }
      
      addSyncMessage(`Error: ${errorMsg || 'Failed to disconnect source'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add a function to get WHOOP-specific data reliably
  const getWhoopData = () => {
    if (!biometricData || biometricData.length === 0) return [];
    
    return biometricData.filter(item => {
      // Check both by source field and by WHOOP-specific data patterns
      const isWhoopSource = String(item.source || '').toLowerCase().includes('whoop');
      const hasWhoopSpecificFields = (
        (item.recovery_score !== undefined && item.recovery_score > 0) ||
        (item.hrv_ms !== undefined && item.hrv_ms > 0) || 
        (item.strain !== undefined && item.strain > 0) ||
        (item.sleep_performance !== undefined && item.sleep_performance > 0)
      );
      
      return isWhoopSource || hasWhoopSpecificFields;
    });
  };
  
  // Function to get latest significant value for a metric from any data source
  const getLatestMetricValue = (metricName, defaultValue = '—') => {
    if (!filteredData || filteredData.length === 0) {
      return defaultValue;
    }
    
    // Try to get from filtered data first
    for (let i = 0; i < Math.min(5, filteredData.length); i++) {
      const dataPoint = filteredData[filteredData.length - 1 - i];
      if (dataPoint[metricName] !== undefined && 
          dataPoint[metricName] !== null && 
          dataPoint[metricName] > 0) {
        return dataPoint[metricName];
      }
    }
    
    // If not found and the metric is a WHOOP-specific one, check WHOOP data
    if (['recovery_score', 'hrv_ms', 'strain', 'sleep_performance'].includes(metricName)) {
      const whoopData = getWhoopData();
      if (whoopData.length > 0) {
        // Sort by date, newest first
        const sortedWhoopData = [...whoopData].sort((a, b) => {
          const dateA = new Date(a.originalDate || a.date);
          const dateB = new Date(b.originalDate || b.date);
          return dateB - dateA; // Newest first
        });
        
        // Get the first item with a valid value for the metric
        for (const item of sortedWhoopData) {
          if (item[metricName] !== undefined && 
              item[metricName] !== null && 
              item[metricName] > 0) {
            return item[metricName];
          }
        }
      }
    }
    
    return defaultValue;
  };

  useEffect(() => {
    // Initial data fetch and setup
    const initialSetup = async () => {
      try {
        await ensureCSRFToken();
        await fetchActiveSources();
        await fetchData();
        
        // Check if we need to sync data after login
        const needsInitialSync = localStorage.getItem('needsInitialSync') === 'true';
        if (needsInitialSync) {
          // Remove the flag and trigger background sync
          localStorage.removeItem('needsInitialSync');
          // Add a message to inform user that sync is happening
          addSyncMessage('Your data is being updated in the background');
          // Start sync in background
          syncData(null, false);
        }
      } catch (error) {
        handleError(error);
      }
    };
    
    initialSetup();
    
    // Set up window event listeners, etc.
    // ... existing setup code ...
    
  }, []);

  // Use a memoized value to check if WHOOP is an active source
  const isWhoopActive = useMemo(() => {
    return hasWhoopData || activeSources.some(source => source.id === "whoop");
  }, [activeSources, hasWhoopData]);

  // Simple function to check WHOOP status (not called each render)
  const checkWhoopStatus = useCallback(() => {
    // Only perform this check once
    if (!whoopRef.current.checked) {
      whoopRef.current.checked = true;
      
      // Check activeSources for WHOOP
      if (activeSources.some(source => source.id === "whoop")) {
        whoopRef.current.detected = true;
      }
    }
    return whoopRef.current.detected;
  }, [activeSources]);
  
  // Update useEffect to set WHOOP detection when data is processed
  useEffect(() => {
    if (biometricData && !whoopRef.current.checked) {
      // If we have any WHOOP data items, mark WHOOP as detected
      const hasWhoopData = Object.values(biometricData)
        .some(dataset => 
          Array.isArray(dataset) && 
          dataset.some(item => item && item.source === 'whoop')
        );
      
      if (hasWhoopData) {
        whoopRef.current.detected = true;
        whoopRef.current.checked = true;
      }
    }
  }, [biometricData]);

  // Check for WHOOP when activeSources changes
  useEffect(() => {
    whoopDetector.checkInSources(activeSources);
  }, [activeSources]);

  // Add this useEffect to detect WHOOP and activate design mode
  useEffect(() => {
    const isWhoopActive = activeSources && activeSources.some(source => {
      return source && (source.id === "whoop" || source === "whoop");
    });
    
    setWhoopDesignActive(isWhoopActive);
    
    if (isWhoopActive && devMode) {
      console.log("WHOOP design guidelines activated");
      // Add a notification for dev mode
      addSyncMessage("WHOOP design guidelines activated", "info");
    }
  }, [activeSources, devMode]);

  // Helper function to get the appropriate recovery color based on WHOOP guidelines
  const getWhoopRecoveryColor = (recoveryScore) => {
    if (recoveryScore >= 67) return colors.whoopRecoveryHigh;
    if (recoveryScore >= 34) return colors.whoopRecoveryMedium;
    return colors.whoopRecoveryLow;
  };

  // Helper function to add WHOOP attribution to chart headers
  const renderChartHeader = (title, dataType = null) => {
    if (!whoopDesignActive) {
      return <Typography variant="h6" gutterBottom>{title}</Typography>;
    }
    
    const whoopAttributionText = dataType === 'recovery' ? 'Data by' : 
                               dataType === 'sleep' ? 'Imported from' :
                               'Powered by';
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            fontFamily: "'Proxima Nova', 'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            textTransform: whoopDesignActive ? 'uppercase' : 'none',
            color: 'white'
          }}
        >
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary',
              mr: 1,
              fontFamily: "'Proxima Nova', 'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          >
            {whoopAttributionText}
          </Typography>
          <Box 
            component="img" 
            src={whoopBlackPuck} 
            alt="WHOOP" 
            sx={{ 
              height: '20px', 
              width: 'auto',
              filter: 'invert(1)'
            }} 
          />
        </Box>
      </Box>
    );
  };

  // Force dark mode when WHOOP design is active
  useEffect(() => {
    if (whoopDesignActive && !darkMode) {
      setDarkMode(true);
      if (devMode) {
        addSyncMessage("Dark mode enforced to comply with WHOOP design guidelines", "info");
      }
    }
  }, [whoopDesignActive]);
  
  // Modified dark mode toggle handler
  const handleDarkModeToggle = () => {
    if (whoopDesignActive) {
      // Create a more visible notification that isn't tied to the component state
      const notification = document.createElement('div');
      notification.className = 'whoop-dark-mode-warning';
      notification.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #FF9800;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: 'Roboto', sans-serif;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 90%;
        animation: fadeIn 0.3s ease-out;
      `;
      
      // Add warning icon and text
      notification.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>
        </svg>
        <span>Light mode is disabled when using WHOOP design guidelines</span>
      `;
      document.body.appendChild(notification);
      
      // Remove after 3 seconds
      setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 3000);
      
      // Also add to sync messages for permanent record
      addSyncMessage("Light mode is not permitted when using WHOOP design guidelines", "warning");
    } else {
      setDarkMode(!darkMode);
    }
  };

  // Add CSS animations to the document
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      
      @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, -20px); }
      }
      
      /* Force text colors on integration cards */
      [role="tabpanel"]:nth-of-type(2) .MuiCard-root {
        color: ${darkMode ? 'white' : 'inherit'} !important;
      }
      
      [role="tabpanel"]:nth-of-type(2) .MuiTypography-root {
        color: ${darkMode ? 'white' : 'inherit'} !important;
      }
      
      [role="tabpanel"]:nth-of-type(2) .MuiTypography-body2 {
        color: ${darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'} !important;
      }
      
      [role="tabpanel"]:nth-of-type(2) .MuiAlert-standardInfo .MuiAlert-message {
        color: ${darkMode ? 'rgba(255, 255, 255, 0.9)' : 'inherit'} !important;
      }
    `;
    document.head.appendChild(styleTag);
    
    return () => {
      document.head.removeChild(styleTag);
    };
  }, [darkMode]);

  // Use this in your rendering code where the health score is displayed
  // For example, in the health score card/component:

  const renderHealthScoreCard = (data, source) => {
    const score = calculateHealthScore(data);
    const dataSource = source || (data && data.length > 0 ? data[data.length - 1].source : null);
    
    return (
      <Card sx={{ 
        height: '100%', 
        borderRadius: '12px',
        ...(whoopDesignActive && { backgroundColor: colors.whoopCardBackground })
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="h6" sx={{ mb: 2, color: whoopDesignActive ? 'white' : 'inherit' }}>
              Health Score
              <Tooltip 
                title={
                  <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                    {getHealthScoreExplanation(dataSource)}
                  </Typography>
                }
                placement="top"
                enterTouchDelay={0}
                leaveTouchDelay={3000}
              >
                <IconButton size="small" sx={{ ml: 1, p: 0 }}>
                  <InfoOutlinedIcon fontSize="small" sx={{ color: whoopDesignActive ? 'white' : 'inherit' }}/>
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>
          
          {/* Health score value display */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
            <CircularProgress 
              variant="determinate" 
              value={score} 
              size={120}
              thickness={5}
              sx={{
                color: getScoreColor(score),
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
            <Box sx={{ 
              position: 'absolute', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: whoopDesignActive ? 'white' : 'inherit' }}>
                {Math.round(score)}
              </Typography>
              <Typography variant="caption" sx={{ color: whoopDesignActive ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
                /100
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Helper function to determine color based on score value
  const getScoreColor = (score) => {
    if (score >= 80) return colors.whoopDesignActive ? colors.whoopRecoveryHigh : '#2ecc71';
    if (score >= 60) return colors.whoopDesignActive ? colors.whoopRecoveryMedium : '#f39c12';
    return colors.whoopDesignActive ? colors.whoopRecoveryLow : '#e74c3c';
  };

  // If there's a custom tooltip component for the Recovery Readiness chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box 
          sx={{ 
            backgroundColor: 'white',
            padding: 1.5,
            borderRadius: 1,
            boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(0, 0, 0, 0.12)'
          }}
        >
          <Typography variant="body2">{label}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Readiness: ({payload[0].value > 0 ? 'Good' : 'Poor'})
          </Typography>
          <Typography variant="body2">{payload[0].value}</Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box className={`biometrics-dashboard ${darkMode ? '' : 'light-mode'}`}>
      {/* Updated header and navigation */}
      <Box 
        className={`header-gradient ${scrolled ? 'scrolled' : ''}`}
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box className="header-content">
          <IconButton
            color="inherit"
            onClick={openMenu}
            className="menu-button-animated"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h5" className="header-title" sx={{ fontWeight: 600 }}>
            {whoopDesignActive ? (
              <>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
            Pulse
                            <Box 
                              component="img" 
                    src={whoopWhiteCircle}
                              alt="WHOOP" 
                    sx={{ height: '22px', width: 'auto', ml: 1 }}
                  />
                </Box>
              </>
            ) : (
              <>Pulse</>
            )}
            <Box component="span" sx={{ 
              fontWeight: 300, 
              opacity: 0.8,
              ml: 1,
              fontSize: '0.8em',
              background: 'none',
              WebkitTextFillColor: darkMode ? 'white' : '#2C3E50'
            }}>
              Dashboard
            </Box>
          </Typography>
        </Box>

        {/* Header controls with modified dark mode toggle */}
        <Box className="header-controls">
          {/* Dark mode toggle */}
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: whoopDesignActive ? 0.5 : 1,
              pointerEvents: whoopDesignActive ? 'none' : 'auto',
              position: 'relative'
            }}
          >
            <Brightness4Icon 
              sx={{ 
                color: darkMode ? 'white' : '#2C3E50', 
                fontSize: '1.2rem',
                opacity: darkMode ? 1 : 0.5
              }} 
            />
            <Box 
              className={`toggle-switch ${darkMode ? 'active' : ''}`}
              onClick={() => {
                if (whoopDesignActive) {
                  // Create and show warning directly on click
                  const notification = document.createElement('div');
                  notification.className = 'whoop-dark-mode-warning';
                  notification.style.cssText = `
                    position: fixed;
                    top: 70px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #FF9800;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    z-index: 9999;
                    font-family: 'Roboto', sans-serif;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    max-width: 90%;
                    animation: fadeIn 0.3s ease-out;
                  `;
                  
                  // Add warning icon and text
                  notification.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>
                    </svg>
                    <span>Light mode is disabled when using WHOOP design guidelines</span>
                  `;
                  document.body.appendChild(notification);
                  
                  // Remove after 3 seconds
                  setTimeout(() => {
                    notification.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => {
                      document.body.removeChild(notification);
                    }, 300);
                  }, 3000);
                  
                  // Also add to sync messages for permanent record
                  addSyncMessage("Light mode is not permitted when using WHOOP design guidelines", "warning");
                } else {
                  setDarkMode(!darkMode);
                }
              }}
              sx={{ 
                cursor: whoopDesignActive ? 'not-allowed' : 'pointer',
                position: 'relative'
              }}
              data-whoop-active={whoopDesignActive ? "true" : "false"}
            ></Box>
            <Brightness7Icon 
              sx={{ 
                color: darkMode ? 'white' : '#2C3E50', 
                fontSize: '1.2rem',
                opacity: darkMode ? 0.5 : 1
              }} 
            />
            {whoopDesignActive && (
              <MuiTooltip 
                title={
                  <Typography sx={{ color: 'white' }}>
                    Light mode is disabled when using WHOOP design guidelines
                  </Typography>
                } 
                arrow
                componentsProps={{
                  tooltip: {
                    sx: {
                      bgcolor: 'rgba(0, 0, 0, 0.9)',
                      '& .MuiTooltip-arrow': {
                        color: 'rgba(0, 0, 0, 0.9)'
                      }
                    }
                  }
                }}
              >
                <InfoIcon sx={{ ml: 1, fontSize: '0.9rem', color: '#FF9800', opacity: 1 }} />
              </MuiTooltip>
            )}
          </Box>

          {/* Dev Mode indicator */}
          {devMode && (
            <Chip 
              size="small"
              label="Dev Mode" 
              color="secondary"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
      </Box>

      {/* Dashboard tabs */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider', 
        mt: 1,
        background: darkMode ? 'rgba(10, 14, 23, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      }}>
        <Tabs 
          value={dashboardTab} 
          onChange={handleDashboardTabChange} 
          aria-label="dashboard tabs"
          centered
          sx={{ minHeight: '48px' }}
        >
          <Tab icon={<HomeOutlinedIcon />} label="Dashboard" sx={{ minHeight: '48px' }} />
          <Tab icon={<DevicesOutlinedIcon />} label="Active Integrations" sx={{ minHeight: '48px' }} />
        </Tabs>
      </Box>

      {/* Main content container */}
      <Box className="dashboard-content" p={3}>
        {/* Dashboard home view */}
        {dashboardTab === 0 && (
          <>
            {/* Show info alert for sync status if any */}
            {syncMessage && syncMessage.length > 0 ? (
              <Box sx={{ mb: 3 }}>
                {syncMessage.map((message, index) => (
                  <Alert
                    key={index}
                    severity={message.type}
                    sx={{ 
                      mb: 1,
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      ...(whoopDesignActive && {
                        backgroundColor: message.type === 'success' ? 'rgba(22, 236, 6, 0.2)' :
                                 message.type === 'error' ? 'rgba(255, 0, 38, 0.2)' :
                                 message.type === 'warning' ? 'rgba(255, 222, 0, 0.2)' :
                                 'rgba(0, 241, 159, 0.2)', // info and default
                        // Add a border for better contrast in dark mode
                        border: message.type === 'success' ? '1px solid rgba(22, 236, 6, 0.5)' :
                                message.type === 'error' ? '1px solid rgba(255, 0, 38, 0.5)' :
                                message.type === 'warning' ? '1px solid rgba(255, 222, 0, 0.5)' :
                                '1px solid rgba(0, 241, 159, 0.5)', // info and default
                  }),
                  '& .MuiAlert-message': {
                        color: whoopDesignActive ? 'rgba(255, 255, 255, 0.95)' : 
                              (darkMode ? 'rgba(255, 255, 255, 0.9)' : 'inherit')
                  },
                  '& .MuiAlert-icon': {
                        color: whoopDesignActive ? 
                             (message.type === 'success' ? colors.whoopRecoveryHigh :
                              message.type === 'error' ? colors.whoopRecoveryLow :
                              message.type === 'warning' ? colors.whoopRecoveryMedium :
                              colors.whoopTeal) : 'inherit'
                      }
                    }}
                    onClose={() => {
                      const newMessages = [...syncMessage];
                      newMessages.splice(index, 1);
                      setSyncMessage(newMessages);
                    }}
                  >
                    {message.text}
                  </Alert>
                ))}
              </Box>
            ) : null}

            {/* Main content */}
            {hasActiveSources ? (
              <>
                {/* Hero section with welcome and actions */}
                <Box 
                  sx={{ 
                    mb: 4, 
                    p: 3, 
                    borderRadius: '16px',
                    background: darkMode 
                      ? 'linear-gradient(135deg, rgba(44, 62, 80, 0.8) 0%, rgba(52, 152, 219, 0.8) 100%)' 
                      : 'linear-gradient(135deg, rgba(236, 240, 241, 0.8) 0%, rgba(52, 152, 219, 0.2) 100%)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: darkMode ? 'white' : 'inherit' }}>
                      Welcome, {username.charAt(0).toUpperCase() + username.slice(1)}
                    </Typography>
                    
                    <Typography variant="body1" sx={{ mb: 3, opacity: 0.9, maxWidth: '700px', color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                      Your personal biometrics dashboard provides a comprehensive view of your health and fitness data, 
                      allowing you to track trends and gain insights into your well-being.
                    </Typography>
                    
                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => syncData(null, false)}
                        disabled={loading}
                        startIcon={<SyncIcon />}
                        className="sync-button"
                        sx={{ borderRadius: '30px' }}
                      >
                        Sync Latest Data
                      </Button>
                      
                      {devMode && (
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => syncData(null, true)}
                          disabled={loading}
                          startIcon={<RefreshIcon />}
                          className="force-refresh-button"
                          sx={{ borderRadius: '30px' }}
                        >
                          Force Refresh
                        </Button>
                      )}
                      
                      <Button
                        variant="outlined"
                        onClick={() => setDashboardTab(1)}
                        endIcon={<ArrowRightAltIcon />}
                        sx={{ 
                          borderRadius: '30px',
                          borderColor: darkMode ? 'rgba(255,255,255,0.5)' : '#3498DB',
                          color: darkMode ? 'white' : '#3498DB'
                        }}
                      >
                        Manage Sources
                      </Button>
                    </Box>
                  </Box>
                </Box>
                            
                {/* Stats overview cards */}
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: darkMode ? 'white' : 'inherit' }}>
                  Your Health Snapshot
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {/* Heart Rate Card */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      height: '100%', 
                      borderRadius: '12px',
                      transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                      },
                      ...(whoopDesignActive && {
                        background: `linear-gradient(135deg, ${colors.whoopBackground} 0%, ${colors.whoopBackgroundDark} 100%)`
                      })
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography 
                            variant="subtitle1" 
                            color="textSecondary"
                            sx={{ 
                              fontFamily: whoopDesignActive ? 
                                "'Proxima Nova', 'Helvetica Neue', Helvetica, Arial, sans-serif" : 
                                'inherit',
                              color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                            }}
                          >
                            Resting Heart Rate
                          </Typography>
                          <MonitorHeartIcon sx={{ color: whoopDesignActive ? colors.whoopRecoveryBlue : '#E74C3C' }} />
                        </Box>
                        <Typography 
                          variant="h3" 
                          sx={{ 
                            mb: 0, 
                            fontWeight: 700,
                            fontFamily: whoopDesignActive ? 
                              "'DINPro', 'Helvetica Neue', Helvetica, Arial, sans-serif" : 
                              'inherit',
                            color: darkMode ? 'white' : 'inherit'
                          }}
                        >
                          {filteredData.length > 0 ? 
                            (() => {
                              const restingHR = getLatestMetricValue('resting_heart_rate');
                              if (restingHR !== '—') {
                                return Math.round(restingHR);
                              }
                              return '—';
                            })() 
                            : '—'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                          BPM
                        </Typography>
                        {whoopDesignActive && selectedDataSource === 'whoop' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
                              Data by
                            </Typography>
                            <Box 
                              component="img" 
                              src={whoopBlackPuck} 
                              alt="WHOOP" 
                              sx={{ 
                                height: '16px', 
                                width: 'auto',
                                filter: darkMode ? 'invert(1)' : 'none'
                              }} 
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {/* Recovery Score Card */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      height: '100%', 
                      borderRadius: '12px',
                      transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                      },
                      ...(whoopDesignActive && {
                        background: `linear-gradient(135deg, ${colors.whoopBackground} 0%, ${colors.whoopBackgroundDark} 100%)`
                      })
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography 
                            variant="subtitle1" 
                            color="textSecondary"
                            sx={{ 
                              fontFamily: whoopDesignActive ? 
                                "'Proxima Nova', 'Helvetica Neue', Helvetica, Arial, sans-serif" : 
                                'inherit',
                              color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                            }}
                          >
                            Recovery Score
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SpeedIcon sx={{ 
                              color: whoopDesignActive ? (() => {
                                const recoveryScore = getLatestMetricValue('recovery_score');
                                if (recoveryScore !== '—') {
                                  return getWhoopRecoveryColor(Math.round(recoveryScore));
                                }
                                return colors.whoopTeal;
                              })() : '#2ECC71' 
                            }} />
                            {selectedDataSource === 'whoop' && (
                              <Tooltip title="Recovery Score from WHOOP">
                                <Chip 
                                  label="WHOOP" 
                                  size="small"
                                  sx={{ 
                                    ml: 1, 
                                    height: '18px',
                                    fontSize: '10px',
                                    backgroundColor: whoopDesignActive ? colors.whoopTeal : '#33D154',
                                    color: 'black'
                                  }} 
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                        <Typography 
                          variant="h3" 
                          sx={{ 
                            mb: 0, 
                            fontWeight: 700,
                            fontFamily: whoopDesignActive ? 
                              "'DINPro', 'Helvetica Neue', Helvetica, Arial, sans-serif" : 
                              'inherit',
                            color: whoopDesignActive ? (() => {
                              const recoveryScore = getLatestMetricValue('recovery_score');
                              if (recoveryScore !== '—') {
                                return getWhoopRecoveryColor(Math.round(recoveryScore));
                              }
                              return 'inherit';
                            })() : (darkMode ? 'white' : 'inherit')
                          }}
                        >
                          {filteredData.length > 0 ? 
                            (() => {
                              const recoveryScore = getLatestMetricValue('recovery_score');
                              if (recoveryScore !== '—') {
                                return Math.round(recoveryScore);
                              }
                              return '—';
                            })() 
                            : '—'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                          out of 100
                        </Typography>
                        {whoopDesignActive && selectedDataSource === 'whoop' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
                              Data by
                            </Typography>
                            <Box 
                              component="img" 
                              src={whoopBlackPuck} 
                              alt="WHOOP" 
                              sx={{ 
                                height: '16px', 
                                width: 'auto',
                                filter: darkMode ? 'invert(1)' : 'none'
                              }} 
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {/* Sleep Card */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      height: '100%', 
                      borderRadius: '12px',
                      transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                      },
                      ...(whoopDesignActive && {
                        background: `linear-gradient(135deg, ${colors.whoopBackground} 0%, ${colors.whoopBackgroundDark} 100%)`
                      })
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography 
                            variant="subtitle1" 
                            color="textSecondary"
                            sx={{ 
                              fontFamily: whoopDesignActive ? 
                                "'Proxima Nova', 'Helvetica Neue', Helvetica, Arial, sans-serif" : 
                                'inherit',
                              color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                            }}
                          >
                            Sleep Duration
                          </Typography>
                          <NightsStayIcon sx={{ color: whoopDesignActive ? colors.whoopSleep : '#9B59B6' }} />
                        </Box>
                        <Typography 
                          variant="h3" 
                          sx={{ 
                            mb: 0, 
                            fontWeight: 700,
                            fontFamily: whoopDesignActive ? 
                              "'DINPro', 'Helvetica Neue', Helvetica, Arial, sans-serif" : 
                              'inherit',
                            color: darkMode ? 'white' : 'inherit'
                          }}
                        >
                          {filteredData.length > 0 ? 
                            (() => {
                              // Use the getLatestMetricValue function for sleep hours
                              const sleepHours = getLatestMetricValue('sleep_hours');
                              if (sleepHours !== '—') {
                                return Number(sleepHours).toFixed(1);
                              }
                              
                              // Try total_sleep_seconds as backup
                              const totalSleepSecs = getLatestMetricValue('total_sleep_seconds');
                              if (totalSleepSecs !== '—') {
                                return (Number(totalSleepSecs) / 3600).toFixed(1);
                              }
                              
                              return '—';
                            })() 
                            : '—'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                          hours
                        </Typography>
                        {whoopDesignActive && selectedDataSource === 'whoop' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
                              Imported from
                            </Typography>
                            <Box 
                              component="img" 
                              src={whoopBlackPuck} 
                              alt="WHOOP" 
                              sx={{ 
                                height: '16px', 
                                width: 'auto',
                                filter: darkMode ? 'invert(1)' : 'none'
                              }} 
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {/* Activity Card */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      height: '100%', 
                      borderRadius: '12px',
                      transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                      },
                      ...(whoopDesignActive && {
                        background: `linear-gradient(135deg, ${colors.whoopBackground} 0%, ${colors.whoopBackgroundDark} 100%)`
                      })
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="subtitle1" color="textSecondary" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>Daily Steps</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <DirectionsRunIcon sx={{ color: '#3498DB' }} />
                            {selectedDataSource === 'garmin' && (
                              <Tooltip title="Steps from Garmin">
                                <Chip 
                                  label="GARMIN" 
                                  size="small"
                                  sx={{ 
                                    ml: 1, 
                                    height: '18px',
                                    fontSize: '10px',
                                    backgroundColor: '#0066B5',
                                    color: 'white'
                                  }} 
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                        <Typography variant="h3" sx={{ mb: 0, fontWeight: 700, color: darkMode ? 'white' : 'inherit' }}>
                          {filteredData.length > 0 ? 
                            (() => {
                              // Try both steps and total_steps fields
                              const steps = getLatestMetricValue('steps');
                              if (steps !== '—') {
                                return new Intl.NumberFormat().format(steps);
                              }
                              
                              const totalSteps = getLatestMetricValue('total_steps');
                              if (totalSteps !== '—') {
                                return new Intl.NumberFormat().format(totalSteps);
                              }
                              
                              return '—';
                            })() 
                            : '—'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                          steps
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                {/* Data Tabs - keep existing tabValue structure */}
                <Box sx={{ width: '100%', mb: 3 }}>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: darkMode ? 'white' : 'inherit' }}>
                    Detailed Analytics
                  </Typography>
                  
                  {/* Add current source display */}
                  <Box sx={{ mb: 1 }}>
                    <Typography 
                      variant="subtitle1" 
                      color="textSecondary" 
                      sx={{ 
                        color: whoopDesignActive ? 'rgba(255, 255, 255, 0.8)' : (darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)')
                      }}
                    >
                      {selectedDataSource && selectedDataSource !== 'all' 
                        ? `Viewing data from: ${
                            typeof selectedDataSource === 'string'
                              ? selectedDataSource.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                              : String(selectedDataSource)
                          }`
                        : 'Viewing data from all connected sources'}
                    </Typography>
                  </Box>
                  
                  {/* Add source selector dropdown */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 2,
                    flexWrap: 'wrap',
                    gap: 2
                  }}>
                    <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                      <Select
                        value={selectedDataSource || 'all'}
                        onChange={(e) => setSelectedDataSource(e.target.value)}
                        displayEmpty
                        sx={{ 
                          borderRadius: '8px',
                          ...(whoopDesignActive && {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(255, 255, 255, 0.5)'
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(255, 255, 255, 0.7)'
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: colors.whoopTeal
                            },
                            color: 'white'
                          })
                        }}
                      >
                        <MenuItem value="all">All Sources</MenuItem>
                        {activeSources && Array.isArray(activeSources) && activeSources.map((source) => {
                          // Make sure source is a string or get the id if it's an object
                          const sourceStr = typeof source === 'object' ? source.id : String(source || '');
                          
                          // Always show connected sources in the dropdown instead of filtering
                          return (
                            <MenuItem key={sourceStr} value={sourceStr}>
                              {sourceStr.charAt(0).toUpperCase() + sourceStr.slice(1)}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    
                    {loading && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2" color="textSecondary" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>Loading data...</Typography>
                      </Box>
                    )}
                    
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SyncIcon />}
                      onClick={() => syncData(selectedDataSource, false)}
                      disabled={loading}
                      sx={{ borderRadius: '8px' }}
                    >
                      Refresh Data
                    </Button>
                    
                    {devMode && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="secondary"
                        startIcon={<RefreshIcon />}
                        onClick={() => syncData(selectedDataSource, true)}
                        disabled={loading}
                        sx={{ borderRadius: '8px', ml: 1 }}
                      >
                        Force Refresh
                      </Button>
                    )}
                  </Box>
                  
                  <Box sx={{ 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'white',
                    border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)'
                  }}>
                    <Tabs
                      value={tabValue}
                      onChange={handleChangeTab}
                      variant="scrollable"
                      scrollButtons="auto"
                      aria-label="data category tabs"
                      sx={{ 
                        minHeight: '48px',
                        borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <Tab label="Overview" {...a11yProps(0)} />
                      <Tab label="Sleep" {...a11yProps(1)} />
                      <Tab label="Activity" {...a11yProps(2)} />
                      <Tab label="Health Score" {...a11yProps(3)} />
                      <Tab label="Raw Data" {...a11yProps(4)} />
                      <Tab label="Insights" {...a11yProps(5)} />
                    </Tabs>
                    
                    <Box sx={{ p: 3 }}>
                      {/* Overview Tab */}
                      <TabPanel value={tabValue} index={0}>
                        <Grid container spacing={3}>
                          {renderModuleVisualizations(filteredData)}
                        </Grid>
                      </TabPanel>
                      
                      {/* Sleep Tab */}
                      <TabPanel value={tabValue} index={1}>
                        <Grid container spacing={3}>
                          {shouldShowVisualization('whoop', ['sleep_efficiency', 'sleep_consistency', 'sleep_performance']) && (
                            <Grid item xs={12}>
                              <Card sx={{ p: 2, bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                                <Typography variant="h6" gutterBottom sx={{ color: darkMode ? 'white' : 'inherit' }}>Sleep Quality Metrics</Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                  <BarChart data={filteredData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                    <Tooltip formatter={(value) => [`${value}%`, null]} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="sleep_efficiency" name="Sleep Efficiency" fill="#3498DB" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="sleep_consistency" name="Sleep Consistency" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="left" dataKey="sleep_performance" name="Sleep Performance" fill="#8e44ad" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </Card>
                            </Grid>
                          )}
                          
                          <Grid item xs={12} md={6}>
                            <Card sx={{ p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: '12px', height: '100%', bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: darkMode ? 'white' : 'inherit' }}>Sleep Composition</Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <ResponsiveContainer width="100%" height={280}>
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { 
                                          name: 'Deep Sleep', 
                                          value: filteredData.length > 0 ? filteredData[0].deep_sleep || 0 : 0,
                                          fill: '#2c3e50'
                                        },
                                        { 
                                          name: 'Light Sleep', 
                                          value: filteredData.length > 0 ? filteredData[0].light_sleep || 0 : 0,
                                          fill: '#16a085'
                                        },
                                        { 
                                          name: 'REM Sleep', 
                                          value: filteredData.length > 0 ? filteredData[0].rem_sleep || 0 : 0,
                                          fill: '#3498db'
                                        },
                                        { 
                                          name: 'Awake', 
                                          value: filteredData.length > 0 ? filteredData[0].awake_time || 0 : 0,
                                          fill: '#e74c3c'
                                        }
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      outerRadius={100}
                                      innerRadius={60}
                                      fill="#8884d8"
                                      dataKey="value"
                                      nameKey="name"
                                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value.toFixed(1)} hours`, null]} />
                                  </PieChart>
                                </ResponsiveContainer>
                                <Box sx={{ mt: 'auto', textAlign: 'center', pt: 2 }}>
                                  <Typography variant="subtitle2" color="text.secondary" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                                    Most recent sleep composition breakdown
                                  </Typography>
                                </Box>
                              </Box>
                            </Card>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Card sx={{ p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: '12px', height: '100%', bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: darkMode ? 'white' : 'inherit' }}>Sleep Trends</Typography>
                              <ResponsiveContainer width="100%" height={280}>
                                <LineChart
                                  data={filteredData}
                                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" />
                                  <YAxis tickFormatter={(value) => `${value}h`} />
                                  <Tooltip formatter={(value) => [`${value} hours`, null]} />
                                  <Legend />
                                  <Line 
                                    type="monotone" 
                                    dataKey="sleep_hours" 
                                    name="Total Sleep" 
                                    stroke="#8e44ad" 
                                    strokeWidth={2}
                                    dot={{ r: 4 }} 
                                  />
                                  <ReferenceLine y={8} label="Optimal" stroke="#2ecc71" strokeDasharray="3 3" />
                                  <ReferenceLine y={6} label="Minimum" stroke="#e74c3c" strokeDasharray="3 3" />
                                </LineChart>
                              </ResponsiveContainer>
                            </Card>
                          </Grid>
                          
                          <Grid item xs={12}>
                            <Card sx={{ p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: '12px', bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: darkMode ? 'white' : 'inherit' }}>Sleep Duration</Typography>
                              <ResponsiveContainer width="100%" height={350}>
                                <BarChart 
                                  data={filteredData} 
                                  margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                                  barSize={20}
                                  barGap={2}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                  <XAxis 
                                    dataKey="date" 
                                    axisLine={{ stroke: '#e0e0e0' }}
                                    tickLine={false}
                                  />
                                  <YAxis 
                                    yAxisId="left"
                                    tickFormatter={(value) => `${value}h`}
                                    domain={[0, dataMax => Math.ceil(dataMax * 1.1)]}
                                    axisLine={{ stroke: '#e0e0e0' }}
                                    tickLine={false}
                                  />
                                  <Tooltip 
                                    formatter={(value) => [`${value} hours`, null]}
                                    labelFormatter={(label) => `Date: ${label}`}
                                    contentStyle={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                      borderRadius: '8px', 
                                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                      border: 'none',
                                      padding: '10px'
                                    }}
                                  />
                                  <Legend 
                                    verticalAlign="bottom" 
                                    wrapperStyle={{ paddingTop: '15px' }}
                                  />
                                  <Bar yAxisId="left" dataKey="sleep_hours" name="Total Sleep" fill="#8e44ad" radius={[4, 4, 0, 0]} />
                                  <Bar yAxisId="left" dataKey="deep_sleep" name="Deep Sleep" fill="#2c3e50" radius={[4, 4, 0, 0]} />
                                  <Bar yAxisId="left" dataKey="light_sleep" name="Light Sleep" fill="#16a085" radius={[4, 4, 0, 0]} />
                                  <Bar yAxisId="left" dataKey="rem_sleep" name="REM Sleep" fill="#3498db" radius={[4, 4, 0, 0]} />
                                  <Bar yAxisId="left" dataKey="awake_time" name="Awake Time" fill="#e74c3c" radius={[4, 4, 0, 0]} />
                                  {filteredData.some(item => item.inBed_time > 0) && (
                                    <Bar yAxisId="left" dataKey="inBed_time" name="Total In Bed" fill="#34495e" radius={[4, 4, 0, 0]} />
                                  )}
                                </BarChart>
                              </ResponsiveContainer>
                            </Card>
                          </Grid>
                        </Grid>
                      </TabPanel>
                      
                      {/* Activity Tab */}
                      <TabPanel value={tabValue} index={2}>
                        <Grid container spacing={3}>
                          <Grid item xs={12}>
                            <Card sx={{ p: 2, bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                              <Typography variant="h6" gutterBottom sx={{ color: darkMode ? 'white' : 'inherit' }}>Steps & Distance</Typography>
                              <ResponsiveContainer width="100%" height={300}>
                                <ComposedChart data={filteredData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" />
                                  <YAxis yAxisId="left" />
                                  <YAxis yAxisId="right" orientation="right" />
                                  <Tooltip />
                                  <Legend />
                                  <Bar yAxisId="left" dataKey="steps" name="Steps" fill="#3498DB" />
                                  <Line yAxisId="right" type="monotone" dataKey="distance" name="Distance (km)" stroke="#E74C3C" />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </Card>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Card sx={{ p: 2, bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                              <Typography variant="h6" gutterBottom sx={{ color: darkMode ? 'white' : 'inherit' }}>Heart Rate</Typography>
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={filteredData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="resting_heart_rate" name="Resting HR" stroke="#E74C3C" strokeWidth={2} />
                                  <Line type="monotone" dataKey="max_heart_rate" name="Max HR" stroke="#F39C12" strokeWidth={2} />
                                </LineChart>
                              </ResponsiveContainer>
                            </Card>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Card sx={{ p: 2, bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                              <Typography variant="h6" gutterBottom sx={{ color: darkMode ? 'white' : 'inherit' }}>Calories</Typography>
                              <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={filteredData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="date" />
                                  <YAxis yAxisId="left" />
                                  <Tooltip formatter={(value, name) => [
                                    `${Math.round(value)} kcal`, 
                                    name.includes('WHOOP') ? 'WHOOP Calories' : name
                                  ]} />
                                  <Legend />
                                  <Area yAxisId="left" type="monotone" dataKey="total_calories" name="Total Calories" stroke="#27AE60" fill="#27AE60" fillOpacity={0.3} />
                                  <Area yAxisId="left" type="monotone" dataKey="active_calories" name="Active Calories" stroke="#3498DB" fill="#3498DB" fillOpacity={0.3} />
                                  
                                  {/* Only show WHOOP calories if WHOOP is an active source */}
                                  {activeSources && activeSources.some(source => 
                                    source.id === 'whoop' || source === 'whoop'
                                  ) && (
                                    <Area 
                                      yAxisId="left"
                                      type="monotone" 
                                      dataKey="whoop_calories" 
                                      name="WHOOP Calories" 
                                      stroke="#8E44AD" 
                                      fill="#8E44AD" 
                                      fillOpacity={0.3} 
                                    />
                                  )}
                                </AreaChart>
                              </ResponsiveContainer>
                            </Card>
                          </Grid>
                        </Grid>
                      </TabPanel>
                      
                      {/* Health Score Tab */}
                      <TabPanel value={tabValue} index={3}>
                        <Grid container spacing={3}>
                          <Grid item xs={12}>
                            <Card sx={{ p: 2, bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                              <Typography variant="h6" gutterBottom sx={{ color: darkMode ? 'white' : 'inherit' }}>Health Score</Typography>
                              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                                <Box sx={{ flex: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <ResponsiveContainer width="100%" height={300}>
                                    <RadialBarChart 
                                      innerRadius="60%" 
                                      outerRadius="90%" 
                                      data={[{ name: 'Health Score', value: calculateHealthScore(filteredData) }]} 
                                      startAngle={180} 
                                      endAngle={0}
                                    >
                                      <RadialBar
                                        background
                                        dataKey="value"
                                        angleAxisId={0}
                                        fill="#27AE60"
                                      />
                                      <text
                                        x="50%"
                                        y="50%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="progress-label"
                                        fontSize="36"
                                        fontWeight="bold"
                                        fill={darkMode ? 'white' : 'inherit'}
                                      >
                                        {calculateHealthScore(filteredData)}
                                      </text>
                                    </RadialBarChart>
                                  </ResponsiveContainer>
                                </Box>
                                <Box sx={{ flex: 1, p: 2 }}>
                                  <Typography variant="h4" gutterBottom sx={{ color: darkMode ? 'white' : 'inherit' }}>Health Score Analysis</Typography>
                                  <Typography variant="body1" paragraph sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                                    Your health score is calculated based on multiple factors including sleep quality, 
                                    activity levels, heart rate variability, and recovery metrics.
                                  </Typography>
                                  <List>
                                    <ListItem>
                                      <ListItemIcon><FavoriteIcon color="error" /></ListItemIcon>
                                      <ListItemText 
                                        primary="Heart Health" 
                                        secondary="Based on resting heart rate and heart rate variability" 
                                        sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}
                                      />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemIcon><BedtimeIcon color="primary" /></ListItemIcon>
                                      <ListItemText 
                                        primary="Sleep Quality" 
                                        secondary="Based on sleep duration and composition" 
                                        sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}
                                      />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemIcon><DirectionsRunIcon color="success" /></ListItemIcon>
                                      <ListItemText 
                                        primary="Activity Level" 
                                        secondary="Based on step count and activity minutes" 
                                        sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}
                                      />
                                    </ListItem>
                                  </List>
                                </Box>
                              </Box>
                            </Card>
                          </Grid>
                        </Grid>
                      </TabPanel>
                      
                      {/* Raw Data Tab */}
                      <TabPanel value={tabValue} index={4}>
                        <Card sx={{ p: 2, mb: 3, bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: darkMode ? 'white' : 'inherit' }}>Raw Biometric Data</Typography>
                            <FormControlLabel
                              control={<Switch checked={devMode} onChange={(e) => setDevMode(e.target.checked)} />}
                              label="Developer Mode"
                            />
                          </Box>
                          
                          <Box sx={{ overflow: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  {getDataColumns(biometricData, devMode).map(column => (
                                    <th key={column.id} style={thStyle}>{column.label}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {biometricData.map((row, index) => (
                                  <tr key={index}>
                                    {getDataColumns(biometricData, devMode).map(column => (
                                      <td key={column.id} style={tdStyle}>
                                        {formatCellValue(row[column.id], column.id)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </Box>
                          
                          <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => fetchRawData()}
                            sx={{ mt: 2 }}
                            startIcon={<DataArrayIcon />}
                          >
                            Download Raw JSON Data
                          </Button>
                        </Card>
                      </TabPanel>
                      
                      {/* Insights Tab */}
                      <TabPanel value={tabValue} index={5}>
                        <Box sx={{ mb: 3 }}>
                          <Tabs
                            value={insightTabValue}
                            onChange={handleInsightTabChange}
                            variant="fullWidth"
                            aria-label="insight tabs"
                          >
                            <Tab label="Insights" />
                            <Tab label="Recommendations" />
                            <Tab label="Trends" />
                          </Tabs>
                          
                          {/* Insights */}
                          {insightTabValue === 0 && (
                            <Box sx={{ mt: 3 }}>
                              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                                  <Select
                                    value={selectedInsightCategory}
                                    onChange={(e) => setSelectedInsightCategory(e.target.value)}
                                    displayEmpty
                                  >
                                    <MenuItem value="all">All Categories</MenuItem>
                                    {insightCategories.map(category => (
                                      <MenuItem key={category} value={category}>{category}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                
                                <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                                  <Select
                                    value={insightPriorityFilter}
                                    onChange={(e) => setInsightPriorityFilter(e.target.value)}
                                    displayEmpty
                                  >
                                    <MenuItem value="all">All Priorities</MenuItem>
                                    <MenuItem value="high">High Priority</MenuItem>
                                    <MenuItem value="medium">Medium Priority</MenuItem>
                                    <MenuItem value="low">Low Priority</MenuItem>
                                  </Select>
                                </FormControl>
                              </Box>
                              
                              {getFilteredInsights().length > 0 ? (
                                getFilteredInsights().map(insight => (
                                  <Accordion 
                                    key={insight.id}
                                    expanded={expandedInsightId === insight.id}
                                    onChange={handleInsightAccordionChange(insight.id)}
                                    sx={{ mb: 2, bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}
                                  >
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <Box sx={{ mr: 2 }}>
                                          {getIconByName(insight.icon)}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="subtitle1" sx={{ color: darkMode ? 'white' : 'inherit' }}>{insight.title}</Typography>
                                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Chip 
                                              label={insight.category} 
                                              size="small" 
                                              color={
                                                insight.category === 'Sleep' ? 'secondary' :
                                                insight.category === 'Activity' ? 'success' :
                                                insight.category === 'Recovery' ? 'info' :
                                                'default'
                                              }
                                              variant="outlined"
                                            />
                                            <Chip 
                                              label={insight.priority} 
                                              size="small" 
                                              color={
                                                insight.priority === 'high' ? 'error' :
                                                insight.priority === 'medium' ? 'warning' :
                                                'default'
                                              }
                                              variant="outlined"
                                            />
                                          </Box>
                                        </Box>
                                      </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <Typography variant="body1" paragraph sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                                        {insight.description}
                                      </Typography>
                                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                        <Button 
                                          startIcon={<ThumbUpIcon />} 
                                          size="small"
                                          onClick={() => submitInsightFeedback(insight.id, 'like')}
                                        >
                                          Helpful
                                        </Button>
                                        <Button 
                                          startIcon={<ThumbDownIcon />} 
                                          size="small"
                                          onClick={() => submitInsightFeedback(insight.id, 'dislike')}
                                        >
                                          Not Helpful
                                        </Button>
                                      </Box>
                                    </AccordionDetails>
                                  </Accordion>
                                ))
                              ) : (
                                <Alert severity="info" sx={{ bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                                  No insights available for the selected filters. Try a different category or sync more data.
                                </Alert>
                              )}
                            </Box>
                          )}
                          
                          {/* Recommendations */}
                          {insightTabValue === 1 && (
                            <Box sx={{ mt: 3 }}>
                              {recommendations.length > 0 ? (
                                <Grid container spacing={3}>
                                  {recommendations.map((recommendation, index) => (
                                    <Grid item xs={12} md={6} key={index}>
                                      <Card sx={{ 
                                        p: 2,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                                        '&:hover': {
                                          transform: 'translateY(-5px)',
                                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)'
                                        },
                                        bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit'
                                      }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                          <LightbulbIcon sx={{ color: '#F39C12', mr: 1.5 }} />
                                          <Typography variant="h6" sx={{ color: darkMode ? 'white' : 'inherit' }}>{recommendation.title}</Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ mb: 2, flex: 1, color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                                          {recommendation.description}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto' }}>
                                          <Chip 
                                            label={recommendation.category} 
                                            size="small" 
                                            color={
                                              recommendation.category === 'Sleep' ? 'secondary' :
                                              recommendation.category === 'Activity' ? 'success' :
                                              recommendation.category === 'Recovery' ? 'info' :
                                              'default'
                                            }
                                            variant="outlined"
                                            sx={{ mr: 1 }}
                                          />
                                          <Typography variant="caption" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)', ml: 'auto' }}>
                                            Based on your {recommendation.dataPoint} data
                                          </Typography>
                                        </Box>
                                      </Card>
                                    </Grid>
                                  ))}
                                </Grid>
                              ) : (
                                <Alert severity="info" sx={{ bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                                  No recommendations available yet. Sync more data or try again later.
                                </Alert>
                              )}
                            </Box>
                          )}
                          
                          {/* Trends */}
                          {insightTabValue === 2 && (
                            <Box sx={{ mt: 3 }}>
                              {Object.keys(insightTrends).length > 0 ? (
                                <Grid container spacing={3}>
                                  {Object.entries(insightTrends).map(([metric, trend], index) => (
                                    <Grid item xs={12} md={4} key={index}>
                                      <Card sx={{ p: 2, bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                          <Typography variant="h6" sx={{ color: darkMode ? 'white' : 'inherit' }}>
                                            {metric.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                          </Typography>
                                          {getTrendIcon(trend.direction)}
                                        </Box>
                                        <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                                          {trend.description}
                                        </Typography>
                                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                                          <Typography variant="caption" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                                            {trend.percentage}% {trend.direction === 'increasing' ? 'increase' : 
                                                            trend.direction === 'decreasing' ? 'decrease' : 'change'} in the last {trend.period} days
                                          </Typography>
                                        </Box>
                                      </Card>
                                    </Grid>
                                  ))}
                                </Grid>
                              ) : (
                                <Alert severity="info" sx={{ bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit' }}>
                                  No trend data available yet. Continue syncing data to see trends.
                                </Alert>
                              )}
                            </Box>
                          )}
                        </Box>
                      </TabPanel>
                    </Box>
                  </Box>
                </Box>
              </>
            ) : (
              // No active sources view - redesigned
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  my: 6,
                  p: 4,
                  textAlign: 'center',
                  borderRadius: '16px',
                  background: darkMode 
                    ? 'linear-gradient(135deg, rgba(44, 62, 80, 0.8) 0%, rgba(52, 152, 219, 0.4) 100%)' 
                    : 'linear-gradient(135deg, rgba(236, 240, 241, 0.8) 0%, rgba(52, 152, 219, 0.1) 100%)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                }}
              >
                <DevicesOutlinedIcon sx={{ fontSize: '80px', color: darkMode ? 'white' : '#3498DB', opacity: 0.8 }} />
                
                <Typography variant="h4" component="h2" sx={{ fontWeight: 600, color: darkMode ? 'white' : 'inherit' }} gutterBottom>
                  No Active Data Sources
                </Typography>
                
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: '600px', color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                  To begin tracking your health and fitness metrics, connect at least one data source.
                  This will allow you to visualize trends, receive personalized insights, and monitor your progress.
                </Typography>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setDashboardTab(1)}
                  startIcon={<AddIcon />}
                  size="large"
                  sx={{ 
                    borderRadius: '30px',
                    px: 4,
                    py: 1.5
                  }}
                >
                  Connect a Data Source
                </Button>
                
                <Typography variant="caption" sx={{ mt: 3, opacity: 0.7, color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                  Supported integrations include Garmin, WHOOP, Fitbit, and more.
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* Active Integrations View */}
        {dashboardTab === 1 && (
          <>
            {/* Hero section */}
            <Box 
              sx={{ 
                mb: 4, 
                p: 3, 
                borderRadius: '16px',
                background: darkMode 
                  ? 'linear-gradient(135deg, rgba(44, 62, 80, 0.8) 0%, rgba(52, 152, 219, 0.8) 100%)' 
                  : 'linear-gradient(135deg, rgba(236, 240, 241, 0.8) 0%, rgba(52, 152, 219, 0.2) 100%)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: darkMode ? 'white' : 'inherit' }}>
                  Hardware Integrations
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 3, opacity: 0.9, maxWidth: '700px', color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                  Connect your wearables and fitness trackers to sync biometric data. 
                  Your data is securely stored and only accessible to you.
                </Typography>
                
                {/* Action buttons */}
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setShowSourceMenu(true)}
                  startIcon={<AddIcon />}
                  sx={{ borderRadius: '30px' }}
                >
                  Connect New Device
                </Button>
              </Box>
            </Box>
            
            {/* Active Integrations Section */}
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: darkMode ? 'white' : 'inherit' }}>
              Your Connected Devices
            </Typography>
            
            {activeSources && activeSources.length > 0 ? (
              <>
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3, 
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
                    '& .MuiAlert-message': {
                      color: darkMode ? 'rgba(0, 0, 0, 0.9)' : 'inherit'
                    }
                  }}
                >
                  Note: Newly connected data sources may take up to a minute to fully register and display data. If your data doesn't appear immediately, please be patient or try syncing manually.
                </Alert>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {activeSources.map((source) => {
                    // Skip rendering if source is invalid
                    if (!source) return null;
                    
                    // Safely get the source ID or use the source itself if it's a string
                    const sourceId = typeof source === 'object' ? source.id : source;
                    
                    // Skip rendering if we can't determine a valid key
                    if (!sourceId) return null;
                    
                    // Safely determine the display name
                    let displayName;
                    if (typeof source === 'object' && source.name) {
                      displayName = source.name;
                    } else if (typeof source === 'string') {
                      displayName = source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    } else if (typeof sourceId === 'string') {
                      displayName = sourceId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    } else {
                      displayName = 'Unknown Source';
                    }
                    
                    return (
                      <Grid item xs={12} sm={6} md={4} key={sourceId}>
                        <Card sx={{ 
                          borderRadius: '12px',
                          transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                          },
                          bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit',
                          // Ensure text is visible in both modes
                          '& .MuiTypography-root': {
                            color: darkMode ? 'white' : 'inherit'
                          },
                          // Fix secondary text color
                          '& .MuiTypography-colorTextSecondary': {
                            color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'
                          }
                        }}>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DevicesOutlinedIcon sx={{ color: '#3498DB' }} />
                                <Typography variant="h6">
                                  {displayName}
                                </Typography>
                              </Box>
                              <Chip 
                                label="Active" 
                                color="success" 
                                size="small" 
                                sx={{ 
                                  height: '24px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold'
                                }} 
                              />
                            </Box>
                            
                            {source.profile_type && (
                              <Typography variant="body2" color="textSecondary" sx={{ mb: 2, color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                                Profile: {source.profile_type}
                              </Typography>
                            )}
                            
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  startIcon={<SyncIcon />}
                                  variant="outlined"
                                  size="small"
                                  onClick={() => syncData(source.id || source, false)}
                                  sx={{ 
                                    borderRadius: '20px',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  Sync
                                </Button>
                                
                                {devMode && (
                                  <Button
                                    startIcon={<RefreshIcon />}
                                    variant="outlined"
                                    size="small"
                                    color="secondary"
                                    onClick={() => syncData(source.id || source, true)}
                                    sx={{ 
                                      borderRadius: '20px',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    Force
                                  </Button>
                                )}
                              </Box>
                              
                              <Button
                                startIcon={<DeleteOutlineIcon />}
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => removeDataSource(source.id || source)}
                                sx={{ 
                                  borderRadius: '20px',
                                  fontSize: '0.75rem'
                                }}
                              >
                                Disconnect
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </>
            ) : (
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 4, 
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  ...(whoopDesignActive && {
                    backgroundColor: 'rgba(0, 241, 159, 0.1)',
                    border: '1px solid rgba(0, 241, 159, 0.3)',
                  }),
                  '& .MuiAlert-message': {
                    color: whoopDesignActive ? 'rgba(255, 255, 255, 0.95)' : (darkMode ? 'rgba(255, 255, 255, 0.9)' : 'inherit')
                  },
                  '& .MuiAlert-icon': {
                    color: whoopDesignActive ? colors.whoopTeal : 'inherit'
                  }
                }}
              >
                No active data sources yet. Click "Connect New Device" to get started. Please note that after connecting a source, it may take up to a minute for it to register in the system.
              </Alert>
            )}
            
            {/* Available Integrations Section */}
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: darkMode ? 'white' : 'inherit' }}>
              Available Integrations
            </Typography>
            
            <Grid container spacing={3}>
              {['garmin', 'whoop', 'fitbit', 'oura', 'apple_health'].map((source) => {
                const isActive = activeSources && Array.isArray(activeSources) && 
                  (activeSources.some(s => (s.id === source || s === source)));
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={source}>
                    <Card sx={{ 
                      borderRadius: '12px',
                      background: isActive ? (darkMode ? 'rgba(46, 204, 113, 0.1)' : 'rgba(46, 204, 113, 0.05)') : 'inherit',
                      border: isActive ? `1px solid ${darkMode ? 'rgba(46, 204, 113, 0.3)' : 'rgba(46, 204, 113, 0.2)'}` : 'inherit',
                      opacity: isActive ? 0.8 : 1,
                      transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                      },
                      bgcolor: darkMode ? 'rgba(44, 62, 80, 0.4)' : 'inherit',
                      // Fix text colors when WHOOP design is active
                      ...(whoopDesignActive && {
                        '& .MuiTypography-root': {
                          color: 'white !important'
                        },
                        '& .MuiTypography-body2': {
                          color: 'rgba(255, 255, 255, 0.7) !important'
                        },
                        '& .MuiChip-label': {
                          color: isActive ? 'rgba(46, 204, 113, 0.9) !important' : 'rgba(255, 255, 255, 0.9) !important'
                        }
                      })
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" sx={{ 
                            color: whoopDesignActive ? 'white !important' : (darkMode ? 'white' : 'inherit')
                          }}>
                            {source.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </Typography>
                          {isActive ? (
                            <Chip 
                              label="Connected" 
                              color="success" 
                              variant="outlined" 
                              size="small" 
                              sx={{ 
                                height: '24px',
                                ...(whoopDesignActive && {
                                  borderColor: colors.whoopRecoveryHigh,
                                  color: colors.whoopRecoveryHigh,
                                  '& .MuiChip-label': {
                                    color: colors.whoopRecoveryHigh
                                  }
                                })
                              }} 
                            />
                          ) : (
                            <Chip 
                              label="Available" 
                              variant="outlined" 
                              size="small" 
                              sx={{ 
                                height: '24px',
                                ...(whoopDesignActive && {
                                  borderColor: colors.whoopTeal,
                                  color: 'white',
                                  '& .MuiChip-label': {
                                    color: 'white'
                                  }
                                })
                              }} 
                            />
                          )}
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" sx={{ 
                          mb: 2,
                          color: whoopDesignActive ? 'rgba(255, 255, 255, 0.7) !important' : (darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)')
                        }}>
                          {getSourceDescription(source)}
                        </Typography>
                        
                        {isActive ? (
                          <Button
                            variant="outlined"
                            color="error"
                            fullWidth
                            size="small"
                            startIcon={<DeleteOutlineIcon />}
                            onClick={() => removeDataSource(source)}
                            sx={{ borderRadius: '20px', mt: 1 }}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            startIcon={<AddIcon />}
                            onClick={() => {
                              console.log(`Connect button clicked for ${source}`);
                              if (source === 'whoop') {
                                console.log('Opening WHOOP connect dialog');
                                setShowWhoopConnect(true);
                              } else if (source === 'garmin') {
                                console.log('Opening Garmin credentials menu');
                                setSelectedSource(source);
                                setShowCredentialsMenu(true);
                              } else {
                                // For other sources, direct activate
                                handleSourceActivation(source);
                              }
                            }}
                            sx={{ borderRadius: '20px', mt: 1 }}
                          >
                            Connect
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}

        {/* Render the footer using the function */}
        {renderFooter()}
      </Box>

      {/* Main Menu */}
      <StyledMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
      >
        <StyledMenuItem onClick={() => { 
          setDashboardTab(1); 
          closeMenu(); 
        }}>
          <ListItemIcon>
            <DevicesOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Manage Integrations" />
        </StyledMenuItem>

        <StyledMenuItem onClick={() => { 
          setDarkMode(!darkMode); 
          closeMenu(); 
        }}>
          <ListItemIcon>
            {darkMode ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </ListItemIcon>
          <ListItemText primary={darkMode ? "Light Mode" : "Dark Mode"} />
        </StyledMenuItem>

        <StyledMenuItem onClick={() => { 
          setDevMode(!devMode); 
          closeMenu(); 
        }}>
          <ListItemIcon>
            <DeveloperModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={devMode ? "Disable Dev Mode" : "Enable Dev Mode"} />
        </StyledMenuItem>

        <Divider sx={{ my: 1 }} />
        
        <StyledMenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </StyledMenuItem>
      </StyledMenu>

      {/* Source Selection Dialog */}
      <Dialog
        open={showSourceMenu}
        onClose={() => setShowSourceMenu(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Connect a Data Source
          <IconButton 
            onClick={() => setShowSourceMenu(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph>
            Select a data source to connect:
          </Typography>
          <List>
            {sources.map((source) => (
              <ListItem 
                key={source.id} 
                button 
                onClick={() => {
                  console.log(`Selected source: ${source.id}`);
                  
                  if (source.id === 'whoop') {
                    console.log('Opening WHOOP connect dialog');
                    setShowWhoopConnect(true);
                    setShowSourceMenu(false);
                  } else if (source.id === 'garmin') {
                    console.log('Opening Garmin credentials menu');
                    
                    // In development mode, directly activate with default profile
                    if (DEV_MODE) {
                      console.log('Dev mode: directly activating Garmin with default profile');
                      handleSourceActivation('garmin', 'default');
                      setShowSourceMenu(false);
                    } else {
                      setSelectedSource(source.id);
                      setShowCredentialsMenu(true);
                      setShowSourceMenu(false);
                    }
                  } else {
                    // For other sources
                    handleSourceActivation(source.id);
                    setShowSourceMenu(false);
                  }
                }}
              >
                <ListItemText 
                  primary={source.name}
                  secondary={source.description} 
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end">
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Garmin Credentials Dialog */}
      <Dialog
        open={showCredentialsMenu && selectedSource === 'garmin'}
        onClose={() => setShowCredentialsMenu(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Connect Garmin
          <IconButton 
            onClick={() => setShowCredentialsMenu(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" paragraph>
            Select a Garmin profile to connect:
          </Typography>
          <List>
            {garminProfiles && garminProfiles.length > 0 ? (
              garminProfiles.map((profile) => (
                <ListItem 
                  key={profile.id || profile.type || 'default'} 
                  button 
                  onClick={() => {
                    console.log(`Selected Garmin profile: ${JSON.stringify(profile)}`);
                    handleSourceActivation('garmin', profile.id || profile.type || 'default');
                  }}
                >
                  <ListItemText 
                    primary={profile.name} 
                    secondary={profile.description} 
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end">
                      <ArrowForwardIosIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText 
                  primary="No profiles available" 
                  secondary="Please try again later or contact support." 
                />
              </ListItem>
            )}
          </List>
        </DialogContent>
      </Dialog>

      {/* WHOOP Connect Dialog */}
      <Dialog
        open={showWhoopConnect}
        onClose={() => setShowWhoopConnect(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Connect WHOOP
          <IconButton 
            onClick={() => setShowWhoopConnect(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body1" paragraph>
              You'll be redirected to WHOOP to authorize access to your data.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={async () => {
                try {
                  // Ensure we have a CSRF token first
                  await ensureCSRFToken();
                  
                  // Generate a random state parameter and store it in localStorage
                  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                  localStorage.setItem('whoopOAuthState', state);
                  
                  // Log the redirect
                  console.log("Initiating WHOOP OAuth flow");
                  
                  // Close the dialog before redirecting
                  setShowWhoopConnect(false);
                  
                  // Redirect to OAuth endpoint with the state parameter
                  window.location.href = `/api/oauth/whoop/authorize?clientState=${state}`;
                } catch (error) {
                  console.error("Error connecting to WHOOP:", error);
                  addSyncMessage("Error connecting to WHOOP. Please try again.", "error");
                }
              }}
              sx={{ mt: 2 }}
            >
              Connect WHOOP Account
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default BiometricsDashboard; 