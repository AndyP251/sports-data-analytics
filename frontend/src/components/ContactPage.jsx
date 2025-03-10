import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ContactPage.css';

function ContactPage() {
  const navigate = useNavigate();
  
  // Fix for scrolling issue - use a more robust approach
  useEffect(() => {
    // Adding a timeout seems to help with race conditions in some browsers
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0; // For Safari
      document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);
  
  const navigateToHome = () => {
    navigate('/');
  };

  const navigateToPricing = () => {
    navigate('/pricing');
  };
  
  const navigateToTeam = () => {
    navigate('/team');
  };

  const navigateToCoachPortal = () => {
    navigate('/coach-portal');
  };

  const navigateToAthletePortal = () => {
    navigate('/athlete-portal');
  };
  
  return (
    <div className="contact-page">
      <div className="header">
        <div className="logo" onClick={navigateToHome}>Pulse Project</div>
        <div className="nav-buttons">
          <button 
            className="back-button" 
            onClick={navigateToHome}
          >
            ← Back to Home
          </button>
          <button 
            className="pricing-button" 
            onClick={navigateToPricing}
          >
            Pricing
            <span className="button-arrow-hidden"></span>
          </button>
          <button 
            className="team-button" 
            onClick={navigateToTeam}
          >
            Our Team
            <span className="button-arrow-hidden"></span>
          </button>
          <button 
            className="coach-portal-button" 
            onClick={navigateToCoachPortal}
          >
            Coach Portal
            <span className="button-arrow">→</span>
          </button>
          <button 
            className="athlete-portal-button" 
            onClick={navigateToAthletePortal}
          >
            Athlete Portal
            <span className="button-arrow">→</span>
          </button>
        </div>
      </div>
      
      <div className="content">
        <div className="contact-hero-section">
          <h1>Contact Us</h1>
          <p>
            We'd love to hear from you! Have questions about Pulse Project or want to explore partnership opportunities?
          </p>
        </div>

        <div className="contact-container">
          <div className="contact-card">
            <div className="contact-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <h2>Email Us</h2>
            <p>For inquiries, partnership opportunities, or any questions:</p>
            <a href="mailto:pulseproject@proton.me" className="contact-email">pulseproject@proton.me</a>
          </div>
        </div>
      </div>
      
      <footer>
        <div className="footer-content">
          <div className="footer-logo">Pulse Project</div>
          <div className="footer-links">
            <a onClick={navigateToHome}>Home</a>
            <a onClick={navigateToTeam}>Our Team</a>
            <a onClick={navigateToPricing}>Pricing</a>
            <a onClick={navigateToCoachPortal}>Coach Portal</a>
            <a onClick={navigateToAthletePortal} className="footer-cta">Athlete Portal</a>
          </div>
          <p className="copyright">© 2025 Pulse Project LLC • Developed by Andrew Prince</p>
        </div>
      </footer>
    </div>
  );
}

export default ContactPage; 