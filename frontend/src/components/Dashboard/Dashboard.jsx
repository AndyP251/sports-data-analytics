import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement,
    Title,
    Tooltip,
    Legend 
} from 'chart.js';
import { FaHeartbeat, FaBed, FaRunning, FaWeight, FaChartLine } from 'react-icons/fa';
import { BiRefresh } from 'react-icons/bi';
import LoadingSpinner from '../common/LoadingSpinner';
import MetricCard from './components/MetricCard';
import HealthScore from './components/HealthScore';
import WeeklyProgress from './components/WeeklyProgress';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// Add this function to get CSRF token from cookie
function getCookie(name) {
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
}

// Configure axios defaults
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;

const Dashboard = () => {
    const [biometricData, setBiometricData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [showUpdateAnimation, setShowUpdateAnimation] = useState(false);

    const fetchDashboardData = async () => {
        console.log('Fetching dashboard data...');
        try {
            const response = await axios.get('/api/dashboard/');
            console.log('Dashboard response:', response.data);
            if (response.data.success) {
                setBiometricData(response.data.data);
            } else {
                setError(response.data.error || 'Failed to fetch data');
                console.error('Dashboard fetch error:', response.data.error);
            }
        } catch (err) {
            console.error('Dashboard fetch error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError(`Failed to fetch dashboard data: ${err.response?.data?.error || err.message}`);
        }
    };

    const handleUpdateData = async () => {
        setIsLoading(true);
        setError(null);
        console.log('Starting Garmin data update...');
        
        try {
            const csrfToken = getCookie('csrftoken');
            const response = await axios.post('/api/update-garmin-data/', {}, {
                headers: {
                    'X-CSRFToken': csrfToken,
                }
            });
            
            console.log('Update response:', response.data);
            
            if (response.data.success) {
                console.log('Update successful, refreshing dashboard...');
                await fetchDashboardData();
            } else {
                const errorMsg = response.data.message || response.data.error || 'Failed to update data';
                console.error('Update failed:', errorMsg);
                setError(errorMsg);
            }
        } catch (err) {
            console.error('Update error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError(`Failed to update Garmin data: ${err.response?.data?.error || err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateHealthScore = (data) => {
        if (!data) return 0;
        // Calculate a health score based on various metrics
        let score = 0;
        if (data.heart_rate?.latest) score += 25;
        if (data.sleep?.duration >= 7) score += 25;
        if (data.activity?.steps > 8000) score += 25;
        if (data.heart_rate?.average) score += 25;
        return score;
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="dashboard-container"
        >
            {/* Header Section */}
            <div className="dashboard-header">
                <div className="header-left">
                    <h1>Athlete Dashboard</h1>
                    <p className="subtitle">Welcome back, {biometricData?.athlete_name}</p>
                </div>
                <motion.button 
                    className="update-button"
                    onClick={handleUpdateData}
                    disabled={isLoading}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <BiRefresh className={`refresh-icon ${isLoading ? 'spinning' : ''}`} />
                    {isLoading ? 'Updating...' : 'Update Data'}
                </motion.button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        className="error-message"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            {biometricData ? (
                <div className="dashboard-content">
                    {/* Health Score Section */}
                    <div className="health-score-section">
                        <HealthScore 
                            score={calculateHealthScore(biometricData)}
                            className="health-score-widget"
                        />
                    </div>

                    {/* Metrics Grid */}
                    <div className="metrics-grid">
                        <MetricCard
                            icon={<FaHeartbeat />}
                            title="Heart Rate"
                            mainValue={`${biometricData.heart_rate?.latest || 'N/A'}`}
                            unit="bpm"
                            subValue={`Avg: ${biometricData.heart_rate?.average || 'N/A'} bpm`}
                            trend={+5}
                        />
                        <MetricCard
                            icon={<FaBed />}
                            title="Sleep"
                            mainValue={`${biometricData.sleep?.duration || 'N/A'}`}
                            unit="hours"
                            subValue={`Quality: ${biometricData.sleep?.quality || 'N/A'}`}
                            trend={-2}
                        />
                        <MetricCard
                            icon={<FaRunning />}
                            title="Activity"
                            mainValue={`${biometricData.activity?.steps || 'N/A'}`}
                            unit="steps"
                            subValue={`${biometricData.activity?.distance || 'N/A'} km`}
                            trend={+12}
                        />
                    </div>

                    {/* Weekly Progress Chart */}
                    <WeeklyProgress data={biometricData.weekly_data} />

                    {/* Detailed Stats Tabs */}
                    <div className="detailed-stats">
                        <div className="tabs">
                            {['overview', 'performance', 'recovery', 'nutrition'].map(tab => (
                                <button
                                    key={tab}
                                    className={`tab ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="tab-content">
                            {/* Tab content will be rendered based on activeTab */}
                        </div>
                    </div>
                </div>
            ) : !error && (
                <div className="loading-container">
                    <LoadingSpinner />
                    <p>Loading your dashboard...</p>
                </div>
            )}
        </motion.div>
    );
};

export default Dashboard; 