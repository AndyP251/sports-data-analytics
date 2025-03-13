import React from 'react';
import styled from 'styled-components';
import { FaHeartbeat, FaRunning, FaBolt, FaChartLine, FaShieldAlt } from 'react-icons/fa';

const MetricsContainer = styled.div`
  display: flex;
  gap: 20px;
  padding: 20px 0;
  justify-content: center;
  width: 100%;
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }
`;

const MetricBlock = styled.div`
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 28px;
  min-width: 180px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100%;
    background: ${props => props.color};
  }
  
  @media (max-width: 768px) {
    min-width: 80%;
    padding: 20px;
  }
`;

const IconWrapper = styled.div`
  font-size: 28px;
  color: ${props => props.color};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    filter: drop-shadow(0 0 12px ${props => props.color + '60'});
    transition: transform 0.3s ease;
  }
  
  ${MetricBlock}:hover & svg {
    transform: scale(1.15);
  }
`;

const Value = styled.div`
  font-size: 42px;
  font-weight: bold;
  margin: 12px 0;
  font-family: 'Inter', sans-serif;
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: all 0.3s ease;
  
  ${MetricBlock}:hover & {
    filter: brightness(1.1);
  }
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const Label = styled.div`
  font-size: 14px;
  color: #a0a8b8;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-top: 12px;
  font-weight: 500;
  transition: color 0.3s ease;
  
  ${MetricBlock}:hover & {
    color: #ffffff;
  }
`;

const Unit = styled.span`
  font-size: 18px;
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