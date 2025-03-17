# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Frontend Routing Documentation

## Overview

This document explains how routing works in the Pulse Project frontend application, including both local development and production environments. The frontend is a React single-page application (SPA) that uses client-side routing, while the backend is a separate Django application.

## Architecture

- **Frontend**: React application with React Router for client-side routing
- **Backend**: Django API that serves data through `/api` endpoints
- **Deployment**: Separate services on DigitalOcean App Platform
  - Frontend service handles `/` routes (serving the React app)
  - Backend service handles `/api` routes (serving the Django API)

## Client-Side Routing Challenges

SPAs like this React application face a common issue: the web server needs to serve the `index.html` file for all routes that the client-side router handles. Without proper configuration, direct navigation to URLs like `/dashboard` or `/profile` will fail in production because the server looks for physical files at those paths rather than serving the SPA's `index.html`.

## Implementation Details

### Local Development

In local development, routing works seamlessly due to:

1. **Vite's `historyApiFallback`**: Configured in `vite.config.js` to serve `index.html` for all 404s
   ```javascript
   server: {
     // Enable history API fallback to support client-side routing
     historyApiFallback: true,
   }
   ```

2. **Django Integration**: The build outputs to `../athlete_platform/staticfiles`, allowing Django to serve the frontend in development.
   ```javascript
   // Set output directory based on environment
   const outDir = isDeployment ? 'dist' : '../athlete_platform/staticfiles'
   ```

### Production Environment

For production on DigitalOcean App Platform, we've implemented multiple failsafe solutions to ensure client-side routing works correctly:

#### 1. _redirects File

Located in `public/_redirects`, this file instructs the server to return the `index.html` for any route:

```
/* /index.html 200
```

#### 2. netlify.toml Configuration

Located at the root level, this provides similar functionality as the _redirects file but in TOML format:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 3. 404.html with Redirect Logic

Located in `public/404.html`, this file is served when the server can't find a requested path. It:
- Stores the requested URL path in `sessionStorage`
- Redirects the user to the application root

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    // Store the URL path to sessionStorage
    sessionStorage.setItem('redirectPath', window.location.pathname + window.location.search);
    // Redirect to the root
    window.location.href = '/';
  </script>
</head>
<body>
  <p>Redirecting to homepage...</p>
</body>
</html>
```

#### 4. Index.html Restore Logic

The main `index.html` contains JavaScript that:
- Checks for a stored redirect path when the app loads
- If found, uses `history.replaceState` to update the URL without a page refresh
- This allows React Router to correctly render the appropriate component

```html
<script>
  // Check if we have a redirect path stored
  (function() {
    var redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath) {
      // Clear the stored path
      sessionStorage.removeItem('redirectPath');
      // Update the browser history without triggering a page reload
      if (history && history.replaceState) {
        history.replaceState(null, null, redirectPath);
      }
    }
  })();
</script>
```

#### 5. API Request Handling

API requests (to `/api/*` endpoints) are handled separately:

- In development, Vite's proxy forwards these requests to the Django backend:
  ```javascript
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL || 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
    }
  }
  ```

- In production, the DigitalOcean App Platform routes `/api` requests to the backend service.

## Build Configuration

The project uses a custom build configuration to handle both development and production environments:

```javascript
// Determine if we're in a deployment environment
const isProduction = process.env.NODE_ENV === 'production'
const isDeployment = process.env.DO_APP_PLATFORM === 'true'

// Set output directory based on environment
const outDir = isDeployment ? 'dist' : '../athlete_platform/staticfiles'
```

For production builds, we use `build:prod` script which sets the necessary environment variables:

```json
"build:prod": "npm install && DO_APP_PLATFORM=true NODE_ENV=production vite build"
```

## How the Redirect Flow Works

1. User directly enters a URL like `https://pulse-project.net/dashboard`
2. If DigitalOcean can't find a physical file at `/dashboard`, it serves the 404.html
3. 404.html stores `/dashboard` in sessionStorage and redirects to `/`
4. The server serves index.html for the root path
5. The script in index.html detects the stored path and updates the URL to `/dashboard`
6. React Router sees the path `/dashboard` and renders the appropriate component

## Maintenance Considerations

When updating the application, be aware of these important files:

1. `public/_redirects` - Critical for server-side routing
2. `netlify.toml` - Backup routing configuration
3. `public/404.html` - Handles missing routes
4. `index.html` - Contains URL restoration logic
5. `vite.config.js` - Contains development/production path configurations

If you add new routes to React Router, no additional configuration is needed - these mechanisms will automatically handle them.

## Troubleshooting

If routing issues occur:

1. Verify that all files (`_redirects`, `netlify.toml`, `404.html`) are being included in the production build
2. Check that the script in `index.html` is executing properly
3. Ensure the DigitalOcean App Platform configuration has the correct routes set up
   - Frontend service handling `/`
   - Backend service handling `/api`

## Conclusion

This multi-layered approach ensures that client-side routing works correctly in both development and production environments, providing a seamless user experience regardless of how users navigate to different parts of the application.
