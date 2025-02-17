import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard/Dashboard'
import './styles/Auth.css'
import './styles/Dashboard.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  return (
    <Router>
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
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
        />
      </Routes>
    </Router>
  )
}

export default App
