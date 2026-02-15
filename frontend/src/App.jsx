import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Register from './pages/Register';
import Login from './pages/Login';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import CreateTask from './pages/CreateTask';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Reviews from './pages/Reviews';
import Subscription from './pages/Subscription';
import Admin from './pages/Admin';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
        <Navbar user={user} onLogout={handleLogout} />
        
        <Routes>
          <Route 
            path="/" 
            element={user ? <Navigate to="/tasks" /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/register" 
            element={!user ? <Register onLogin={handleLogin} /> : <Navigate to="/tasks" />} 
          />
          
          <Route 
            path="/login" 
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/tasks" />} 
          />
          
          <Route 
            path="/tasks" 
            element={user ? <Tasks /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/tasks/:taskId" 
            element={user ? <TaskDetail /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/tasks/create" 
            element={user ? <CreateTask /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/profile" 
            element={user ? <Profile user={user} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/leaderboard" 
            element={user ? <Leaderboard /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/reviews" 
            element={user ? <Reviews user={user} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/subscription" 
            element={user ? <Subscription user={user} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/admin" 
            element={user ? <Admin user={user} /> : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
