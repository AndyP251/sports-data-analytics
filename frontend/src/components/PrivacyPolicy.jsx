import React from 'react';

function PrivacyPolicy() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <section>
        <h2>1. Information We Collect</h2>
        <p>We collect biometric and fitness data from connected devices and services to provide you with comprehensive health insights.</p>
      </section>

      <section>
        <h2>2. How We Use Your Data</h2>
        <p>Your data is used to generate personalized fitness analytics and recommendations. We do not sell your personal information to third parties.</p>
      </section>

      <section>
        <h2>3. Data Security</h2>
        <p>We implement industry-standard security measures to protect your personal information and maintain data privacy.</p>
      </section>

      <section>
        <h2>4. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us.</p>
      </section>
    </div>
  );
}

export default PrivacyPolicy; 