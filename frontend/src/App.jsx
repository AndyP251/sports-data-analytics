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

        {/* Login route - always available but conditionally redirects */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : 
            !hasDevAccess ? <Navigate to="/athlete-portal" /> :
            <Login setIsAuthenticated={setIsAuthenticated} />
          } 
        />
        
        {/* Dashboard route - always available but conditionally redirects */}
        <Route 
          path="/dashboard" 
          element={
            !isAuthenticated ? <Navigate to="/login" /> :
            !hasDevAccess ? <Navigate to="/athlete-portal" /> :
            <Dashboard />
          } 
        />
        
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Routes>
    </Router>
  )
}

export default App
