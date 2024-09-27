const generateTimeSlots = (
  duration: number
): { start_time: string; end_time: string }[] => {
  const slots = [];

  for (let i = 0; i < 24; i++) {
    const start_time = `${i.toString().padStart(2, "0")}:00`;
    const end_time = `${(i + duration).toString().padStart(2, "0")}:00`;

    // Ensure end time doesn't go beyond 24:00
    if (i + duration <= 24) {
      slots.push({
        start_time,
        end_time,
      });
    }
  }

  return slots;
};

// Example: Generate 1-hour slots
const availableSlots = generateTimeSlots(1);
console.log(availableSlots);
