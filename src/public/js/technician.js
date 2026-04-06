/* ===== TECHNICIAN.JS - Lab Technician Dashboard Functions ===== */

// Cached copy of all reservations for filtering
let allTechReservations = [];

// ===== LOAD RESERVATIONS FROM API =====
async function loadTechReservations() {
    try {
        const res = await fetch('/api/reservations');
        const reservations = await res.json();
        state.reservations = reservations;
    } catch (error) {
        console.error('Error loading reservations:', error);
    }

    // Populate filter dropdowns
    populateLabFilter();
    populateFormDropdowns();

    // Render
    allTechReservations = state.reservations.slice();
    renderTechReservations(allTechReservations);
    updateTechStats(allTechReservations);
}

// ===== POPULATE FILTER DROPDOWNS =====
function populateLabFilter() {
    const select = document.getElementById('techFilterLab');
    if (!select) return;
    // Keep the "All Labs" option, clear the rest
    select.innerHTML = '<option value="">All Labs</option>';
    state.labs.forEach(function (lab) {
        const option = document.createElement('option');
        option.value = lab.id;
        option.textContent = lab.name;
        select.appendChild(option);
    });
}

function populateFormDropdowns() {
    // Student dropdowns (only non-technician users)
    const students = state.users.filter(function (u) { return u.role === 'student'; });
    const studentSelects = ['walkInStudent', 'editTechStudent'];
    studentSelects.forEach(function (selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">-- Select Student --</option>';
        students.forEach(function (user) {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.firstName + ' ' + user.lastName;
            select.appendChild(option);
        });
    });

    // Lab dropdowns
    const labSelects = ['walkInLab', 'editTechLab'];
    labSelects.forEach(function (selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">-- Select Lab --</option>';
        state.labs.forEach(function (lab) {
            const option = document.createElement('option');
            option.value = lab.id;
            option.textContent = lab.name;
            select.appendChild(option);
        });
    });

    // Time slot dropdowns
    const timeSelects = ['walkInTime', 'editTechTime'];
    timeSelects.forEach(function (selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">-- Select Time --</option>';
        TIME_SLOTS.forEach(function (time) {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = formatTime(time);
            select.appendChild(option);
        });
    });

    // Default date to today
    const today = new Date();
    const todayStr = toLocalDateStr(today);
    const walkInDate = document.getElementById('walkInDate');
    if (walkInDate) walkInDate.value = todayStr;
}

// ===== UPDATE STATS CARDS =====
function updateTechStats(reservations) {
    const totalEl = document.getElementById('totalReservations');
    const labsEl = document.getElementById('totalLabs');
    const walkInsEl = document.getElementById('totalWalkIns');

    if (totalEl) totalEl.textContent = reservations.length;
    if (labsEl) {
        const uniqueLabs = new Set(reservations.map(function (r) { return r.labId; }));
        labsEl.textContent = uniqueLabs.size;
    }
    if (walkInsEl) {
        const walkIns = reservations.filter(function (r) { return r.isWalkIn; });
        walkInsEl.textContent = walkIns.length;
    }
}

// ===== RENDER TABLE =====
function renderTechReservations(reservations) {
    const tbody = document.getElementById('techTableBody');
    const emptyState = document.getElementById('techEmptyState');
    const tableWrapper = document.querySelector('.tech-table-scroll');

    if (!tbody) return;

    if (reservations.length === 0) {
        tbody.innerHTML = '';
        if (tableWrapper) tableWrapper.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (tableWrapper) tableWrapper.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    // Sort by reservation date/time descending (newest first)
    reservations.sort(function (a, b) {
        return new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time);
    });

    tbody.innerHTML = reservations.map(function (r) {
        const user = state.users.find(function (u) { return u.id === r.userId; });
        const lab = state.labs.find(function (l) { return l.id === r.labId; });

        const studentName = user
            ? user.firstName + ' ' + user.lastName
            : 'Unknown Student';

        const labName = lab ? lab.name : 'Unknown Lab';

        // Format requested date/time
        let requestedStr = '—';
        if (r.requestedAt) {
            const reqDate = new Date(r.requestedAt);
            requestedStr = reqDate.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            }) + ' ' + reqDate.toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit'
            });
        }

        // Reservation date/time
        const resDateTime = formatDate(r.date) + ' at ' + formatTime(r.time);

        // Type badge
        const typeBadge = r.isWalkIn
            ? '<span class="tech-badge tech-badge-walkin">Walk-in</span>'
            : '<span class="tech-badge tech-badge-online">Online</span>';

        return '<tr>' +
            '<td><a href="/profile?id=' + r.userId + '" class="student-link">' + studentName + '</a></td>' +
            '<td>PC' + r.seatNumber + '</td>' +
            '<td><span class="tech-badge tech-badge-lab">' + labName + '</span></td>' +
            '<td>' + requestedStr + '</td>' +
            '<td>' + resDateTime + '</td>' +
            '<td>' + typeBadge + '</td>' +
            '<td class="tech-actions-cell">' +
                '<button class="btn-icon btn-icon-edit" onclick="editTechReservation(' + r.id + ')" title="Edit Reservation">✏️</button>' +
                '<button class="btn-icon btn-icon-delete" onclick="removeTechReservation(' + r.id + ')" title="Remove Reservation (No-show)">🗑️</button>' +
            '</td>' +
        '</tr>';
    }).join('');
}

