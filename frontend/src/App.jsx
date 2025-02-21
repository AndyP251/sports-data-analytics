import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import DevelopmentGate from './components/DevelopmentGate'
import Login from './components/Login'
import Dashboard from './components/Dashboard/Dashboard'
import RobotsText from './components/RobotsText'
import PrivacyPolicy from './components/PrivacyPolicy'
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
      {!hasDevAccess ? (
        <Routes>
          <Route path="*" element={<DevelopmentGate />} />
        </Routes>
      ) : (
        <Routes>
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
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
          />
        </Routes>
      )}
    </Router>
  )
}

export default App
