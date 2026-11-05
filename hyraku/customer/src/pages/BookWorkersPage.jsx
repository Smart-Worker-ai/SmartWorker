import { useNavigate } from 'react-router-dom';
import { WorkerTeamSelector } from '../components/booking/WorkerTeamSelector';
import { useBooking } from '../context/BookingContext.jsx';

export default function BookWorkersPage() {
  const navigate = useNavigate();
  const {
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    crewCounts,
    updateCrewCount,
    setCrewCount,
    setTeamPreset,
    availabilityLoaded,
    availableFor,
    catalogCategories,
  } = useBooking();

  return (
    <WorkerTeamSelector
      selectedCategory={selectedCategoryFilter}
      onSelectCategoryFilter={setSelectedCategoryFilter}
      crewCounts={crewCounts}
      onUpdateCrewCount={updateCrewCount}
      onSetCrewCount={setCrewCount}
      onSetTeamPreset={setTeamPreset}
      availabilityLoaded={availabilityLoaded}
      availableFor={availableFor}
      catalogCategories={catalogCategories}
      onBack={() => {
        navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onProceedToDates={() => {
        navigate('/book/details');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      selectedCity="Kozhikode"
    />
  );
}
