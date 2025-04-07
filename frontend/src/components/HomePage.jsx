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
  const [dynamicCounts, setDynamicCounts] = useState([0, 0, 0, 0]);

  // Add a window size hook for better responsiveness
  const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  
    useEffect(() => {
      const handleResize = () => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };
      
      window.addEventListener('resize', handleResize);
      
      // Call handler right away so state gets updated with initial window size
      handleResize();
      
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    return windowSize;
  };

  const { width } = useWindowSize();
  const isMobile = width <= 768;
  const isSmallMobile = width <= 480;

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
    
    // Dynamic counter for data points
    const countInterval = setInterval(() => {
      setDynamicCount(prev => {
        // Random increment between 1-5
        const increment = Math.floor(Math.random() * 5) + 1;
        return prev + increment;
      });
    }, 2000);
    
    // Stats counter animation
    let animationStarted = false;
    let animationFrame;
    
    const animateCounters = () => {
      if (animateStats && !animationStarted) {
        animationStarted = true;
        
        const duration = 2000; // animation duration in ms
        const startTime = performance.now();
        const finalValues = stats.map(stat => stat.value);
        
        const updateCounter = (currentTime) => {
          const elapsedTime = currentTime - startTime;
          const progress = Math.min(elapsedTime / duration, 1);
          
          // Use easeOutExpo for smoother animation near the end
          const easeOutProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          
          const newCounts = finalValues.map(value => 
            Math.floor(easeOutProgress * value)
          );
          
          setDynamicCounts(newCounts);
          
          if (progress < 1) {
            animationFrame = requestAnimationFrame(updateCounter);
          }
        };
        
        animationFrame = requestAnimationFrame(updateCounter);
      }
    };
    
    animateCounters();
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(statsTimer);
      clearInterval(testimonialInterval);
      clearInterval(insightInterval);
      clearInterval(countInterval);
      cancelAnimationFrame(animationFrame);
    };
  }, [animateStats]);

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
    { label: 'Data Fields', value: 2800, suffix: '+' },
    { label: 'Active Integrations', value: 12, suffix: '' },
    { label: 'Sport Types', value: 20, suffix: '+' },
    { label: 'Analytical Models', value: 15, suffix: '' }
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
          width: '100%',
          height: 'auto',
          maxWidth: '170px',
          maxHeight: '40px',
          objectFit: 'contain',
          filter: 'brightness(1)',
          display: 'block',
          overflow: 'hidden'
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
      <div className={`header ${scrolled ? 'scrolled' : ''}`} style={{ 
        position: 'sticky',
        top: 0,
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        zIndex: 1000,
        boxSizing: 'border-box',
        padding: scrolled ? (isMobile ? '0.5rem 0' : '0.75rem 0') : (isMobile ? '1rem 0' : '1.5rem 0'),
        backgroundColor: scrolled ? 'rgba(10, 14, 23, 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1200px',
          padding: '0 20px',
          boxSizing: 'border-box'
        }}>
          <div className="logo" style={{
            fontSize: isMobile ? '1.5rem' : '1.75rem',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #6e8efb, #a777e3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Pulse Project</div>
          <div className="nav-buttons" style={{
            display: 'flex',
            gap: isSmallMobile ? '2px' : '4px'
          }}>
            <button 
              className="pricing-button" 
              onClick={navigateToPricing}
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                padding: isSmallMobile ? '0.5rem 0.3rem' : '0.75rem 1.5rem',
                fontSize: isSmallMobile ? '0.75rem' : '1rem',
                borderRadius: '40px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Pricing
              <span className="button-arrow-hidden"></span>
            </button>
            <button 
              className="coach-portal-button" 
              onClick={navigateToCoachPortal}
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                padding: isSmallMobile ? '0.5rem 0.3rem' : '0.75rem 1.5rem',
                fontSize: isSmallMobile ? '0.75rem' : '1rem',
                borderRadius: '40px',
                border: '1px solid rgba(220, 80, 80, 0.5)',
                background: 'rgba(220, 80, 80, 0.1)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Coach Portal
              <span className="button-arrow" style={{ display: isSmallMobile ? 'none' : 'inline', marginLeft: '4px' }}>→</span>
            </button>
            <button 
              className="athlete-portal-button" 
              onClick={navigateToAthletePortal}
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                padding: isSmallMobile ? '0.5rem 0.3rem' : '0.75rem 1.5rem',
                fontSize: isSmallMobile ? '0.75rem' : '1rem',
                borderRadius: '40px',
                border: '1px solid rgba(110, 142, 251, 0.5)',
                background: 'rgba(110, 142, 251, 0.1)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Athlete Portal
              <span className="button-arrow" style={{ display: isSmallMobile ? 'none' : 'inline', marginLeft: '4px' }}>→</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="content" style={{ 
        width: '100%', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: isMobile ? '0 15px' : '0 20px',
        boxSizing: 'border-box'
      }}>
        <div className="hero-section" style={{
          marginTop: isMobile ? '2rem' : '4rem',
          marginBottom: isMobile ? '4rem' : '6rem',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          gap: isMobile ? '2rem' : '3rem',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          <div className="hero-content" style={{
            maxWidth: isMobile ? '100%' : '60%',
          }}>
            <h1 style={{
              fontSize: isSmallMobile ? '2.5rem' : (isMobile ? '3rem' : '3.5rem'),
              marginBottom: '1.5rem',
              color: '#ffffff',
              fontWeight: '800',
              lineHeight: '1.2',
              letterSpacing: '-0.5px',
              paddingTop: '0.5rem'
            }}>Sports Analytics <span style={{
              color: '#6e8efb'
            }}>Reimagined</span></h1>
            <p style={{ 
              marginBottom: '2rem',
              fontSize: isMobile ? '1.1rem' : '1.2rem',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
              maxWidth: '600px'
            }}>
              Transform your performance data into actionable insights. 
              Train smarter. Recover faster. Win more consistently.
            </p>
            <button 
              className="hero-cta-button" 
              onClick={navigateToAthletePortal} 
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: '#6e8efb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(110, 142, 251, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              Explore the Platform
            </button>
          </div>
          <div className="hero-graphic" style={{
            margin: isMobile ? '1rem auto' : '2rem auto',
            width: isMobile ? '240px' : '300px',
            height: isMobile ? '240px' : '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Outer glowing circle */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(110,142,251,0.2) 0%, rgba(16,23,42,0) 70%)',
              boxShadow: '0 0 40px rgba(110,142,251,0.15)',
              animation: 'pulse 3s infinite'
            }}></div>
            
            {/* Middle circle with gradient border */}
            <div style={{
              position: 'absolute',
              width: '85%',
              height: '85%',
              borderRadius: '50%',
              border: '1px solid rgba(110,142,251,0.3)',
              boxShadow: 'inset 0 0 20px rgba(110,142,251,0.1)'
            }}></div>
            
            {/* Inner circle with data visualization */}
            <div style={{
              position: 'relative',
              width: '70%',
              height: '70%',
              borderRadius: '50%',
              background: 'rgba(110,142,251,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 30px rgba(110,142,251,0.1)'
            }}>
              <svg width={isMobile ? "55" : "60"} height={isMobile ? "55" : "60"} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21H3V3" stroke="#6E8EFB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 9L15.5 14.5L12.5 11.5L8.5 15.5L3 10" stroke="#6E8EFB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="19.5" cy="4.5" r="1.5" fill="#A777E3"/>
                <circle cx="15.5" cy="14.5" r="1.5" fill="#6E8EFB"/>
                <circle cx="12.5" cy="11.5" r="1.5" fill="#A777E3"/>
                <circle cx="8.5" cy="15.5" r="1.5" fill="#6E8EFB"/>
                <circle cx="4.5" cy="10.5" r="1.5" fill="#A777E3"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="stats-container" style={{ 
          width: '100%', 
          display: 'grid',
          gridTemplateColumns: isSmallMobile ? 'repeat(2, 1fr)' : (isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'),
          justifyContent: 'center',
          margin: '2rem auto',
          maxWidth: isMobile ? '100%' : '900px',
          gap: isSmallMobile ? '1rem 0.5rem' : '1.5rem',
          boxSizing: 'border-box',
          overflow: 'hidden',
          padding: isSmallMobile ? '0 5px' : '0 10px'
        }}>
          {stats.map((stat, index) => (
            <div 
              className="stat-item" 
              key={index}
              style={{
                textAlign: 'center',
                padding: '0.5rem',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              <div 
                className={`stat-value ${animateStats ? 'animate' : ''}`}
                style={{
                  fontSize: stat.value >= 1000000 ? 
                    (isSmallMobile ? '1.3rem' : (isMobile ? '1.8rem' : '2.2rem')) : 
                    (isSmallMobile ? '1.6rem' : (isMobile ? '2.2rem' : '2.8rem')),
                  fontWeight: '700',
                  lineHeight: '1.2',
                  marginBottom: isSmallMobile ? '0.25rem' : '0.5rem',
                  background: 'linear-gradient(90deg, #6e8efb, #7873f5)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'block',
                  width: '100%',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  transition: 'opacity 0.5s, transform 0.5s',
                  opacity: animateStats ? 1 : 0,
                  transform: animateStats ? 'translateY(0)' : 'translateY(20px)'
                }}
              >
                {animateStats ? dynamicCounts[index].toLocaleString() : '0'}
                {stat.suffix}
              </div>
              <div className="stat-label" style={{
                fontSize: isSmallMobile ? '0.9rem' : '1rem',
                color: 'var(--text-secondary)'
              }}>{stat.label}</div>
            </div>
          ))}
        </div>
        
        <div className="dynamic-insights-section" style={{
          width: '100%',
          margin: '2rem 0',
          padding: '1.5rem 0',
          position: 'relative',
          boxSizing: 'border-box',
          overflow: 'visible'
        }}>
          <div className="insights-title" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <span className="pulse-dot" style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--blue-accent)',
              marginRight: '8px',
              animation: 'pulse 1.5s infinite'
            }}></span> LIVE INSIGHTS
            <div className="data-counter" style={{
              marginLeft: '1rem',
              fontSize: '0.9rem',
              color: 'var(--blue-accent)'
            }}>
              +{dynamicCount} data points processed in real time
            </div>
          </div>
          <div className="insights-carousel" style={{
            position: 'relative',
            height: '200px',
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            overflow: 'hidden'
          }}>
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={`insight-card ${index === activeInsight ? 'active' : ''}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: index === activeInsight ? 1 : 0,
                  transform: index === activeInsight ? 'translateX(0)' : 'translateX(100%)',
                  transition: 'transform 0.6s ease, opacity 0.6s ease',
                  pointerEvents: index === activeInsight ? 'auto' : 'none'
                }}
              >
                <div className="insight-content" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '0 1rem'
                }}>
                  <div className="insight-icon" style={{
                    fontSize: '2.5rem',
                    marginBottom: '1.5rem'
                  }}>💡</div>
                  <div className="insight-text" style={{
                    fontSize: isSmallMobile ? '1.2rem' : '1.6rem',
                    lineHeight: '1.5',
                    fontWeight: '600',
                    background: 'linear-gradient(90deg, #ffffff, #6e8efb)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>{insight}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="insights-dots" style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '1rem'
          }}>
            {insights.map((_, index) => (
              <span 
                key={index} 
                className={`insight-dot ${index === activeInsight ? 'active' : ''}`}
                onClick={() => setActiveInsight(index)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: index === activeInsight ? 'var(--blue-accent)' : 'rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease'
                }}
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
                  <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
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
          <div className="integration-disclaimer">
            <p className="integration-disclaimer-text" style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              display: 'block',
              lineHeight: '1.5',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              borderLeft: '3px solid var(--blue-accent)',
              margin: '0.5rem 0 1.5rem',
              textAlign: 'left',
              maxWidth: '700px'
            }}>* Pulse Project is not officially affiliated with these platforms. Integrations are currently in development and shown for demonstration purposes only.</p>
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