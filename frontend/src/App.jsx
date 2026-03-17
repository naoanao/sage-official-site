import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import BlogPost from './pages/BlogPost'
import AccessCockpit from './pages/AccessCockpit'
import Builder from './pages/Builder'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                {/* /dashboard: Cockpit runs locally — guide users to purchase/setup */}
                <Route path="/dashboard" element={<AccessCockpit />} />
                {/* /builder: AI Code Builder tool (runs locally on port 3001) */}
                <Route path="/builder" element={<Builder />} />
                {/* Catch-all: send back to landing */}
                <Route path="*" element={<Landing />} />
            </Routes>
        </Router>
    )
}

export default App
