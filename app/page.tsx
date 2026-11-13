import Link from 'next/link';
import { ArrowIcon, CalendarIcon, ClockIcon, FormIcon, GamesIcon } from '@/components/icons';

const SECTIONS = [
  { href: '/calendar', title: 'Calendar', text: 'See approved events by month.', Icon: CalendarIcon },
  { href: '/pending', title: 'Events Pending', text: 'Review and approve new events.', Icon: ClockIcon },
  { href: '/form-1', title: 'Form 1', text: 'Create a new event.', Icon: FormIcon },
  { href: '/form-2', title: 'Form 2', text: 'Add the games plan for an event.', Icon: GamesIcon },
];

export default function Home() {
  return (
    <section className="home">
      <div className="hero">
        <img src="/logo.svg" alt="" className="hero-logo" />
        <div>
          <h1>Welcome to ONE99 Sports Team</h1>
          <p>Plan and manage your sports team events.</p>
        </div>
      </div>

      <div className="home-grid">
        {SECTIONS.map(({ href, title, text, Icon }) => (
          <Link key={href} href={href} className="home-card">
            <span className="home-card-icon"><Icon size={24} /></span>
            <h2>{title}</h2>
            <p>{text}</p>
            <span className="home-card-go">Open <ArrowIcon size={16} /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
