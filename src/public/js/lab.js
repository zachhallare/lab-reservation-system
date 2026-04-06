/* ===== LAB.JS - Lab View Functions ===== */

// ===== LAB VIEW =====
let _seatRefreshInterval = null;

function renderLabView() {
    if (!state.selectedLab) return;

    const lab = state.selectedLab;
    document.getElementById('labViewTitle').textContent = lab.name;
    document.getElementById('labViewDescription').textContent = `${lab.building} - ${lab.floor} | ${lab.description}`;

    renderDateTabs();
    renderTimeSlots();
    renderSeatMap();

    // Show technician controls if user is technician
    const techActions = document.getElementById('technicianActions');
    if (state.currentUser?.role === 'technician') {
        techActions.style.display = 'block';
    } else {
        techActions.style.display = 'none';
    }

    // Periodic auto-refresh of seat availability (every 30 seconds)
    if (_seatRefreshInterval) clearInterval(_seatRefreshInterval);
    _seatRefreshInterval = setInterval(async () => {
        if (state.selectedLab) {
            // Refresh reservations from server
            try {
                const res = await fetch('/api/reservations');
                state.reservations = await res.json();
            } catch (e) { /* ignore */ }
            renderSeatMap();
        } else {
            clearInterval(_seatRefreshInterval);
            _seatRefreshInterval = null;
        }
    }, 30000);
}

function renderDateTabs() {
    const container = document.getElementById('dateTabs');
    container.innerHTML = '';

    const today = new Date();
    const todayStr = toLocalDateStr(today);

    if (!state.selectedDate) {
        let defaultDate = new Date(todayStr + 'T00:00:00');
        if (defaultDate.getDay() === 0) {
            defaultDate.setDate(defaultDate.getDate() + 1);
        }
        state.selectedDate = toLocalDateStr(defaultDate);
    }

    // Keep a consistent 7-day window starting from today
    let startDate = new Date(todayStr + 'T00:00:00');

    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = toLocalDateStr(date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const isSunday = date.getDay() === 0;

        const tab = document.createElement('div');
        tab.dataset.date = dateStr;

        if (isSunday) {
            tab.className = 'date-tab disabled';
        } else {
            tab.className = `date-tab ${dateStr === state.selectedDate ? 'active' : ''}`;
            tab.onclick = () => selectDate(dateStr);
        }

        tab.innerHTML = `<div class="day">${dayName}</div><div class="date">${dayNum}</div>`;
        container.appendChild(tab);
    }
}

