import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

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

    useEffect(() => {
        fetchDashboardData();
    }, []);

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Athlete Dashboard</h1>
                <button 
                    className="update-button"
                    onClick={handleUpdateData}
                    disabled={isLoading}
                >
                    {isLoading ? 'Updating...' : 'Update Garmin Data'}
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {biometricData ? (
                <div className="dashboard-grid">
                    <div className="data-card">
                        <h3>Heart Rate</h3>
                        <p>Latest: {biometricData.heart_rate?.latest || 'N/A'} bpm</p>
                        <p>Average: {biometricData.heart_rate?.average || 'N/A'} bpm</p>
                    </div>
                    
                    <div className="data-card">
                        <h3>Sleep</h3>
                        <p>Duration: {biometricData.sleep?.duration || 'N/A'} hours</p>
                        <p>Quality: {biometricData.sleep?.quality || 'N/A'}</p>
                    </div>

                    <div className="data-card">
                        <h3>Activity</h3>
                        <p>Steps: {biometricData.activity?.steps || 'N/A'}</p>
                        <p>Distance: {biometricData.activity?.distance || 'N/A'} km</p>
                    </div>

                    {/* Add more data cards as needed */}
                </div>
            ) : !error && (
                <div className="loading">
                    Loading dashboard data...
                </div>
            )}
        </div>
    );
};

export default Dashboard; 