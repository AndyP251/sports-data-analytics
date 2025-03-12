import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PricingPage.css';
import catapultLogo from '../assets/catapult-black-square.png';
import whoopLogo from '../assets/whoop-black-puck.png';
import garminLogo from '../assets/garmin-black-text.png';

function PricingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('monthly');
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
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

  const toggleFaq = (index) => {
    if (activeFaq === index) {
      setActiveFaq(null);
    } else {
      setActiveFaq(index);
    }
  };

  const faqs = [
    {
      question: "Can I switch plans later?",
      answer: "Yes, you can upgrade your plan at any time. We'll prorate your existing subscription and apply it to your new plan."
    },
    {
      question: "Is there a discount for educational institutions?",
      answer: "We offer special pricing for universities and educational institutions. Please contact us for details."
    },
    {
      question: "How does hardware bundling work?",
      answer: "Our hardware bundles can be added to any plan and include all necessary equipment, setup, and integration with our platform. The cost is added to your subscription or can be paid upfront."
    },
    {
      question: "What kind of support is included?",
      answer: "All plans include email support with 24-hour response time. Premium plans include priority support with a dedicated account manager and faster response times."
    }
  ];
  
  return (
    <div className="pricing-wrapper">
      <header className="pricing-header">
        <div className="header-container" style={{ boxSizing: 'border-box', width: '100%', maxWidth: '1200px' }}>
          <div className="logo" onClick={navigateToHome}>Pulse Project</div>
          <div className="header-right">
            <button onClick={navigateToHome} className="nav-link">Home</button>
            <button onClick={navigateToAthletePortal} className="cta-button">Get Started</button>
          </div>
        </div>
      </header>
      
      <main>
        <section className="hero">
          <div className="hero-content">
            <h1>Pricing that scales with your team</h1>
            <p>Unlock the power of data-driven athletics with transparent pricing and flexible options</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={navigateToAthletePortal}>
                Start Free Trial
              </button>
              <button className="secondary-button" onClick={navigateToContact}>
                Contact Sales
              </button>
            </div>
          </div>
          <div className="particles">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className="particle"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                }}
              ></div>
            ))}
          </div>
        </section>
        
        <section className="pricing-plans">
          <div className="container">
            <div className="section-header">
              <h2>Choose the right plan for your team</h2>
              <div className="pricing-toggles">
                <button 
                  className={`toggle-button ${activeTab === 'monthly' ? 'active' : ''}`}
                  onClick={() => setActiveTab('monthly')}
                >
                  Monthly
                </button>
                <button 
                  className={`toggle-button ${activeTab === 'annual' ? 'active' : ''}`}
                  onClick={() => setActiveTab('annual')}
                >
                  Annual
                  <span className="save-badge">Save 20%</span>
                </button>
              </div>
            </div>
            
            <div className="plans-container">
              <div className="pricing-card standard">
                <div className="card-header">
                  <h3>Team Standard</h3>
                  <div className="price">
                    <span className="amount">${activeTab === 'annual' ? '2,000' : '200'}</span>
                    <span className="period">/{activeTab === 'annual' ? 'year' : 'month'}</span>
                  </div>
                  <p className="subtitle">Perfect for teams up to 20 athletes</p>
                </div>
                <div className="card-body">
                  <ul className="features-list">
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Full access for up to 20 athletes</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Integration with 15+ fitness platforms</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Coach dashboard access</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Advanced analytics and reporting</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Email support</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Data export capabilities</span>
                    </li>
                  </ul>
                  <button className="card-cta" onClick={navigateToAthletePortal}>
                    Get Started
                  </button>
                </div>
              </div>
              
              <div className="pricing-card premium">
                <div className="popular-tag">Most Popular</div>
                <div className="card-header">
                  <h3>Team Premium</h3>
                  <div className="price">
                    <span className="amount">Custom</span>
                    <span className="period">pricing</span>
                  </div>
                  <p className="subtitle">For larger teams and organizations</p>
                </div>
                <div className="card-body">
                  <ul className="features-list">
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Unlimited athletes</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Integration with all fitness platforms</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Advanced coach dashboard</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>AI-powered recommendations</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Priority support with dedicated manager</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Custom reporting and API access</span>
                    </li>
                    <li>
                      <svg className="check-icon" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                      <span>Team onboarding and training</span>
                    </li>
                  </ul>
                  <button className="card-cta premium-cta" onClick={navigateToContact}>
                    Contact Us
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="hardware-section">
          <div className="container">
            <div className="hardware-section-header">
              <h2>Performance Hardware</h2>
              <p className="section-description">
                Elevate your team's performance with our integrated hardware solutions that seamlessly connect with the Pulse platform.
              </p>
            </div>
            
            <div className="hardware-bundle-wrapper">
              <div className="hardware-cards">
                <div className="hardware-card">
                  <div className="card-accent"></div>
                  <div className="hardware-icon-container">
                    <div className="hardware-icon">⌚</div>
                  </div>
                  <h3>Wearables Package</h3>
                  <p>Complete set of Biostrap bands for your entire team with premium membership discount.</p>
                  <div className="hardware-features">
                    <span>Sleep tracking</span>
                    <span>Heart rate monitoring</span>
                    <span>Recovery metrics</span>
                  </div>
                  <button className="hardware-cta" onClick={navigateToContact}>
                    Learn More
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                
                <div className="hardware-card featured">
                  <div className="card-accent"></div>
                  <div className="hardware-icon-container">
                    <div className="hardware-icon">📊</div>
                  </div>
                  <h3>Performance Tracking</h3>
                  <p>Catapult GPS tracking units with specialized setup and integration for field sports.</p>
                  <div className="hardware-features">
                    <span>Real-time GPS tracking</span>
                    <span>Movement analytics</span>
                    <span>Team performance metrics</span>
                  </div>
                  <button className="hardware-cta" onClick={navigateToContact}>
                    Learn More
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                
                <div className="hardware-card">
                  <div className="card-accent"></div>
                  <div className="hardware-icon-container">
                    <div className="hardware-icon">💪</div>
                  </div>
                  <h3>Recovery Bundle</h3>
                  <p>Biometric testing equipment for comprehensive physical assessments and recovery monitoring.</p>
                  <div className="hardware-features">
                    <span>Muscle recovery</span>
                    <span>Force plate analytics</span>
                    <span>Injury prevention</span>
                  </div>
                  <button className="hardware-cta" onClick={navigateToContact}>
                    Learn More
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="partner-technology">
                <div className="partner-technology-content">
                  <h3>Trusted Technology Partners</h3>
                  <p>Our hardware integrates directly with industry-leading tracking and monitoring technology to provide seamless data collection and analysis.</p>
                  
                  <div className="partner-logos-container">
                    <div className="partner-logo">
                      <div className="logo-container catapult-logo">
                        <img src={catapultLogo} alt="Catapult Logo" />
                      </div>
                    </div>
                    <div className="partner-logo">
                      <div className="logo-container whoop-logo">
                        <img src={whoopLogo} alt="WHOOP Logo" />
                      </div>
                    </div>
                    <div className="partner-logo">
                      <div className="logo-container garmin-logo">
                        <img src={garminLogo} alt="Garmin Logo" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="hardware-note">
                    <div className="note-icon">💡</div>
                    <p>All hardware bundles include setup, integration, and training</p>
                  </div>
                  
                  <div className="hardware-disclaimer">
                    <p className="disclaimer-text">* Pulse Project is not officially affiliated with Catapult, WHOOP, or Garmin. These integrations are in development and showcased for demonstration purposes only.</p>
                  </div>
                </div>
                <div className="glow-effect"></div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="faq-section">
          <div className="container">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-container">
              {faqs.map((faq, index) => (
                <div 
                  className={`faq-item ${activeFaq === index ? 'active' : ''}`} 
                  key={index}
                  onClick={() => toggleFaq(index)}
                >
                  <div className="faq-question">
                    <h3>{faq.question}</h3>
                    <div className="faq-icon">
                      <svg viewBox="0 0 24 24" width="20" height="20" style={{ display: 'block', overflow: 'hidden' }}>
                        <path d={activeFaq === index ? "M19 13H5v-2h14v2z" : "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"} />
                      </svg>
                    </div>
                  </div>
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section className="cta-section">
          <div className="container">
            <div className="cta-content">
              <h2>Ready to elevate your team's performance?</h2>
              <p>Contact our team to discuss your specific requirements or start your free trial today.</p>
              <div className="cta-buttons">
                <button className="primary-button" onClick={navigateToAthletePortal}>
                  Start Free Trial
                </button>
                <button className="secondary-button" onClick={navigateToContact}>
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
          <div className="cta-background">
            <div className="cta-shape shape-1"></div>
            <div className="cta-shape shape-2"></div>
            <div className="cta-shape shape-3"></div>
          </div>
        </section>
      </main>
      
      <footer>
        <div className="container">
          <div className="footer-logo" onClick={navigateToHome}>Pulse Project</div>
          <div className="footer-nav">
            <button onClick={navigateToHome}>Home</button>
            <button onClick={navigateToAthletePortal}>Athlete Portal</button>
            <button onClick={navigateToContact}>Contact</button>
          </div>
          <p className="copyright">© 2025 Pulse Project LLC • Developed by Andrew Prince</p>
        </div>
      </footer>
    </div>
  );
}

export default PricingPage; 