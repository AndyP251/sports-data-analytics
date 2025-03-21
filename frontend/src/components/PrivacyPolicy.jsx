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
            Pulse Project ("we," "us," or "our") is committed to protecting the privacy and security of your personal and biometric data. 
            This Privacy Policy ("Policy") describes our practices regarding the collection, use, storage, protection, and disclosure 
            of information we collect from users of our platform, applications, and services (collectively, the "Services"). 
            By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by this Policy.
          </p>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">2.</span> Legal Basis for Processing</h2>
          <p>We process your personal and biometric data based on the following legal grounds:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">Explicit Consent:</span> We obtain your explicit, informed consent before collecting and processing your biometric and health data.
            </li>
            <li>
              <span className="list-title">Contract Performance:</span> Processing necessary for the performance of our contract with you to provide our Services.
            </li>
            <li>
              <span className="list-title">Legitimate Interests:</span> Where applicable, we process data for our legitimate business interests in a way that does not override your rights and freedoms.
            </li>
            <li>
              <span className="list-title">Legal Compliance:</span> Processing may be necessary to comply with applicable laws and regulations.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">3.</span> Categories of Information We Collect</h2>
          <p>To provide our Services, we collect and process the following categories of data:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">Personal Identifiers:</span> Name, email address, account credentials, demographic information, and contact details necessary for account creation, authentication, and communications.
            </li>
            <li>
              <span className="list-title">Biometric Data:</span> Physiological and biological measurements including but not limited to heart rate variability, blood oxygen levels, respiratory rate, body temperature, electrodermal activity, sleep patterns, and other health-related metrics captured through integrated devices and applications.
            </li>
            <li>
              <span className="list-title">Health and Fitness Information:</span> Training history, physical activity records, exercise intensity, duration, frequency, recovery metrics, nutrition data, and self-reported health information.
            </li>
            <li>
              <span className="list-title">Device and Technical Data:</span> Device identifiers, IP address, browser type, operating system, access timestamps, and usage patterns collected through cookies, pixel tags, and similar technologies.
            </li>
            <li>
              <span className="list-title">Service Usage Data:</span> Interactions with our platform, feature utilization, preference settings, and engagement metrics to optimize user experience.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">4.</span> Processing and Use of Your Data</h2>
          <p>We process your information for the following specified purposes:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">Service Provision and Improvement:</span> To deliver, maintain, and enhance our core functionalities, including data integration, analysis, visualization, and personalized insights.
            </li>
            <li>
              <span className="list-title">Advanced Analytics:</span> To perform statistical analysis, trend identification, and pattern recognition to generate insights about your health, performance, and recovery metrics.
            </li>
            <li>
              <span className="list-title">Personalization:</span> To develop and deliver tailored recommendations, interventions, and content based on your unique physiological profile, goals, and activity patterns.
            </li>
            <li>
              <span className="list-title">Research and Development:</span> To improve our algorithms, enhance prediction accuracy, and develop new features with aggregated, pseudonymized data.
            </li>
            <li>
              <span className="list-title">Security and Fraud Prevention:</span> To detect, prevent, and address technical issues, unauthorized access, and potentially prohibited or illegal activities.
            </li>
            <li>
              <span className="list-title">Compliance and Legal Obligations:</span> To comply with applicable laws, regulations, legal processes, or enforceable governmental requests.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">5.</span> Data Sharing and Disclosure</h2>
          <p>We limit the sharing of your information to specific circumstances:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">Third-Party Integrations:</span> With your explicit permission, we may exchange data with wearable devices, fitness applications, and health platforms you choose to connect with our Services.
            </li>
            <li>
              <span className="list-title">Service Providers:</span> With authorized vendors, consultants, and other service providers who require access to perform specific functions on our behalf under contractual data protection obligations.
            </li>
            <li>
              <span className="list-title">Business Transfers:</span> In connection with a corporate transaction, such as a merger, acquisition, or sale of assets, where your information may be transferred as a business asset, subject to this Policy.
            </li>
            <li>
              <span className="list-title">Legal Requirements:</span> When required to comply with applicable laws, court orders, governmental regulations, or other legal processes, or to protect our rights, privacy, safety, or property, or that of our users.
            </li>
            <li>
              <span className="list-title">Aggregate or De-identified Information:</span> We may share anonymized, aggregated, or de-identified information that cannot reasonably be used to identify you for research, analytics, or industry benchmarking.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">6.</span> Data Security and Retention</h2>
          <p>We implement comprehensive technical, administrative, and physical safeguards:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">End-to-End Encryption:</span> All biometric and health data is encrypted during transmission and storage using industry-standard protocols and algorithms.
            </li>
            <li>
              <span className="list-title">Access Controls:</span> Strict role-based access controls limit data access to authorized personnel for specific, legitimate purposes.
            </li>
            <li>
              <span className="list-title">Security Monitoring:</span> Continuous security monitoring, vulnerability testing, and intrusion detection systems to identify and address potential threats.
            </li>
            <li>
              <span className="list-title">Data Retention:</span> We retain your information only for as long as necessary to fulfill the purposes outlined in this Policy, unless a longer retention period is required or permitted by law. You may request deletion of your data at any time, subject to legal and regulatory requirements.
            </li>
            <li>
              <span className="list-title">Breach Notification:</span> In the event of a data breach that compromises your personal information, we will notify you and relevant authorities as required by applicable laws.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">7.</span> Your Rights and Choices</h2>
          <p>Depending on your jurisdiction, you may have the following rights regarding your data:</p>
          <ul className="policy-list">
            <li>
              <span className="list-title">Access and Portability:</span> The right to access, receive, and transfer your personal information in a structured, commonly used, and machine-readable format.
            </li>
            <li>
              <span className="list-title">Rectification:</span> The right to correct inaccurate or incomplete personal information.
            </li>
            <li>
              <span className="list-title">Restriction and Objection:</span> The right to restrict or object to certain processing of your personal information.
            </li>
            <li>
              <span className="list-title">Consent Withdrawal:</span> The right to withdraw your consent at any time, without affecting the lawfulness of processing based on consent before its withdrawal.
            </li>
            <li>
              <span className="list-title">Deletion:</span> The right to request the deletion of your personal information, subject to certain exceptions required by law.
            </li>
            <li>
              <span className="list-title">Complaint:</span> The right to lodge a complaint with a supervisory authority if you believe your rights have been violated.
            </li>
          </ul>
          <p>To exercise these rights, please contact us using the information provided in Section 10.</p>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">8.</span> International Data Transfers</h2>
          <p>
            Your information may be transferred to, stored, and processed in countries other than your country of residence. 
            When we transfer personal information across borders, we implement appropriate safeguards in compliance with 
            applicable data protection laws, including Standard Contractual Clauses approved by relevant regulatory authorities, 
            to ensure your data receives an adequate level of protection.
          </p>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">9.</span> Changes to This Privacy Policy</h2>
          <p>
            We may modify this Policy from time to time to reflect changes in our practices or legal requirements. 
            We will notify you of material changes through our Services or by other means, such as email. 
            The date of the most recent revision will appear at the top of this Policy. Your continued use of our 
            Services after such modifications constitutes your acknowledgment and acceptance of the modified Policy.
          </p>
        </section>

        <section className="policy-section">
          <h2><span className="section-number">10.</span> Contact Information</h2>
          <p>
            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Data Protection Officer at
            <a href="mailto:pulseproject@proton.me" className="email-link"> pulseproject@proton.me</a> or write to us at:
          </p>
          <p>
            Pulse Project LLC<br />
            Charlottesville, VA 22903<br />
            United States
          </p>
        </section>

        <div className="policy-footer">
          <p>By using Pulse Project, you acknowledge that you have read and understood this Privacy Policy and agree to be bound by its terms.</p>
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