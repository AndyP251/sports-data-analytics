import React from 'react';

const RobotsText = () => {
  React.useEffect(() => {
    // Create the robots.txt content
    const content = `User-agent: *
Disallow: /
Allow: /api/verify-dev-password/`;

    // Create a text response and serve it directly
    const response = new Response(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'inline; filename="robots.txt"'
      }
    });

    // Convert response to blob and create URL
    response.blob().then(blob => {
      const url = window.URL.createObjectURL(blob);
      window.location.href = url;
      // Clean up the URL after navigation
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    });
  }, []);

  return null;
};

export default RobotsText; 