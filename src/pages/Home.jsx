import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="home">
      <div className="hero">
        <h1>Welcome to ONE99 Sports Team</h1>
        <p>Plan and manage your sports team events.</p>
      </div>

      <div className="home-grid">
        <Link to="/calendar" className="home-card">
          <span className="home-card-icon">📅</span>
          <h2>Calendar</h2>
          <p>View all approved events by month.</p>
        </Link>
        <Link to="/pending" className="home-card">
          <span className="home-card-icon">⏳</span>
          <h2>Events Pending</h2>
          <p>Review and approve pending events.</p>
        </Link>
        <Link to="/form-1" className="home-card">
          <span className="home-card-icon">📝</span>
          <h2>Form 1</h2>
          <p>Create a new event.</p>
        </Link>
        <Link to="/form-2" className="home-card">
          <span className="home-card-icon">🎮</span>
          <h2>Form 2</h2>
          <p>Add the games plan for an event.</p>
        </Link>
      </div>
    </section>
  )
}
