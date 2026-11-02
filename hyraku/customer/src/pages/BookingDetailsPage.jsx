import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookingDetailsForm } from '../components/booking/BookingDetailsForm';
import { BookingSuccessModal } from '../components/booking/BookingSuccessModal';
import { buildWhatsAppMessage, openHyrakuWhatsApp, persistHyrakuEnquiry, useBooking } from '../context/BookingContext.jsx';

export default function BookingDetailsPage() {
  const navigate = useNavigate();
  const { crewCounts, selectedCategoryFilter, totalWorkers } = useBooking();
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState('');
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [activeWhatsappUrl, setActiveWhatsappUrl] = useState('');

  if (totalWorkers === 0) {
    return <Navigate to="/book" replace />;
  }

  async function handleBookingSubmit(bookingData) {
    const { refCode, message, whatsappUrl } = buildWhatsAppMessage(bookingData, crewCounts);
    const dates = bookingData.selectedDatesList?.length
      ? bookingData.selectedDatesList.join(', ')
      : (bookingData.bookingDate || '');
    await persistHyrakuEnquiry({
      source: 'booking',
      ref_code: refCode,
      customer_name: bookingData.customerName,
      phone: bookingData.mobileNumber,
      town: bookingData.town || '',
      locality: bookingData.locality || '',
      work_dates: dates,
      crew_summary: message,
      crew_json: crewCounts,
      message,
    });
    setConfirmedBookingId(refCode);
    setConfirmedBookingData(bookingData);
    setActiveWhatsappUrl(whatsappUrl);
    setIsSuccessOpen(true);
    openHyrakuWhatsApp(message);
  }

  return (
    <>
      <BookingDetailsForm
        crewCounts={crewCounts}
        selectedCategory={selectedCategoryFilter}
        onBack={() => {
          navigate('/book');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSubmitBooking={handleBookingSubmit}
      />
      {isSuccessOpen && (
        <BookingSuccessModal
          bookingId={confirmedBookingId}
          bookingData={confirmedBookingData}
          whatsappUrl={activeWhatsappUrl}
          onClose={() => setIsSuccessOpen(false)}
          onNavigateHome={() => {
            setIsSuccessOpen(false);
            navigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </>
  );
}
