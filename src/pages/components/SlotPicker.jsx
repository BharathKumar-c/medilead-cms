import { useState, useEffect, useRef } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import api from '../../services/api';

const SlotPicker = ({ doctorId, date, value, onChange, error }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const latestRequestId = useRef(0);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }

    const requestId = ++latestRequestId.current;

    const fetchSlots = async () => {
      setLoading(true);
      try {
        const res = await api.getAvailableSlots(doctorId, date);
        // Ignore stale response if doctor/date changed
        if (requestId !== latestRequestId.current) return;

        if (res?.data?.slots) {
          setSlots(res.data.slots);
        } else {
          setSlots(generateDefaultSlots());
        }
      } catch {
        if (requestId !== latestRequestId.current) return;
        setSlots(generateDefaultSlots());
      } finally {
        if (requestId === latestRequestId.current) {
          setLoading(false);
        }
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

  // Check if a slot is in the past (only when date is today)
  const isPastSlot = (slotId) => {
    if (!date) return false;
    const now = new Date();
    // Use local date components to avoid UTC timezone issues
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (date !== todayStr) return false;

    const [slotH, slotM] = slotId.split(':').map(Number);
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    return slotH < nowH || (slotH === nowH && slotM <= nowM);
  };

  if (!doctorId || !date) {
    return (
      <div>
        <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
          Time Slot <span className="text-error">*</span>
        </label>
        <p className="text-sm text-on-surface-variant py-4">Select a doctor and date first</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
          Time Slot <span className="text-error">*</span>
        </label>
        <div className="flex items-center gap-2 py-4 text-on-surface-variant">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="font-body-sm">Loading available slots...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="block font-caption text-on-surface-variant uppercase mb-1.5">
        Time Slot <span className="text-error">*</span>
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {slots.map(slot => {
          const isPast = isPastSlot(slot.id);
          const isUnavailable = !slot.available || isPast;
          const isSelected = value === slot.id;

          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => !isUnavailable && onChange?.(slot.id)}
              disabled={isUnavailable}
              className={`
                relative px-2 py-2.5 rounded-lg font-data-tabular text-sm transition-all
                ${isSelected
                  ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                  : isPast
                    ? 'bg-surface-container-high text-on-surface-variant/30 cursor-not-allowed'
                    : !slot.available
                      ? 'bg-surface-container-high text-on-surface-variant/30 cursor-not-allowed'
                      : 'bg-surface-container-low text-on-surface hover:bg-secondary/10 hover:text-secondary cursor-pointer'
                }
              `}
            >
              <span className="flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                {slot.time}
              </span>
              {!slot.available && !isPast && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-8 h-px bg-on-surface-variant/20 rotate-[-20deg]" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      {error && (
        <p className="mt-2 font-caption text-error text-xs">{error.message}</p>
      )}
    </div>
  );
};

export default SlotPicker;
