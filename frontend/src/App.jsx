import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import BlogPost from './pages/BlogPost'
import AccessCockpit from './pages/AccessCockpit'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                {/* /dashboard: Cockpit runs locally — guide users to purchase/setup */}
                <Route path="/dashboard" element={<AccessCockpit />} />
                {/* Catch-all: send back to landing */}
                <Route path="*" element={<Landing />} />
            </Routes>
        </Router>
    )
}

export default App
