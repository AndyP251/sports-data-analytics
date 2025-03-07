import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import DevelopmentGate from './components/DevelopmentGate'
import Login from './components/Login'
import Dashboard from './components/Dashboard/Dashboard'
import RobotsText from './components/RobotsText'
import PrivacyPolicy from './components/PrivacyPolicy'
import HomePage from './components/HomePage'
import PricingPage from './components/PricingPage'
import './styles/Auth.css'
import './styles/Dashboard.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const hasDevAccess = localStorage.getItem('devAccess') === 'granted'

  // Handle robots.txt request
  if (window.location.pathname === '/robots.txt') {
    return <RobotsText />;
  }

  return (
    <Router>
      <Routes>
        {/* Public route for homepage */}
        <Route path="/" element={<HomePage />} />

        {/* Athlete Portal path */}
        <Route path="/athlete-portal" element={
          !hasDevAccess ? <DevelopmentGate /> : <Navigate to="/login" />
        } />

        {/* Protected routes that require dev access */}
        {hasDevAccess && (
          <>
            <Route 
              path="/login" 
              element={
                isAuthenticated ? 
                  <Navigate to="/dashboard" /> : 
                  <Login setIsAuthenticated={setIsAuthenticated} />
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                isAuthenticated ? 
                  <Dashboard /> : 
                  <Navigate to="/login" />
              } 
            />
          </>
        )}
        
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Routes>
    </Router>
  )
}

export default App
