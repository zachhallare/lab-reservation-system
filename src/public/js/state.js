/* ===== STATE.JS - Application State Management ===== */

// ===== STATE =====
let state = {
    currentUser: null,
    currentPage: 'login',
    users: [],
    labs: [],
    reservations: [],
    selectedLab: null,
    selectedDate: null,
    selectedTime: null,
    selectedTimes: [],
    selectedSeat: null,
    previousPage: null,
};

async function initializeData() {
    try {
        const [usersRes, labsRes, reservationsRes] = await Promise.all([
            fetch('/api/users'),
            fetch('/api/labs'),
            fetch('/api/reservations')
        ]);
        state.users = await usersRes.json();
        state.labs = await labsRes.json();
        state.reservations = await reservationsRes.json();
    } catch (err) {
        console.error('Error loading data from server:', err);
        state.users = [];
        state.labs = [];
        state.reservations = [];
    }
}

// saveData is now a no-op — individual API calls handle persistence
function saveData() {
    // Data is saved via API calls, this function is kept for backward compatibility
}
