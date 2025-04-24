import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Homepage from './pages/Homepage';
import Dashboard from './pages/Dashboard';
import Review from './pages/LeaveReview';
import Message from './pages/MessageProperty';
import Send from './pages/Send';
import NotFound from './pages/NotFound';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route index element={<Homepage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/review" element={<Review />} />
        <Route path="/message" element={<Message />} />
        <Route path="/send" element={<Send />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
