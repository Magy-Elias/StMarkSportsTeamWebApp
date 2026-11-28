import RegistrationForm from '@/components/RegistrationForm';

// Public: anyone can submit a new event (no login, see proxy.ts).
export default function EventRegistration() {
  return <RegistrationForm />;
}
