import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';
import whoopLogo from '../assets/whoop-black-puck.png';
import catapultLogo from '../assets/catapult-black-square.png';
import garminLogo from '../assets/garmin-white-text.png';
import uvaLogo from '../assets/uva-logo.jpg';
import kateAction from '../assets/kate-galcia-playing.jpg';


const HomePage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [animateStats, setAnimateStats] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [activeInsight, setActiveInsight] = useState(0);
  const [dynamicCount, setDynamicCount] = useState(0);

  useEffect(() => {
    // Add scroll event listener for header effect
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // Trigger stats animation when scrolled to that section - reduced threshold
      if (window.scrollY > 100) {
        setAnimateStats(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Automatically show stats after 2 seconds even without scrolling
    const statsTimer = setTimeout(() => {
      setAnimateStats(true);
    }, 2000);
    
    // Testimonial rotation
    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 8000);
    
    // Dynamic insights rotation
    const insightInterval = setInterval(() => {
      setActiveInsight((prev) => (prev + 1) % insights.length);
    }, 3000);
    
    // Dynamic counter
    const countInterval = setInterval(() => {
      setDynamicCount(prev => {
        // Random increment between 1-5
        const increment = Math.floor(Math.random() * 5) + 1;
        return prev + increment;
      });
    }, 2000);
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(statsTimer);
      clearInterval(testimonialInterval);
      clearInterval(insightInterval);
      clearInterval(countInterval);
    };
  }, []);

  const navigateToAthletePortal = () => {
    navigate('/athlete-portal');
  };

  const navigateToPrivacyPolicy = () => {
    navigate('/privacy-policy');
  };

  const navigateToPricing = () => {
    navigate('/pricing');
  };

  const navigateToCoachPortal = () => {
    navigate('/coach-portal');
  };

  // Stats for counter animation
  const stats = [
    { label: 'Athletes', value: 5000, suffix: '+' },
    { label: 'Teams', value: 50, suffix: '+' },
    { label: 'Data Points', value: 1000000, suffix: '+' },
    { label: 'Sports', value: 25, suffix: '' }
  ];
  
  // Integration platforms
  const integrations = [
    { 
      name: 'Whoop', 
      logo: <img 
        src={whoopLogo} 
        alt="WHOOP"
        style={{
          width: '80px',
          height: '80px',
          objectFit: 'contain',
          filter: 'brightness(1)'
        }}
      />, 
      description: 'Recovery optimization and sleep tracking'
    },
    { 
      name: 'Catapult', 
      logo: <img 
        src={catapultLogo} 
        alt="Catapult"
        style={{
          width: '80px',
          height: '80px',
          objectFit: 'cover',
          borderRadius: '50%',
          backgroundColor: 'transparent',
        }}
      />,
      description: 'Advanced GPS performance tracking'
    },
    { 
      name: 'Garmin', 
      logo: <img 
        src={garminLogo} 
        alt="Garmin"
        style={{
          width: '189px', // Wider to accommodate the text
          height: '50px', // Shorter height for proper proportions
          objectFit: 'contain',
          filter: 'brightness(1)',
          margin: '20px 0', // Add vertical margin to center in the space
        }}
      />,
      description: 'Comprehensive fitness data collection'
    },
    { 
      name: 'Apple HealthKit', 
      logo: '❤️', 
      description: 'Health metrics integration'
    }
  ];
  
  // Partner universities - updated to only include UVA
  const universities = [
    {
      name: 'University of Virginia',
      logo: <img src={uvaLogo} alt="UVA Logo" className="uva-logo-img" />,
      description: 'Aspiring to partner with UVA Athletics'
    }
  ];
  
  // Live insights for dynamic component
  const insights = [
    "Sleep quality impacts next-day performance by up to 37%",
    "Recovery time decreases by 28% with optimal hydration",
    "HRV variations can predict injury risk with 82% accuracy",
    "Consistent training times improve performance metrics by 19%",
    "Nutrition timing affects recovery rate by up to 31%"
  ];
  
  // Testimonials from athletes
  const testimonials = [
    {
      quote: "The Pulse platform changed my approach to training completely. Being able to see the relationship between my recovery metrics and performance has helped me optimize my routine.",
      athlete: "Ben Wayer",
      sport: "Men's Lacrosse, UVA"
    },
    {
      quote: "I've always tracked my data, but Pulse lets me understand what it actually means. The sleep analysis and recovery recommendations have been game-changing for my performance.",
      athlete: "Lara Kology",
      sport: "Women's Lacrosse, UVA"
    },
    {
      quote: "The ability to connect all my training devices and see patterns across different metrics helped me identify what was limiting my performance. Now I'm playing at my best.",
      athlete: "Kate Galica",
      sport: "Women's Lacrosse, UVA"
    },
    {
      quote: "As both an athlete and developer of this platform, I created Pulse to solve problems I was facing. Now it's incredible to see how it's helping athletes across all sports at UVA.",
      athlete: "Andrew Prince",
      sport: "Men's Rowing, UVA"
    }
  ];

  return (
    <div className="home-page">
      <div className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="logo">Pulse Project</div>
        <div className="nav-buttons">
          <button 
            className="pricing-button" 
            onClick={navigateToPricing}
          >
            Pricing
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
        <div className="hero-section">
          <h1>Unlock Your Athletic Potential</h1>
          <p>
            Advanced sports analytics platform that transforms your performance data 
            into actionable insights, helping you train smarter and achieve your goals faster.
          </p>
          <button className="hero-cta-button" onClick={navigateToAthletePortal}>
            Start Your Journey
            <span className="button-arrow">→</span>
          </button>
        </div>

        <div className="stats-container">
          {stats.map((stat, index) => (
            <div className="stat-item" key={index}>
              <div className={`stat-value ${animateStats ? 'animate' : ''}`} data-value={stat.value}>
                {animateStats ? stat.value.toLocaleString() : '0'}
                {stat.suffix}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
        
        <div className="dynamic-insights-section">
          <div className="insights-title">
            <span className="pulse-dot"></span> LIVE INSIGHTS
            <div className="data-counter">
              +{dynamicCount} data points processed in real time
            </div>
          </div>
          <div className="insights-carousel">
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={`insight-card ${index === activeInsight ? 'active' : ''}`}
              >
                <div className="insight-content">
                  <div className="insight-icon">💡</div>
                  <div className="insight-text">{insight}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="insights-dots">
            {insights.map((_, index) => (
              <span 
                key={index} 
                className={`insight-dot ${index === activeInsight ? 'active' : ''}`}
                onClick={() => setActiveInsight(index)}
              ></span>
            ))}
          </div>
        </div>
        
        <div className="section goals-section">
          <h2>Beyond Visualization</h2>
          <div className="goals-content">
            <div className="goals-text">
              <p>
                Current platforms simply visualize your data. We go further by 
                <span className="highlight"> contextualizing and interpreting </span> 
                your performance metrics. Our <span className="highlight">Coach Portal</span> allows staff to monitor 
                entire teams from one cohesive interface, enabling data-driven decisions at both individual and team levels.
              </p>
              <ul className="goals-list">
                <li>
                  <span className="icon">→</span>
                  <span>Transform raw data into actionable recommendations</span>
                </li>
                <li>
                  <span className="icon">→</span>
                  <span>Identify patterns across multiple data sources</span>
                </li>
                <li>
                  <span className="icon">→</span>
                  <span>Provide context-aware performance insights</span>
                </li>
                <li>
                  <span className="icon">→</span>
                  <span>Optimize recovery and training schedules</span>
                </li>
                <li>
                  <span className="icon">→</span>
                  <span>Enable coaches to track team-wide metrics and individual athlete progress</span>
                </li>
                <li>
                  <span className="icon">→</span>
                  <span>Alert coaching staff to potential injury risks and recovery needs</span>
                </li>
              </ul>
            </div>
            <div className="goals-graphic">
              <div className="data-flow-graphic">
                <div className="data-node">Raw Data</div>
                <div className="data-arrow">→</div>
                <div className="data-node">Analysis</div>
                <div className="data-arrow">→</div>
                <div className="data-node highlight-node">Interpretation</div>
                <div className="data-arrow">→</div>
                <div className="data-node highlight-node">Action</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="section universities-section">
          <h2>University Partners</h2>
          <div className="uva-partnership-container">
            <div className="uva-info">
              <div className="uva-logo">{universities[0].logo}</div>
              <h3>{universities[0].name}</h3>
              <p className="uva-description">
                Pulse Project is developed by UVA student-athletes and aims to partner with UVA Athletics to optimize athlete performance and recovery. Our platform integrates with existing performance tracking systems to provide comprehensive insights across all varsity sports.
              </p>
              <p className="uva-metrics">
                <span className="uva-disclaimer-text">* While our team members are UVA student-athletes, Pulse Project is not yet an official partner of UVA Athletics.</span>
              </p>
              <button
                className="meet-team-button"
                onClick={() => navigate('/team')}
              >
                Meet Our Team
                <span className="button-arrow">→</span>
              </button>
            </div>
            <div className="uva-image-container">
              <img src={kateAction} alt="UVA Women's Lacrosse in action" className="uva-action-photo" />
            </div>
          </div>
        </div>
        
        <div className="section features-section">
          <h2>Key Features</h2>
          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 7.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z"/>
                </svg>
              </div>
              <h3>Data Integration</h3>
              <p>Seamlessly connect with multiple fitness trackers and health apps for a comprehensive view of your performance.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4 11a1 1 0 1 1 2 0v1a1 1 0 1 1-2 0v-1zm6-4a1 1 0 1 1 2 0v5a1 1 0 1 1-2 0V7zM7 9a1 1 0 0 1 2 0v3a1 1 0 1 1-2 0V9z"/>
                  <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                  <path d="M9.5 1a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2z"/>
                </svg>
              </div>
              <h3>Performance Analytics</h3>
              <p>Advanced metrics and visualizations track your progress over time, identifying strengths and areas for improvement.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zM11 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2z"/>
                </svg>
              </div>
              <h3>Personalized Insights</h3>
              <p>Get AI-powered recommendations tailored to your unique athletic profile, goals, and training history.</p>
            </div>
          </div>
        </div>
        
        <div className="section integrations-section">
          <h2>Current Integrations</h2>
          <div className="integrations-container">
            {integrations.map((integration, index) => (
              <div className="integration-card" key={index}>
                <div className="integration-logo">{integration.logo}</div>
                <h3>{integration.name}</h3>
                <p>{integration.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="section testimonials-section">
          <h2>Athlete Testimonials</h2>
          <div className="testimonials-container">
            <div className="testimonial-card">
              <div className="quote-marks">"</div>
              <p className="testimonial-quote">{testimonials[currentTestimonial].quote}</p>
              <div className="testimonial-author">
                <strong>{testimonials[currentTestimonial].athlete}</strong>
                <span>{testimonials[currentTestimonial].sport}</span>
              </div>
              <div className="testimonial-nav">
                {testimonials.map((_, index) => (
                  <button 
                    key={index} 
                    className={`testimonial-dot ${index === currentTestimonial ? 'active' : ''}`}
                    onClick={() => setCurrentTestimonial(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer>
        <div className="footer-content">
          <div className="footer-logo">Pulse Project</div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#integrations">Integrations</a>
            <a href="#testimonials">Testimonials</a>
            <a onClick={navigateToPricing}>Pricing</a>
            <a onClick={navigateToCoachPortal}>Coach Portal</a>
            <a onClick={navigateToAthletePortal} className="footer-cta">Athlete Portal</a>
            <a onClick={navigateToPrivacyPolicy}>Privacy Policy</a>
          </div>
          <p className="copyright">© 2025 Pulse Project LLC • Developed by Andrew Prince</p>
          <p className="copyright">Many details on this homepage are not currently true and are used for demonstration purposes only.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 