function selectDate(dateStr) {
    state.selectedDate = dateStr;
    state.selectedTime = null;
    state.selectedTimes = [];
    state.selectedSeat = null;
    document.getElementById('reservationActions').style.display = 'none';

    // Update active tab highlight manually
    const tabs = document.querySelectorAll('#dateTabs .date-tab');
    tabs.forEach(tab => {
        if (tab.dataset.date === dateStr) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    renderTimeSlots();
    renderSeatMap();
}

function renderTimeSlots() {
    const container = document.getElementById('timeSlots');
    container.innerHTML = '';

    TIME_SLOTS.forEach(time => {
        const slot = document.createElement('div');
        const isSelected = state.selectedTimes.includes(time);
        slot.className = `time-slot ${isSelected ? 'active' : ''}`;

        // Disable past times for today
        const isToday = state.selectedDate === toLocalDateStr(new Date());
        const [hours, mins] = time.split(':').map(Number);
        const now = new Date();
        if (isToday && (hours < now.getHours() || (hours === now.getHours() && mins <= now.getMinutes()))) {
            slot.classList.add('disabled');
        }

        slot.textContent = formatTime(time);
        slot.onclick = () => {
            if (!slot.classList.contains('disabled')) {
                selectTime(time);
            }
        };
        container.appendChild(slot);
    });
}

function selectTime(time) {
    // Toggle time in the selectedTimes array
    const idx = state.selectedTimes.indexOf(time);
    if (idx > -1) {
        state.selectedTimes.splice(idx, 1);
    } else {
        state.selectedTimes.push(time);
    }
    // Keep selectedTime as the first selected (for backward compat & seat map)
    state.selectedTime = state.selectedTimes.length > 0 ? state.selectedTimes[0] : null;
    state.selectedSeat = null;
    document.getElementById('reservationActions').style.display = 'none';
    renderTimeSlots();
    renderSeatMap();
}

function renderSeatMap() {
    const container = document.getElementById('seatMap');
    container.innerHTML = '';

    if (!state.selectedLab || !state.selectedDate || state.selectedTimes.length === 0) return;

    const lab = state.selectedLab;

    for (let i = 1; i <= lab.seats; i++) {
        // Check all selected times for this seat
        const reservationsForSeat = state.selectedTimes.map(t => getReservation(lab.id, i, state.selectedDate, t)).filter(Boolean);
        const firstReservation = reservationsForSeat[0] || null;
        const anyBlocked = reservationsForSeat.some(r => r.isBlocked);
        const anyOccupied = reservationsForSeat.length > 0;

        const seat = document.createElement('div');
        seat.className = 'seat';
        seat.innerHTML = `<span>PC${i}</span>`;

        if (anyBlocked) {
            seat.classList.add('blocked');
            seat.innerHTML += `<div class="seat-tooltip">🚫 Blocked</div>`;
        } else if (anyOccupied) {
            seat.classList.add('occupied');
            const reserver = state.users.find(u => u.id === firstReservation.userId);
            let tooltipContent = firstReservation.anonymous ? 'Reserved (Anonymous)' :
                `Reserved by: <a onclick="event.stopPropagation(); viewUserProfile(${firstReservation.userId})">${reserver?.firstName} ${reserver?.lastName}</a>`;
            if (firstReservation.isWalkIn) tooltipContent = 'Walk-in Reservation';
            const conflictCount = reservationsForSeat.length;
            if (conflictCount < state.selectedTimes.length) {
                tooltipContent += `<br><small>${conflictCount}/${state.selectedTimes.length} slots taken</small>`;
            }
            seat.innerHTML += `<div class="seat-tooltip">${tooltipContent}</div>`;
        }

        if (state.selectedSeat === i) {
            seat.classList.add('selected');
        }

        seat.onclick = () => handleSeatClick(i, firstReservation);
        container.appendChild(seat);
    }
}

function getReservation(labId, seatNumber, date, time) {
    return state.reservations.find(r =>
        r.labId === labId &&
        r.seatNumber === seatNumber &&
        r.date === date &&
        r.time === time
    );
}

function handleSeatClick(seatNumber, existingReservation) {
    if (existingReservation?.isBlocked && state.currentUser?.role !== 'technician') {
        showToast('This seat is blocked', 'warning');
        return;
    }

    state.selectedSeat = seatNumber;
    renderSeatMap();

    // Update reservation info panel — show all selected times
    document.getElementById('selectedSeatInfo').textContent = `PC${seatNumber}`;
    document.getElementById('selectedDateInfo').textContent = formatDate(state.selectedDate);
    const timesDisplay = state.selectedTimes.map(t => formatTime(t)).join(', ');
    document.getElementById('selectedTimeInfo').textContent = timesDisplay;

    const actions = document.getElementById('reservationActions');

    // Check how many of the selected times are available for this seat
    const availableTimes = state.selectedTimes.filter(t => !getReservation(state.selectedLab.id, seatNumber, state.selectedDate, t));
    const ownReservations = state.selectedTimes
        .map(t => getReservation(state.selectedLab.id, seatNumber, state.selectedDate, t))
        .filter(r => r && r.userId === state.currentUser?.id);

    if (existingReservation) {
        if (state.currentUser?.role === 'technician') {
            actions.style.display = 'none';
        } else if (ownReservations.length > 0 && availableTimes.length === 0) {
            actions.querySelector('h3').textContent = '❌ Cancel Reservation';
            actions.querySelector('.btn-primary').textContent = 'Cancel Reservation';
            actions.querySelector('.btn-primary').onclick = () => cancelMyReservation(ownReservations[0]);
            actions.style.display = 'block';
        } else if (availableTimes.length > 0) {
            actions.querySelector('h3').textContent = `📝 Reserve ${availableTimes.length} slot(s)`;
            actions.querySelector('.btn-primary').textContent = 'Confirm';
            actions.querySelector('.btn-primary').onclick = confirmReservation;
            actions.style.display = 'block';
        } else {
            actions.style.display = 'none';
            showToast('This seat is already reserved for all selected times', 'info');
        }
    } else {
        actions.querySelector('h3').textContent = `📝 Reserve ${availableTimes.length} slot(s)`;
        actions.querySelector('.btn-primary').textContent = 'Confirm';
        actions.querySelector('.btn-primary').onclick = confirmReservation;
        actions.style.display = 'block';
    }
}

async function confirmReservation() {
    if (!state.selectedLab || !state.selectedDate || state.selectedTimes.length === 0 || !state.selectedSeat) {
        showToast('Please select time slot(s) and a seat', 'error');
        return;
    }

    const anonymous = document.getElementById('anonymousReservation').checked;
    const groupId = Date.now(); // shared ID to group multi-slot reservations

    // Only reserve available times
    const availableTimes = state.selectedTimes.filter(t =>
        !getReservation(state.selectedLab.id, state.selectedSeat, state.selectedDate, t)
    );

    if (availableTimes.length === 0) {
        showToast('All selected time slots are already taken', 'warning');
        return;
    }

    const newReservations = availableTimes.map((time, idx) => ({
        id: groupId + idx,
        groupId,
        labId: state.selectedLab.id,
        seatNumber: state.selectedSeat,
        userId: state.currentUser.id,
        date: state.selectedDate,
        time,
        anonymous,
        isBlocked: false,
        isWalkIn: false,
        requestedAt: new Date().toISOString(),
    }));

    try {
        await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newReservations)
        });
        // Update local state
        newReservations.forEach(r => state.reservations.push(r));
    } catch (err) {
        showToast('Error saving reservation', 'error');
        return;
    }

    showToast(`${availableTimes.length} slot(s) reserved!`, 'success');
    state.selectedSeat = null;
    document.getElementById('reservationActions').style.display = 'none';
    document.getElementById('anonymousReservation').checked = false;
    renderSeatMap();
    if (typeof updateQuickStats === 'function') updateQuickStats();
}

