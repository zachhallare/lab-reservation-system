/* ===== DATA.JS - Constants ===== */

// Generate time slots (7:00 AM to 9:00 PM, 30-min intervals)
const TIME_SLOTS = [];
for (let h = 7; h <= 20; h++) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:30`);
}
