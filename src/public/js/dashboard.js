/* ===== DASHBOARD.JS - Dashboard Functions ===== */

// ===== DASHBOARD =====
function renderDashboard() {
    document.getElementById('dashboardUserName').textContent = state.currentUser?.firstName || 'User';
    populateLabFilter();
    applyFilters();
}

function renderLabCards(labsToRender = state.labs, date = null, time = null) {
    const grid = document.getElementById('labsGrid');
    grid.innerHTML = '';
    
    if (labsToRender.length === 0) {
        grid.innerHTML = '<div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">No labs match your filters.</div>';
        return;
    }

    labsToRender.forEach(lab => {
        const available = countAvailableSeats(lab.id, date, time);
        const card = document.createElement('div');
        card.className = 'lab-card';
        card.onclick = () => navigateTo('labView', lab);

        card.innerHTML = `
            <div class="lab-card-header">
                <h3>${lab.name}</h3>
                <p>${lab.building} - ${lab.floor}</p>
            </div>
            <div class="lab-card-body">
                <p>${lab.description}</p>
                <div class="lab-stats">
                    <div class="lab-stat">
                        <div class="lab-stat-value">${lab.seats}</div>
                        <div class="lab-stat-label">Total Seats</div>
                    </div>
                    <div class="lab-stat">
                        <div class="lab-stat-value">${available}</div>
                        <div class="lab-stat-label">Available Now</div>
                    </div>
                </div>
            </div>
            <div class="lab-card-footer">
                <button class="btn btn-primary btn-full">View Lab →</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function countAvailableSeats(labId, date, time) {
    if (!date) date = new Date().toISOString().split('T')[0];
    if (!time) {
        const currentHour = new Date().getHours();
        time = `${currentHour.toString().padStart(2, '0')}:00`;
    }

    const lab = state.labs.find(l => l.id === labId);
    if (!lab) return 0;

    const reserved = state.reservations.filter(r =>
        r.labId === labId && r.date === date && r.time === time
    ).length;

    return lab.seats - reserved;
}

function updateQuickStats(filteredLabs = state.labs, date = null, time = null) {
    const userReservations = state.reservations.filter(r =>
        r.userId === state.currentUser?.id &&
        new Date(r.date) >= new Date(new Date().toDateString())
    );
    document.getElementById('activeReservations').textContent = userReservations.length;

    let totalAvailable = 0;
    filteredLabs.forEach(lab => {
        totalAvailable += countAvailableSeats(lab.id, date, time);
    });
    document.getElementById('availableSlots').textContent = totalAvailable;
}

function populateLabFilter() {
    const select = document.getElementById('filterTime');
    select.innerHTML = '';
    TIME_SLOTS.forEach(time => {
        select.innerHTML += `<option value="${time}">${formatTime(time)}</option>`;
    });
}



function applyFilters() {
    const search = document.getElementById('filterSearch').value.toLowerCase();
    const date = document.getElementById('filterDate').value;
    const time = document.getElementById('filterTime').value;
    const minCapacity = parseInt(document.getElementById('filterCapacity').value) || 0;
    const availability = document.getElementById('filterAvailability').value; // 'all', 'available', 'fully_booked'

    const filteredLabs = state.labs.filter(lab => {
        // 1. Search filter
        const matchesSearch = !search || 
            lab.name.toLowerCase().includes(search) || 
            lab.building.toLowerCase().includes(search) ||
            lab.description.toLowerCase().includes(search);
            
        if (!matchesSearch) return false;

        // 2. Capacity filter
        if (lab.seats < minCapacity) return false;

        // 3. Date, Time, and Availability filters combined
        if (availability !== 'all' || (date && time)) {
            let availableSeats = countAvailableSeats(lab.id, date, time);

            if (availability === 'available' && availableSeats === 0) return false;
            if (availability === 'fully_booked' && availableSeats > 0) return false;
        }

        return true;
    });

    renderLabCards(filteredLabs, date, time);
    updateQuickStats(filteredLabs, date, time);
    
    // Save selected date/time to state if provided so calendar picks it up
    if (date) state.selectedDate = date;
    if (time) state.selectedTime = time;
}

function clearFilters() {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterDate').value = toLocalDateStr(new Date());
    document.getElementById('filterTime').value = TIME_SLOTS[0];
    document.getElementById('filterCapacity').value = '';
    document.getElementById('filterAvailability').value = 'all';
    
    applyFilters();
}
