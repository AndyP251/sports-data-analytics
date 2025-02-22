import React from 'react';
import { Button } from '@mui/material';

const WhoopConnect: React.FC = () => {
  const handleConnect = () => {
    // Redirect to Django OAuth endpoint
    window.location.href = '/api/oauth/whoop/authorize';
  };

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleConnect}
      fullWidth
    >
      Connect WHOOP Account
    </Button>
  );
};

export default WhoopConnect; 