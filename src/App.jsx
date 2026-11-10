import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import EventDetail from './pages/EventDetail.jsx'
import Form1 from './pages/Form1.jsx'
import Form2 from './pages/Form2.jsx'

export default function App() {
  return (
    <>
      <header className="nav">
        <NavLink to="/" end className="brand" aria-label="ONE99 Sports Team">
          <span className="brand-logo">
            <img src="/logo.svg" alt="ONE99 Sports Team" />
          </span>
        </NavLink>
        <nav>
          <NavLink to="/" end>Calendar</NavLink>
          <NavLink to="/form-1">Form 1</NavLink>
          <NavLink to="/form-2">Form 2</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/form-1" element={<Form1 />} />
          <Route path="/form-2" element={<Form2 />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
