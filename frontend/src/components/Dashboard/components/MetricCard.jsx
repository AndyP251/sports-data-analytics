import React from 'react';
import { motion } from 'framer-motion';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const MetricCard = ({ icon, title, mainValue, unit, subValue, trend }) => {
    const trendColor = trend > 0 ? 'var(--trend-up)' : 'var(--trend-down)';
    
    return (
        <motion.div 
            className="metric-card"
            whileHover={{ y: -5, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
        >
            <div className="metric-header">
                <div className="icon">{icon}</div>
                <h3>{title}</h3>
            </div>
            <div className="metric-value">
                <span className="main-value">{mainValue}</span>
                <span className="unit">{unit}</span>
            </div>
            <div className="metric-footer">
                <span className="sub-value">{subValue}</span>
                {trend && (
                    <span className="trend" style={{ color: trendColor }}>
                        {trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
        </motion.div>
    );
};

export default MetricCard; 