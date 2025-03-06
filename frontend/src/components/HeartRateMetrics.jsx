import React from 'react';
import styled from 'styled-components';
import { FaHeartbeat, FaRunning, FaBolt, FaChartLine, FaShieldAlt } from 'react-icons/fa';

const MetricsContainer = styled.div`
  display: flex;
  gap: 20px;
  padding: 20px 0;
  justify-content: center;
  width: 100%;
`;

const MetricBlock = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 24px;
  min-width: 160px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.color};
  }
`;

const IconWrapper = styled.div`
  font-size: 24px;
  color: ${props => props.color};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    filter: drop-shadow(0 0 8px ${props => props.color + '40'});
  }
`;

const Value = styled.div`
  font-size: 36px;
  font-weight: bold;
  margin: 10px 0;
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #6b8afd, #ff7eb3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Label = styled.div`
  font-size: 14px;
  color: #8a8f98;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 8px;
`;

const Unit = styled.span`
  font-size: 16px;
  opacity: 0.7;
  margin-left: 4px;
`;

const HeartRateMetrics = ({ resting, average, max, isWhoop = false }) => {
  const metrics = isWhoop ? [
    {
      label: 'Resting HR',
      value: resting,
      icon: <FaHeartbeat />,
      color: '#4CAF50',  // Green for resting
      unit: 'bpm'
    },
    {
      label: 'Recovery Score',
      value: average,
      icon: <FaShieldAlt />,
      color: '#2196F3',  // Blue for recovery
      unit: ''
    },
    {
      label: 'Strain',
      value: max,
      icon: <FaChartLine />,
      color: '#FF5722',  // Orange for strain
      unit: ''
    }
  ] : [
    {
      label: 'Resting HR',
      value: resting,
      icon: <FaHeartbeat />,
      color: '#4CAF50',  // Green for resting
      unit: 'bpm'
    },
    {
      label: 'Last 7 Days Average HR',
      value: average,
      icon: <FaRunning />,
      color: '#2196F3',  // Blue for average
      unit: 'bpm'
    },
    {
      label: 'Peak HR',
      value: max,
      icon: <FaBolt />,
      color: '#FF5722',  // Orange for peak
      unit: 'bpm'
    }
  ];

  return (
    <MetricsContainer>
      {metrics.map((metric, index) => (
        <MetricBlock key={index} color={metric.color}>
          <IconWrapper color={metric.color}>
            {metric.icon}
          </IconWrapper>
          <Value>
            {metric.value}
            {metric.unit && <Unit>{metric.unit}</Unit>}
          </Value>
          <Label>{metric.label}</Label>
        </MetricBlock>
      ))}
    </MetricsContainer>
  );
};

export default HeartRateMetrics; 