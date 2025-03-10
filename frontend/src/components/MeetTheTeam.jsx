import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MeetTheTeam.css';
// Import the image files
import andrewImage from '../assets/andrew-profile-2.jpg';
import benImage from '../assets/ben-wayer-headshot.jpeg';
import kateImage from '../assets/kate-galcia-profile.jpg';
import uvaLogo from '../assets/uva-logo.jpg';

const MeetTheTeam = () => {
  const navigate = useNavigate();
  
  // Fix for scrolling issue - use a more robust approach
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

  const navigateToPricing = () => {
    navigate('/pricing');
  };

  const navigateToCoachPortal = () => {
    navigate('/coach-portal');
  };

  const navigateToAthletePortal = () => {
    navigate('/athlete-portal');
  };
  
  const navigateToContact = () => {
    navigate('/contact');
  };

  const teamMembers = [
    {
      name: 'Andrew Prince',
      role: 'Co-Founder & Lead Developer',
      bio: 'A Utah native with a passion for outdoor adventure & technology, Andrew brings his experience as both a competitive athlete and software developer to the Pulse Project. Beyond rowing at UVA, he\'s an avid mountain biker and alpine skier who understands the critical role data plays in athletic performance.',
      photo: andrewImage,
      affiliation: 'University of Virginia Men\'s Rowing',
      linkedin: 'https://www.linkedin.com/in/andrew-w-prince/'
    },
    {
      name: 'Ben Wayer',
      role: 'Co-Founder',
      bio: 'Ben combines his experience as a D1 lacrosse player with deep expertise in sports analytics. His intimate understanding of competitive athletics and data science enables him to create performance insights that truly resonate with athletes and coaches alike.',
      photo: benImage,
      affiliation: 'University of Virginia D1 Men\'s Lacrosse',
      linkedin: 'https://www.linkedin.com/in/ben-wayer-a3476b200/'
    },
    {
      name: 'Kate Galcia',
      role: 'Co-Founder',
      bio: 'As a standout on UVA\'s Women\'s Lacrosse team, Kate brings firsthand experience of elite athletic performance. Her background in kinesiology and sports science helps shape our platform\'s practical applications for injury prevention and performance optimization.',
      photo: kateImage,
      affiliation: 'University of Virginia D1 Women\'s Lacrosse',
      linkedin: 'https://www.linkedin.com/in/katherine-galica/'
    },
    {
      name: 'Lara Kology',
      role: 'Co-Founder',
      bio: 'Lara brings a unique dual perspective as both a D1 athlete and design specialist. Her understanding of how athletes process information during training has been instrumental in creating an intuitive interface that delivers critical insights when they matter most.',
      photo: 'placeholder', // Still using placeholder for Lara
      affiliation: 'University of Virginia D1 Women\'s Lacrosse',
      linkedin: 'https://www.linkedin.com/in/lara-kology-7a68ab282/'
    }
  ];

  const renderBioWithHighlights = (bio, name) => {
    const highlightTerms = {
      'Andrew Prince': ['outdoor adventure', 'technology', 'competitive athlete', 'software developer', 'UVA'],
      'Ben Wayer': ['D1 lacrosse player', 'sports analytics', 'data science'],
      'Kate Galcia': ['UVA\'s Women\'s Lacrosse', 'kinesiology', 'sports science', 'injury prevention'],
      'Lara Kology': ['D1 athlete', 'design specialist', 'interface']
    };

    const terms = highlightTerms[name] || [];
    let highlightedBio = bio;

    terms.forEach(term => {
      highlightedBio = highlightedBio.replace(
        new RegExp(`\\b${term}\\b`, 'i'), 
        `<span class="highlight-term">${term}</span>`
      );
    });

    return <p className="member-bio" dangerouslySetInnerHTML={{ __html: highlightedBio }} />;
  };

  return (
    <div className="team-page">
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
          <h1>Meet Our Team</h1>
          <p>
            The passionate cofounders behind Pulse Project working to transform athletic performance
            through data-driven insights and innovative technology.
          </p>
          <div className="uva-disclaimer">
            * While our team members are affiliated with UVA athletics, Pulse Project is not yet an official partner of UVA Athletics.
          </div>
        </div>

        <div className="team-container">
          {teamMembers.map((member, index) => (
            <div 
              className="team-member-card" 
              key={index}
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="member-photo-container">
                {member.photo === 'placeholder' ? (
                  <div className="photo-placeholder">
                    <span>{member.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                ) : (
                  <div className="member-photo">
                    <img src={member.photo} alt={member.name} className="actual-photo" />
                  </div>
                )}
              </div>
              <div className="member-details">
                <h3>{member.name}</h3>
                <div className="member-role">{member.role}</div>
                <div className="member-affiliation">{member.affiliation}</div>
                {renderBioWithHighlights(member.bio, member.name)}
                <div className="member-social">
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="social-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                      <rect x="2" y="9" width="4" height="12"></rect>
                      <circle cx="4" cy="4" r="2"></circle>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="join-team-section">
          <h2>Join Our Mission</h2>
          <p>
            We're always looking for talented individuals who are passionate about sports analytics and technology.
            If you're interested in being part of our journey, reach out to us!
          </p>
          <button
            onClick={navigateToContact}
            className="contact-button"
          >
            Contact Us
            <span className="button-arrow">→</span>
          </button>
        </div>
      </div>
      
      <footer>
        <div className="footer-content">
          <div className="footer-logo">Pulse Project</div>
          <div className="footer-links">
            <a onClick={navigateToHome}>Home</a>
            <a href="#team">Our Team</a>
            <a onClick={navigateToPricing}>Pricing</a>
            <a onClick={navigateToCoachPortal}>Coach Portal</a>
            <a onClick={navigateToAthletePortal} className="footer-cta">Athlete Portal</a>
          </div>
          <p className="copyright">© 2025 Pulse Project LLC • Developed by Andrew Prince</p>
        </div>
      </footer>
    </div>
  );
};

export default MeetTheTeam;