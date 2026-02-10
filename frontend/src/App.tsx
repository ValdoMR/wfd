import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { RenewalRiskPage } from './pages/RenewalRiskPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/properties/:propertyId/renewal-risk"
            element={<RenewalRiskPage />}
          />
          <Route
            path="*"
            element={
              <Navigate
                to="/properties/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/renewal-risk"
                replace
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