// ===== FILTER RESERVATIONS =====
function filterTechReservations() {
    const labFilter = document.getElementById('techFilterLab').value;
    const dateFilter = document.getElementById('techFilterDate').value;
    const studentFilter = document.getElementById('techFilterStudent').value.toLowerCase().trim();

    let filtered = allTechReservations.slice();

    // Filter by lab
    if (labFilter) {
        const labId = parseInt(labFilter);
        filtered = filtered.filter(function (r) { return r.labId === labId; });
    }

    // Filter by date
    if (dateFilter) {
        filtered = filtered.filter(function (r) { return r.date === dateFilter; });
    }

    // Filter by student name
    if (studentFilter) {
        filtered = filtered.filter(function (r) {
            const user = state.users.find(function (u) { return u.id === r.userId; });
            if (!user) return false;
            const fullName = (user.firstName + ' ' + user.lastName).toLowerCase();
            return fullName.indexOf(studentFilter) !== -1;
        });
    }

    renderTechReservations(filtered);
    updateTechStats(filtered);
}

function clearTechFilters() {
    document.getElementById('techFilterLab').value = '';
    document.getElementById('techFilterDate').value = '';
    document.getElementById('techFilterStudent').value = '';
    renderTechReservations(allTechReservations);
    updateTechStats(allTechReservations);
}

// ===== REMOVE RESERVATION =====
function removeTechReservation(id) {
    const reservation = state.reservations.find(function (r) { return r.id === id; });
    if (!reservation) return;

    const user = state.users.find(function (u) { return u.id === reservation.userId; });
    const studentName = user ? user.firstName + ' ' + user.lastName : 'Unknown Student';

    showModal(
        'Remove Reservation',
        'Remove reservation for ' + studentName + '? This is typically used when a student does not show up within 10 minutes of their reserved slot.',
        async function () {
            try {
                await fetch('/api/reservations/' + id, { method: 'DELETE' });
                state.reservations = state.reservations.filter(function (r) { return r.id !== id; });

                // Update cached list
                allTechReservations = state.reservations.slice();
                filterTechReservations();
                showToast('Reservation removed successfully', 'success');
            } catch (err) {
                showToast('Error removing reservation', 'error');
            }
        }
    );
}

// ===== EDIT RESERVATION =====
function editTechReservation(id) {
    const reservation = state.reservations.find(function (r) { return r.id === id; });
    if (!reservation) return;

    const modal = document.getElementById('editTechModal');
    if (!modal) return;

    // Populate form
    document.getElementById('editTechStudent').value = reservation.userId;
    document.getElementById('editTechLab').value = reservation.labId;
    document.getElementById('editTechDate').value = reservation.date;
    document.getElementById('editTechSeat').value = reservation.seatNumber;
    document.getElementById('editTechTime').value = reservation.time;

    const lab = state.labs.find(function (l) { return l.id === reservation.labId; });
    document.getElementById('editTechLabName').textContent = lab ? lab.name : 'Unknown Lab';

    // Store edit context
    modal._editId = id;
    modal.style.display = 'flex';
}

function closeEditTechModal() {
    var modal = document.getElementById('editTechModal');
    if (modal) modal.style.display = 'none';
}

