import React from 'react';

const WhoopConnect: React.FC = () => {
  const handleConnect = () => {
    // Redirect to Django OAuth endpoint
    window.location.href = '/oauth/whoop/authorize';
  };

  return (
    <button
      onClick={handleConnect}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Connect WHOOP
    </button>
  );
};

export default WhoopConnect; 