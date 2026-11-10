import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Calendar from './pages/Calendar.jsx'
import EventDetail from './pages/EventDetail.jsx'
import Form1 from './pages/Form1.jsx'
import Form2 from './pages/Form2.jsx'
import Pending from './pages/Pending.jsx'
import Sidebar from './components/Sidebar.jsx'

export default function App() {
  return (
    <>
      <Sidebar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/pending" element={<Pending />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/form-1" element={<Form1 />} />
          <Route path="/form-2" element={<Form2 />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