function cancelSelection() {
    state.selectedSeat = null;
    document.getElementById('reservationActions').style.display = 'none';
    renderSeatMap();
}

function cancelMyReservation(reservation) {
    showModal('Cancel Reservation', 'Are you sure you want to cancel this reservation?', async () => {
        try {
            await fetch(`/api/reservations/${reservation.id}`, { method: 'DELETE' });
            const idx = state.reservations.findIndex(r => r.id === reservation.id);
            if (idx > -1) {
                state.reservations.splice(idx, 1);
            }
            showToast('Reservation cancelled', 'success');
            state.selectedSeat = null;
            document.getElementById('reservationActions').style.display = 'none';
            renderSeatMap();
        } catch (err) {
            showToast('Error cancelling reservation', 'error');
        }
    });
}

// ===== TECHNICIAN FUNCTIONS =====
async function blockSelectedSlot() {
    if (!state.selectedSeat) {
        showToast('Please select a seat first', 'warning');
        return;
    }

    const existing = getReservation(state.selectedLab.id, state.selectedSeat, state.selectedDate, state.selectedTime);
    if (existing) {
        showToast('This slot is already reserved/blocked', 'warning');
        return;
    }

    const blockReservation = {
        id: Date.now(),
        labId: state.selectedLab.id,
        seatNumber: state.selectedSeat,
        userId: state.currentUser.id,
        date: state.selectedDate,
        time: state.selectedTime,
        anonymous: false,
        isBlocked: true,
        isWalkIn: false,
        requestedAt: new Date().toISOString(),
    };

    try {
        await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([blockReservation])
        });
        state.reservations.push(blockReservation);
    } catch (err) {
        showToast('Error blocking slot', 'error');
        return;
    }

    showToast('Slot blocked successfully', 'success');
    state.selectedSeat = null;
    renderSeatMap();
}

async function reserveForWalkIn() {
    if (!state.selectedSeat) {
        showToast('Please select a seat first', 'warning');
        return;
    }

    const existing = getReservation(state.selectedLab.id, state.selectedSeat, state.selectedDate, state.selectedTime);
    if (existing) {
        showToast('This slot is already reserved', 'warning');
        return;
    }

    const walkInReservation = {
        id: Date.now(),
        labId: state.selectedLab.id,
        seatNumber: state.selectedSeat,
        userId: state.currentUser.id,
        date: state.selectedDate,
        time: state.selectedTime,
        anonymous: false,
        isBlocked: false,
        isWalkIn: true,
        requestedAt: new Date().toISOString(),
    };

    try {
        await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([walkInReservation])
        });
        state.reservations.push(walkInReservation);
    } catch (err) {
        showToast('Error creating walk-in reservation', 'error');
        return;
    }

    showToast('Walk-in reservation created', 'success');
    state.selectedSeat = null;
    renderSeatMap();
}

function deleteReservation() {
    if (!state.selectedSeat) {
        showToast('Please select a reserved seat', 'warning');
        return;
    }

    const reservation = getReservation(state.selectedLab.id, state.selectedSeat, state.selectedDate, state.selectedTime);
    if (!reservation) {
        showToast('No reservation found for this seat', 'warning');
        return;
    }

    // Check if within 10 minutes of start time
    const now = new Date();
    const reservationDateTime = new Date(`${reservation.date}T${reservation.time}`);
    const diffMinutes = (reservationDateTime - now) / (1000 * 60);

    if (diffMinutes > 10 && !reservation.isBlocked) {
        showToast('Can only delete reservations within 10 minutes of start time', 'warning');
        return;
    }

    showModal('Delete Reservation', 'Are you sure you want to delete this reservation?', async () => {
        try {
            await fetch(`/api/reservations/${reservation.id}`, { method: 'DELETE' });
            const idx = state.reservations.findIndex(r => r.id === reservation.id);
            if (idx > -1) {
                state.reservations.splice(idx, 1);
            }
            showToast('Reservation deleted', 'success');
            state.selectedSeat = null;
            renderSeatMap();
        } catch (err) {
            showToast('Error deleting reservation', 'error');
        }
    });
}
