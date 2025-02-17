import axios from 'axios';

const BASE_URL = '/api';

export const fetchBiometricData = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/dashboard/data/`);
        if (response.data.success) {
            return response.data.data;
        }
        throw new Error('Failed to fetch biometric data');
    } catch (error) {
        console.error('Error fetching biometric data:', error);
        throw error;
    }
};

export const syncBiometricData = async () => {
    try {
        const response = await axios.post(`${BASE_URL}/biometrics/sync/`);
        return response.data;
    } catch (error) {
        console.error('Error syncing biometric data:', error);
        throw error;
    }
}; 