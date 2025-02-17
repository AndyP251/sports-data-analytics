import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivacyPolicy from './pages/PrivacyPolicy';

function App() {
  return (
    <Router>
      <Routes>
        {/* ... other routes ... */}
        <path path="/privacy-policy" element={<PrivacyPolicy />} />
      </Routes>
    </Router>
  );
}

export default App; 