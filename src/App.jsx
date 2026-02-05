import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import ThankYou from './pages/ThankYou'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/thank-you" element={<ThankYou />} />
      </Routes>
    </Router>
  )
}

export default App