async function saveEditTechReservation() {
    var modal = document.getElementById('editTechModal');
    if (!modal) return;

    var id = modal._editId;
    var newUserId = parseInt(document.getElementById('editTechStudent').value);
    var newLabId = parseInt(document.getElementById('editTechLab').value);
    var newDate = document.getElementById('editTechDate').value;
    var newSeat = parseInt(document.getElementById('editTechSeat').value);
    var newTime = document.getElementById('editTechTime').value;

    // Validate all fields
    if (!newUserId || !newLabId || !newDate || !newSeat || !newTime) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    // Validate seat number against lab capacity
    var lab = state.labs.find(function (l) { return l.id === newLabId; });
    if (lab && newSeat > lab.seats) {
        showToast('Seat number cannot exceed ' + lab.seats + ' for ' + lab.name, 'error');
        return;
    }

    // Check for conflicts (exclude current reservation)
    var conflict = state.reservations.find(function (r) {
        return r.id !== id &&
            r.labId === newLabId &&
            r.seatNumber === newSeat &&
            r.date === newDate &&
            r.time === newTime;
    });

    if (conflict) {
        showToast('This seat is already reserved at that time', 'warning');
        return;
    }

    // Update the reservation on the server
    try {
        await fetch('/api/reservations/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: newUserId,
                labId: newLabId,
                date: newDate,
                seatNumber: newSeat,
                time: newTime
            })
        });

        // Update local state
        var reservation = state.reservations.find(function (r) { return r.id === id; });
        if (reservation) {
            reservation.userId = newUserId;
            reservation.labId = newLabId;
            reservation.date = newDate;
            reservation.seatNumber = newSeat;
            reservation.time = newTime;
        }
    } catch (err) {
        showToast('Error updating reservation', 'error');
        return;
    }

    closeEditTechModal();

    // Refresh
    allTechReservations = state.reservations.slice();
    filterTechReservations();
    showToast('Reservation updated successfully', 'success');
}

// ===== WALK-IN RESERVATION =====
function openWalkInModal() {
    var modal = document.getElementById('walkInModal');
    if (!modal) return;

    // Reset form
    document.getElementById('walkInForm').reset();

    // Set default date to today
    var today = toLocalDateStr(new Date());
    document.getElementById('walkInDate').value = today;

    modal.style.display = 'flex';
}

function closeWalkInModal() {
    var modal = document.getElementById('walkInModal');
    if (modal) modal.style.display = 'none';
}

async function saveWalkInReservation() {
    var userId = parseInt(document.getElementById('walkInStudent').value);
    var labId = parseInt(document.getElementById('walkInLab').value);
    var date = document.getElementById('walkInDate').value;
    var time = document.getElementById('walkInTime').value;
    var seat = parseInt(document.getElementById('walkInSeat').value);

    // Validate
    if (!userId || !labId || !date || !time || !seat) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    // Validate seat number against lab capacity
    var lab = state.labs.find(function (l) { return l.id === labId; });
    if (lab && seat > lab.seats) {
        showToast('Seat number cannot exceed ' + lab.seats + ' for ' + lab.name, 'error');
        return;
    }

    // Check for conflicts
    var conflict = state.reservations.find(function (r) {
        return r.labId === labId &&
            r.seatNumber === seat &&
            r.date === date &&
            r.time === time;
    });

    if (conflict) {
        showToast('This seat is already reserved at that time', 'warning');
        return;
    }

    // Create a new walk-in reservation
    var newId = Date.now();
    var newReservation = {
        id: newId,
        labId: labId,
        seatNumber: seat,
        userId: userId,
        date: date,
        time: time,
        anonymous: false,
        isBlocked: false,
        isWalkIn: true,
        requestedAt: new Date().toISOString()
    };

    try {
        await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([newReservation])
        });
        state.reservations.push(newReservation);
    } catch (err) {
        showToast('Error creating reservation', 'error');
        return;
    }

    closeWalkInModal();

    // Refresh
    allTechReservations = state.reservations.slice();
    filterTechReservations();

    var student = state.users.find(function (u) { return u.id === userId; });
    var studentName = student ? student.firstName + ' ' + student.lastName : 'Student';
    showToast('Walk-in reservation created for ' + studentName, 'success');
}
