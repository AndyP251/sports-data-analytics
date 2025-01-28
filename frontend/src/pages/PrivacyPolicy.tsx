import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Data Collection and Usage</h2>
        <p className="mb-4">
          We collect biometric and activity data from WHOOP to help you track and analyze your athletic performance.
          This includes:
        </p>
        <ul className="list-disc pl-8 mb-4">
          <li>Recovery information</li>
          <li>Sleep data</li>
          <li>Workout data</li>
          <li>Physiological metrics</li>
          <li>Profile information</li>
        </ul>
      </section>

      {/* Add more sections as needed */}
    </div>
  );
};

export default PrivacyPolicy; 