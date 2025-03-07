import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PrivacyPolicy.css';

function PrivacyPolicy() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  const navigateToHome = () => {
    navigate('/');
  };
  
  return (
    <div className="privacy-policy-container">
      <div className="privacy-header">
        <div className="logo" onClick={navigateToHome}>Pulse Project</div>
        <button className="back-button" onClick={navigateToHome}>
          <span className="back-arrow">←</span> Back to Home
        </button>
      </div>
      
      <div className="privacy-content">
        <h1>Privacy Policy</h1>
        <p className="effective-date">Effective Date: March 6, 2025</p>
        
        <section className="policy-section">
          <h2><span className="section-number">1.</span> Introduction</h2>
          <p>
            At Pulse Project, our mission is to transform <span className="highlight">YOUR</span> data into meaningful recovery and performance insights. 
            We were founded to enhance your life, not invade it. This Privacy Policy outlines how we collect, use, 
            and protect your personal data when you use our platform to integrate fitness data, track performance 
            analytics, and receive personalized insights.
          </p>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">2.</span> Information We Collect</h2>
          <p>To provide our services, we collect the following types of data:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">Personal Information:</span> Name, email, and account details for authentication and communication purposes.
            </li>
            <li>
              <span className="list-title">Fitness & Health Data:</span> Metrics from fitness trackers, health apps, and wearables (such as heart rate, movement, sleep, and training history) to deliver analytics and insights.
            </li>
            <li>
              <span className="list-title">Device & Usage Information:</span> Data on app usage, device type, and interaction logs to enhance user experience and improve our services.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">3.</span> How We Use Your Data</h2>
          <p>We use your information to:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">Data Integration:</span> Seamlessly connect with multiple fitness trackers and health apps to provide a unified view of your performance.
            </li>
            <li>
              <span className="list-title">Performance Analytics:</span> Analyze trends, generate visual reports, and track progress over time.
            </li>
            <li>
              <span className="list-title">Personalized Insights:</span> Deliver AI-driven recommendations tailored to your goals, athletic profile, and training history.
            </li>
            <li>
              <span className="list-title">Service Enhancement:</span> Improve user experience, troubleshoot technical issues, and refine our analytics models.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">4.</span> Data Sharing & Third-Party Integrations</h2>
          <p>We prioritize your privacy and only share data when necessary:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">With Your Consent:</span> We will always seek your permission before integrating data from third-party fitness apps and devices.
            </li>
            <li>
              <span className="list-title">For Essential Services:</span> Some third-party providers help process data for analytics and recommendations.
            </li>
            <li>
              <span className="list-title">For Legal Compliance:</span> If required by law or legal proceedings, we may share data as necessary to comply with regulations.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">5.</span> Data Security</h2>
          <p>We implement robust security measures to protect your data, including:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">Encryption:</span> Secure storage and transmission of sensitive information.
            </li>
            <li>
              <span className="list-title">Access Controls:</span> Limited access to authorized personnel only.
            </li>
            <li>
              <span className="list-title">Regular Audits:</span> Continuous monitoring and updates to security protocols.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">6.</span> Your Rights & Choices</h2>
          <p>You have the right to:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">Access & Update Data:</span> View and modify your personal information at any time.
            </li>
            <li>
              <span className="list-title">Withdraw Consent:</span> Disconnect fitness trackers and revoke data-sharing permissions.
            </li>
            <li>
              <span className="list-title">Request Deletion:</span> Permanently delete your account and associated data upon request.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">7.</span> Changes to this Privacy Policy</h2>
          <p>
            This Privacy Policy can change periodically. We will notify users of significant changes and provide 
            the latest version on our platform.
          </p>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">8.</span> Contact Us</h2>
          <p>
            If you have any questions or concerns regarding your privacy, please contact us at 
            <a href="mailto:pulseproject@proton.me" className="email-link"> pulseproject@proton.me</a>
          </p>
        </section>

        <div className="policy-footer">
          <p>By using Pulse Project, you agree to the terms outlined in this Privacy Policy.</p>
        </div>
      </div>
      
      <footer className="privacy-footer">
        <div className="footer-content">
          <div className="footer-logo">Pulse Project</div>
          <p className="copyright">© 2025 Pulse Project LLC • Developed by Andrew Prince</p>
        </div>
      </footer>
    </div>
  );
}

export default PrivacyPolicy; 