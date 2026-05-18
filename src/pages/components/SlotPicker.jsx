import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import api from '../../services/api';

const SlotPicker = ({ doctorId, date, value, onChange, error }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setLoading(true);
      try {
        const res = await api.getAvailableSlots(doctorId, date);
        if (res?.data?.slots) {
          setSlots(res.data.slots);
        } else {
          setSlots(generateDefaultSlots());
        }
      } catch {
        setSlots(generateDefaultSlots());
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [doctorId, date]);

  const generateDefaultSlots = () => {
    const times = [];
    for (let h = 9; h <= 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 12 && m === 30) continue;
        if (h === 13 && m === 0) continue;
        if (h === 17 && m === 30) break;
        const hour = h.toString().padStart(2, '0');
        const min = m.toString().padStart(2, '0');
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
        times.push({
          id: `${hour}:${min}`,
          time: `${displayH}:${min} ${period}`,
          available: Math.random() > 0.3,
        });
      }
    }
    return times;
  };

  if (!doctorId || !date) {
    return (
      <div>
        <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
          Time Slot <span className="text-error">*</span>
        </label>
        <p className="text-sm text-on-surface-variant py-4">Select a doctor and date first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
          Time Slot <span className="text-error">*</span>
        </label>
        <div className="flex items-center gap-2 py-4 text-on-surface-variant">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-body-md">Loading available slots...</span>
        </div>
      </div>
    );
  }

  const availableSlots = slots.filter(s => s.available);
  const bookedSlots = slots.filter(s => !s.available);

  return (
    <div>
      <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
        Time Slot <span className="text-error">*</span>
      </label>
      {slots.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4">No slots available for this date</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map(slot => (
            <button
              key={slot.id}
              type="button"
              disabled={!slot.available}
              onClick={() => slot.available && onChange(slot.id)}
              className={`px-3 py-2.5 rounded-lg font-body-md text-sm transition-all flex items-center justify-center gap-1.5
                ${!slot.available
                  ? 'bg-surface-container-high text-on-surface-variant/50 line-through cursor-not-allowed'
                  : value === slot.id
                    ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                    : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-secondary hover:bg-secondary/5 cursor-pointer'
                }`}
            >
              <Clock className="w-3 h-3" />
              {slot.time}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="mt-1 font-caption text-error text-xs">{error.message}</p>
      )}
      {availableSlots.length > 0 && (
        <p className="mt-2 font-caption text-on-surface-variant text-xs">
          {availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
};

export default SlotPicker;
