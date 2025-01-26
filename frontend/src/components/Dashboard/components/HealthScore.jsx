import React from 'react';
import { motion } from 'framer-motion';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const HealthScore = ({ score }) => {
    return (
        <motion.div 
            className="health-score"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
            <div className="score-container">
                <CircularProgressbar
                    value={score}
                    text={`${score}%`}
                    styles={buildStyles({
                        pathColor: `rgba(62, 152, 199, ${score / 100})`,
                        textColor: '#3e98c7',
                        trailColor: '#d6d6d6',
                    })}
                />
            </div>
            <h3>Health Score</h3>
            <p>Based on your recent activity</p>
        </motion.div>
    );
};

export default HealthScore; 