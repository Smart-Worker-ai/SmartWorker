import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { ValueProps } from '../components/ValueProps';
import { WorkerCategories } from '../components/WorkerCategories';
import { Footer } from '../components/Footer';
import { AboutModal, ContactModal } from '../components/AboutContactModals';
import { useBooking } from '../context/BookingContext.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const { setSelectedCategoryFilter } = useBooking();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  function startBooking(category = 'all') {
    setSelectedCategoryFilter(category);
    navigate('/book');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div>
      <Hero />
      <ValueProps />
      <WorkerCategories
        onSelectCategory={(catId) => startBooking(catId)}
        onBookWorkers={() => startBooking('all')}
      />
      <Footer
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onStartBooking={() => startBooking('all')}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenContact={() => setIsContactOpen(true)}
      />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}
