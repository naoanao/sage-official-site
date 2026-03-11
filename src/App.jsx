import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import SageOS from './pages/SageOS'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import ThankYou from './pages/ThankYou'
import Shop from './pages/Shop'
import SalesPage from './pages/SalesPage'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<SageOS />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </Router>
  )
}

export default App
