import React, {useState,useEffect} from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import AddServicePage from './Components/AddServicePage';
import './App.css';
import HomePage from './Components/HomePage';
import LoginSignup from './Components/loginSignup'
import ServiceDetails from './Components/ServiceDetails';

function App() {

const [isLoggedIn, setIsLoggedIn] = useState(false);

useEffect(() => {
  const token = localStorage.getItem('auth-token');
  if (token) {
    setIsLoggedIn(true);
  }
}, []);

const handleLogin = () => {
  setIsLoggedIn(true);
};  

const handleLogout = () => {
  localStorage.removeItem('auth-token');
  setIsLoggedIn(false);
};
  
return (
    <Router>
      <div className="app-container">
        <Routes>
            <Route path="/home" element={<HomePage isLoggedIn={isLoggedIn} handleLogout={handleLogout} />} />
            <Route path="/add-service" element={isLoggedIn ? <AddServicePage /> : <Navigate to="/" />} />
            <Route path="/" element={<HomePage isLoggedIn={isLoggedIn} handleLogout={handleLogout}/>} />
            <Route path="*" element={<Navigate to="/" />} />
            <Route path="/login" element={<LoginSignup handleLogin={handleLogin}/>} />
            <Route path="/service/:id" element={<ServiceDetails />} />
          </Routes>
      </div>
    </Router>
  );
}

export default App;
