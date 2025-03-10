import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import DevelopmentGate from './components/DevelopmentGate'
import Login from './components/Login'
import CoachLogin from './components/CoachLogin'
import Dashboard from './components/Dashboard/Dashboard'
import CoachDashboard from './components/Dashboard/CoachDashboard'
import RobotsText from './components/RobotsText'
import PrivacyPolicy from './components/PrivacyPolicy'
import HomePage from './components/HomePage'
import PricingPage from './components/PricingPage'
import MeetTheTeam from './components/MeetTheTeam'
import ContactPage from './components/ContactPage'
import './styles/Auth.css'
import './styles/Dashboard.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCoachAuthenticated, setIsCoachAuthenticated] = useState(false)
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

        {/* Meet the Team page */}
        <Route path="/team" element={<MeetTheTeam />} />
        
        {/* Contact page */}
        <Route path="/contact" element={<ContactPage />} />
        
        {/* Athlete Portal path */}
        <Route path="/athlete-portal" element={
          !hasDevAccess ? <DevelopmentGate /> : <Navigate to="/login" />
        } />
        
        {/* Coach Portal path */}
        <Route path="/coach-portal" element={
          !hasDevAccess ? <DevelopmentGate /> : <Navigate to="/coach-login" />
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
        
        {/* Coach Login route */}
        <Route 
          path="/coach-login" 
          element={
            isCoachAuthenticated ? <Navigate to="/coach-dashboard" /> : 
            !hasDevAccess ? <Navigate to="/coach-portal" /> :
            <CoachLogin setIsAuthenticated={setIsCoachAuthenticated} />
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
        
        {/* Coach Dashboard route */}
        <Route 
          path="/coach-dashboard" 
          element={
            !isCoachAuthenticated ? <Navigate to="/coach-login" /> :
            !hasDevAccess ? <Navigate to="/coach-portal" /> :
            <CoachDashboard />
          } 
        />
        
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Routes>
    </Router>
  )
}

export default App
