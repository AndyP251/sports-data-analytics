import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PricingPage.css';

function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Using multiple methods to ensure scroll reset works across different browsers
    window.scrollTo(0, 0);
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE, and Opera
    
    // Force browser to recognize the scroll change
    const html = document.querySelector('html');
    if (html) {
      const originalOverflow = html.style.overflow;
      html.style.overflow = 'hidden';
      // Force a reflow
      void html.offsetHeight;
      html.style.overflow = originalOverflow;
    }
  }, []);

  const navigateToHome = () => {
    navigate('/');
  };
  
  const navigateToAthletePortal = () => {
    navigate('/athlete-portal');
  };

  const navigateToContact = () => {
    navigate('/contact');
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const handleContactClick = () => {
    // In a real implementation, this could open a contact form modal
    // For now, we'll just use a simple alert
    alert('Please email us at pulseproject@proton.me for custom pricing inquiries.');
  };
  
  return (
    <div className="pricing-page-container">
      <div className="pricing-header">
        <div className="logo" onClick={navigateToHome}>Pulse Project</div>
        <button className="back-button" onClick={navigateToHome}>
          <span className="back-arrow">←</span> Back to Home
        </button>
      </div>
      
      <div className="pricing-hero">
        <h1>Simple, Transparent Pricing</h1>
        <p>Powerful analytics that grows with your team</p>
      </div>
      
      <div className="pricing-content">
        <div className="pricing-cards">
          <div className="pricing-card">
            <div className="pricing-card-header">
              <h2>Team Standard</h2>
              <div className="pricing-amount">
                <span className="price">$2,000</span>
                <span className="period">/year</span>
              </div>
              <p className="pricing-description">Perfect for teams up to 20 athletes</p>
            </div>
            <div className="pricing-card-content">
              <ul className="pricing-features">
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Full access for up to 20 athletes</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Integration with 15+ fitness platforms</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Coach dashboard access</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Advanced analytics and reporting</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Email support</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Data export capabilities</span>
                </li>
              </ul>
              <button className="pricing-cta-button" onClick={navigateToAthletePortal}>
                Get Started
                <span className="button-arrow">→</span>
              </button>
            </div>
          </div>
          
          <div className="pricing-card featured">
            <div className="pricing-card-header">
              <div className="featured-tag">Most Popular</div>
              <h2>Team Premium</h2>
              <div className="pricing-amount">
                <span className="price">Custom</span>
                <span className="period">pricing</span>
              </div>
              <p className="pricing-description">For larger teams and organizations</p>
            </div>
            <div className="pricing-card-content">
              <ul className="pricing-features">
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Unlimited athletes</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Integration with all fitness platforms</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Advanced coach dashboard</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>AI-powered recommendations</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Priority support with dedicated manager</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Custom reporting and API access</span>
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  <span>Team onboarding and training</span>
                </li>
              </ul>
              <button className="pricing-cta-button featured-button" onClick={navigateToContact}>
                Contact Us
                <span className="button-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="hardware-bundle-section">
          <h2>Hardware Bundles Available</h2>
          <p>Don't have the equipment? We've got you covered.</p>
          
          <div className="hardware-options">
            <div className="hardware-option">
              <div className="hardware-icon">⌚</div>
              <h3>Wearables Package</h3>
              <p>Complete set of Biostrap bands for your entire team with premium membership discount.</p>
            </div>
            
            <div className="hardware-option">
              <div className="hardware-icon">📊</div>
              <h3>Performance Tracking</h3>
              <p>Catapult GPS tracking units with specialized setup and integration for field sports.</p>
            </div>
            
            <div className="hardware-option">
              <div className="hardware-icon">💪</div>
              <h3>Recovery Bundle</h3>
              <p>Biometric testing equipment for comprehensive physical assessments and recovery monitoring.</p>
            </div>
          </div>
          
          <div className="hardware-cta">
            <p>All hardware bundles include setup, integration, and training</p>
            <button className="hardware-cta-button" onClick={navigateToContact}>
              Learn More About Hardware
            </button>
          </div>
        </div>
        
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          
          <div className="faq-item">
            <h3>Can I switch plans later?</h3>
            <p>Yes, you can upgrade your plan at any time. We'll prorate your existing subscription and apply it to your new plan.</p>
          </div>
          
          <div className="faq-item">
            <h3>Is there a discount for educational institutions?</h3>
            <p>We offer special pricing for universities and educational institutions. Please contact us for details.</p>
          </div>
          
          <div className="faq-item">
            <h3>How does hardware bundling work?</h3>
            <p>Our hardware bundles can be added to any plan and include all necessary equipment, setup, and integration with our platform. The cost is added to your subscription or can be paid upfront.</p>
          </div>
          
          <div className="faq-item">
            <h3>What kind of support is included?</h3>
            <p>All plans include email support with 24-hour response time. Premium plans include priority support with a dedicated account manager and faster response times.</p>
          </div>
        </div>
      </div>
      
      <div className="contact-cta-section">
        <h2>Need a custom solution?</h2>
        <p>Contact our team to discuss your specific requirements. We can create a tailored package for your organization.</p>
        <button className="contact-cta-button" onClick={navigateToContact}>
          Contact Us
          <span className="button-arrow">→</span>
        </button>
      </div>
      
      <footer className="pricing-footer">
        <div className="footer-content">
          <div className="footer-logo">Pulse Project</div>
          <p className="copyright">© 2025 Pulse Project LLC • Developed by Andrew Prince</p>
        </div>
      </footer>
    </div>
  );
}

export default PricingPage; 