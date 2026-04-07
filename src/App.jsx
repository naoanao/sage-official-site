import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import SageOS from './pages/SageOS'
import SubscriberGate from './pages/SubscriberGate'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import ThankYou from './pages/ThankYou'
import Shop from './pages/Shop'
import SalesPage from './pages/SalesPage'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import StoreManager from './pages/StoreManager'
import ToastContainer from './components/ToastContainer'
import './App.css'

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<SubscriberGate />} />
        <Route path="/dashboard/*" element={<SubscriberGate />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/manager" element={<StoreManager />} />
        <Route path="/automations" element={<Navigate to="/dashboard" state={{ openAutomations: true }} replace />} />
      </Routes>
    </Router>
  )
}

export default App
