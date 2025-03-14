/**
 * This script copies the built index.html to the root of the staticfiles directory
 * so the Django frontend_view can serve it directly.
 */
import fs from 'fs';
import path from 'path';

// Paths
const buildDir = path.resolve('./dist');
const staticfilesDir = path.resolve('../athlete_platform/staticfiles');
const isDeployment = process.env.DO_APP_PLATFORM === 'true';

// Function to check if we're in a deployment environment where athlete_platform doesn't exist
function isTargetDirectoryAvailable() {
  return fs.existsSync(path.resolve('../athlete_platform')) || 
         fs.existsSync(staticfilesDir);
}

// If we're in deployment and target directory isn't available, exit gracefully
if (isDeployment || !isTargetDirectoryAvailable()) {
  console.log('\x1b[33m%s\x1b[0m', '⚠️ Deployment environment detected or athlete_platform directory not found.');
  console.log('\x1b[33m%s\x1b[0m', '⚠️ Skipping copy operation to athlete_platform/staticfiles.');
  console.log('\x1b[36m%s\x1b[0m', '✨ Build process completed successfully!');
  process.exit(0);
}

// If we reach here, we're in development and should proceed with copying

// Ensure the staticfiles directory exists
if (!fs.existsSync(staticfilesDir)) {
  fs.mkdirSync(staticfilesDir, { recursive: true });
}

// Copy index.html to staticfiles directory
try {
  fs.copyFileSync(
    path.join(buildDir, 'index.html'), 
    path.join(staticfilesDir, 'index.html')
  );
  console.log('\x1b[32m%s\x1b[0m', '✓ Successfully copied index.html to staticfiles directory');
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', `✗ Error copying index.html: ${error.message}`);
  process.exit(1);
}

// Update the index.html to include proper base URL for production
try {
  let indexContent = fs.readFileSync(path.join(staticfilesDir, 'index.html'), 'utf8');
  
  // Add base tag to handle deep linking
  indexContent = indexContent.replace(
    '<head>',
    '<head>\n  <base href="/">'
  );
  
  fs.writeFileSync(path.join(staticfilesDir, 'index.html'), indexContent);
  console.log('\x1b[32m%s\x1b[0m', '✓ Added base href tag to index.html');
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', `✗ Error updating index.html: ${error.message}`);
  process.exit(1);
}

console.log('\x1b[36m%s\x1b[0m', '✨ Build process completed successfully!'); 