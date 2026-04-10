/* ===== RESERVATIONS.JS - Reservations Page Functions ===== */

// ===== RESERVATIONS PAGE =====
function renderReservations(tab) {
    const container = document.getElementById('reservationsList');
    const today = new Date(new Date().toDateString());

    let userReservations = state.reservations.filter(r => r.userId === state.currentUser?.id);

    // For technicians, also show all reservations they can manage
    const isTech = state.currentUser?.role === 'technician';

    if (tab === 'upcoming') {
        userReservations = userReservations.filter(r => new Date(r.date) >= today);
    } else {
        userReservations = userReservations.filter(r => new Date(r.date) < today);
    }

    userReservations.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

    // Group reservations by groupId (multi-slot) or treat as individual
    const groups = [];
    const seen = new Set();

    userReservations.forEach(r => {
        if (seen.has(r.id)) return;

        if (r.groupId) {
            // Find all reservations in this group
            const groupMembers = userReservations.filter(gr => gr.groupId === r.groupId);
            groupMembers.forEach(gm => seen.add(gm.id));
            groups.push(groupMembers);
        } else {
            seen.add(r.id);
            groups.push([r]);
        }
    });

    if (groups.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <h3>No ${tab} reservations</h3>
                <p>Your ${tab} reservations will appear here.</p>
                ${tab === 'upcoming' ? '<button class="btn btn-primary" onclick="window.location.href=\'/dashboard\'">Browse Labs</button>' : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = groups.map(group => {
        const r = group[0]; // representative reservation
        const lab = state.labs.find(l => l.id === r.labId);
        const times = group.map(gr => formatTime(gr.time)).join(', ');
        const ids = group.map(gr => gr.id);

        return `
            <div class="reservation-card">
                <div class="reservation-info">
                    <h4>${lab?.name || 'Unknown Lab'} - PC${r.seatNumber}</h4>
                    <p>${lab?.building} - ${lab?.floor}</p>
                </div>
                <div class="reservation-meta">
                    <span>📅 ${formatDate(r.date)}</span>
                    <span>⏰ ${times}</span>
                    <span>${r.anonymous ? '🔒 Anonymous' : '👤 Non-Anonymous'}</span>
                    ${r.requestedAt ? `<span>📝 Requested: ${new Date(r.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(r.requestedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>` : ''}
                </div>
                ${tab === 'upcoming' ? `
                    <div class="action-buttons">
                        <button class="btn btn-secondary" onclick="toggleAnonymousGroup([${ids}])">${r.anonymous ? '👤 Set Non-Anonymous' : '🔒 Set Anonymous'}</button>
                        <button class="btn btn-primary" onclick="editReservationGroup([${ids}])">✏️ Edit</button>
                        <button class="btn btn-danger" onclick="cancelReservationGroup([${ids}])">Cancel</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function switchReservationTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderReservations(tab);
}

function cancelReservationById(id) {
    cancelReservationGroup([id]);
}

function cancelReservationGroup(ids) {
    const count = ids.length;
    showModal('Cancel Reservation', `Are you sure you want to cancel ${count > 1 ? 'these ' + count + ' slots' : 'this reservation'}?`, async () => {
        try {
            await fetch('/api/reservations/delete-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            state.reservations = state.reservations.filter(r => !ids.includes(r.id));
            showToast('Reservation cancelled', 'success');
            renderReservations('upcoming');
        } catch (err) {
            showToast('Error cancelling reservation', 'error');
        }
    });
}

function toggleAnonymous(id) {
    toggleAnonymousGroup([id]);
}

async function toggleAnonymousGroup(ids) {
    const reservations = state.reservations.filter(r => ids.includes(r.id));
    if (reservations.length === 0) return;

    // Toggle based on first reservation's current state
    const newAnon = !reservations[0].anonymous;

    try {
        await fetch('/api/reservations/toggle-anonymous', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, anonymous: newAnon })
        });
        reservations.forEach(r => {
            if (r.userId === state.currentUser?.id || state.currentUser?.role === 'technician') {
                r.anonymous = newAnon;
            }
        });
    } catch (err) {
        showToast('Error updating reservation', 'error');
        return;
    }

    showToast(newAnon ? 'Reservation set to Anonymous' : 'Reservation set to Non-Anonymous', 'success');
    renderReservations('upcoming');
}

function editReservationGroup(ids) {
    const reservations = state.reservations.filter(r => ids.includes(r.id));
    if (reservations.length === 0) return;

    const r = reservations[0];
    const lab = state.labs.find(l => l.id === r.labId);
    if (!lab) return;

    // Show edit modal
    const times = reservations.map(gr => gr.time);
    const modal = document.getElementById('editReservationModal');

    if (!modal) {
        // Fallback: navigate to lab view pre-loaded
        state.selectedLab = lab;
        state.selectedDate = r.date;
        state.selectedTimes = times;
        state.selectedTime = times[0];
        window.location.href = '/dashboard';
        return;
    }

    // Populate edit modal
    const editResDate = document.getElementById('editResDate');
    editResDate.min = new Date().toISOString().split('T')[0];
    editResDate.value = r.date;
    document.getElementById('editResSeat').value = r.seatNumber;

    // Populate time checkboxes
    const timeContainer = document.getElementById('editResTimeSlots');
    timeContainer.innerHTML = TIME_SLOTS.map(time => `
        <label class="time-check">
            <input type="checkbox" value="${time}" ${times.includes(time) ? 'checked' : ''}>
            ${formatTime(time)}
        </label>
    `).join('');

    // Populate lab seats
    document.getElementById('editResLabName').textContent = lab.name;

    // Store edit context
    modal._editIds = ids;
    modal._labId = lab.id;
    modal._originalTimes = times;
    modal.style.display = 'flex';
}

function closeEditModal() {
    const modal = document.getElementById('editReservationModal');
    if (modal) modal.style.display = 'none';
}

async function saveEditReservation() {
    const modal = document.getElementById('editReservationModal');
    if (!modal) return;

    const ids = modal._editIds;
    const labId = modal._labId;
    const newDate = document.getElementById('editResDate').value;
    const newSeat = parseInt(document.getElementById('editResSeat').value);

    // Get selected times from checkboxes
    const checked = document.querySelectorAll('#editResTimeSlots input:checked');
    const newTimes = Array.from(checked).map(cb => cb.value);

    if (!newDate || !newSeat || newTimes.length === 0) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    // Check for conflicts (exclude the reservations being edited)
    const conflicts = newTimes.filter(time => {
        const existing = state.reservations.find(r =>
            r.labId === labId &&
            r.seatNumber === newSeat &&
            r.date === newDate &&
            r.time === time &&
            !ids.includes(r.id)
        );
        return existing;
    });

    if (conflicts.length > 0) {
        showToast(`${conflicts.length} time slot(s) conflict with existing reservations`, 'warning');
        return;
    }

    // Remove old reservations from server
    try {
        await fetch('/api/reservations/delete-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
    } catch (err) {
        showToast('Error updating reservation', 'error');
        return;
    }

    // Remove old reservations from local state
    state.reservations = state.reservations.filter(r => !ids.includes(r.id));

    // Create updated reservations
    const groupId = Date.now();

    const newReservations = newTimes.map((time, idx) => ({
        id: groupId + idx,
        groupId: newTimes.length > 1 ? groupId : undefined,
        labId,
        seatNumber: newSeat,
        userId: state.currentUser.id,
        date: newDate,
        time,
        anonymous: false,
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
        newReservations.forEach(r => state.reservations.push(r));
    } catch (err) {
        showToast('Error saving reservation', 'error');
        return;
    }

    closeEditModal();
    showToast('Reservation updated!', 'success');
    renderReservations('upcoming');
}
