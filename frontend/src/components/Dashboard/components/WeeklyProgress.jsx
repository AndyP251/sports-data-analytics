import React from 'react';
import { Line } from 'react-chartjs-2';

const WeeklyProgress = ({ data }) => {
    const chartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Heart Rate',
                data: data?.heart_rate || Array(7).fill(0),
                borderColor: '#FF6384',
                tension: 0.4,
            },
            {
                label: 'Sleep Hours',
                data: data?.sleep || Array(7).fill(0),
                borderColor: '#36A2EB',
                tension: 0.4,
            },
            {
                label: 'Steps (thousands)',
                data: data?.steps?.map(steps => steps / 1000) || Array(7).fill(0),
                borderColor: '#4BC0C0',
                tension: 0.4,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Weekly Progress',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div className="weekly-progress">
            <Line data={chartData} options={options} />
        </div>
    );
};

export default WeeklyProgress; 