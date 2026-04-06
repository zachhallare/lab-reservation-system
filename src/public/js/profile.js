/* ===== PROFILE.JS - Profile Page Functions ===== */

// ===== PROFILE =====
function renderProfile() {
    if (!state.currentUser) return;

    let user = state.currentUser;
    const urlParams = new URLSearchParams(window.location.search);
    const profileIdStr = urlParams.get('id');

    if (profileIdStr) {
        const profileId = parseInt(profileIdStr);
        const foundUser = state.users.find(u => u.id === profileId);
        if (foundUser) {
            user = foundUser;
        }
    }

    setAvatarElement('profileAvatar', user);
    document.getElementById('profileName').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('profileRole').textContent = user.role === 'technician' ? 'Lab Technician' : 'Student';
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileDescription').textContent = user.description || 'No description provided.';

    // Populate edit form
    document.getElementById('editFirstName').value = user.firstName;
    document.getElementById('editLastName').value = user.lastName;
    document.getElementById('editDescription').value = user.description || '';

    // Show existing profile picture preview
    const preview = document.getElementById('profilePicturePreview');
    if (preview) {
        if (user.profilePicture) {
            preview.src = user.profilePicture;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    }

    const isOwnProfile = user.id === state.currentUser.id;
    const editBtn = document.querySelector('.profile-info .btn-secondary');
    if (editBtn) editBtn.style.display = isOwnProfile ? 'inline-flex' : 'none';

    const dangerZone = document.querySelector('.danger-zone');
    if (dangerZone) dangerZone.style.display = isOwnProfile ? 'block' : 'none';

    renderProfileReservations(user);
}

function renderProfileReservations(user) {
    const container = document.getElementById('profileReservationsList');
    const today = new Date(new Date().toDateString());
    const targetUserId = user ? user.id : state.currentUser?.id;

    const userReservations = state.reservations.filter(r =>
        r.userId === targetUserId && new Date(r.date) >= today && (!r.anonymous || targetUserId === state.currentUser?.id || state.currentUser?.role === 'technician')
    ).slice(0, 5);

    if (userReservations.length === 0) {
        container.innerHTML = '<p class="text-muted">No upcoming reservations.</p>';
        return;
    }

    container.innerHTML = userReservations.map(r => {
        const lab = state.labs.find(l => l.id === r.labId);
        return `<div class="reservation-card"><div class="reservation-info"><h4>${lab?.name} - PC${r.seatNumber}</h4><p>${formatDate(r.date)} at ${formatTime(r.time)}</p></div></div>`;
    }).join('');
}

function toggleEditProfile() {
    const section = document.getElementById('profileEditSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

function saveProfile(e) {
    e.preventDefault();

    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const description = document.getElementById('editDescription').value.trim();
    const fileInput = document.getElementById('editProfilePicture');

    const finishSave = async (profilePicture) => {
        const updateData = { firstName, lastName, description };
        if (profilePicture !== undefined) {
            updateData.profilePicture = profilePicture;
        }

        try {
            const res = await fetch(`/api/users/${state.currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const data = await res.json();
            if (data.user) {
                // Update local state
                const userIdx = state.users.findIndex(u => u.id === state.currentUser.id);
                if (userIdx !== -1) {
                    state.users[userIdx] = data.user;
                }
                state.currentUser = data.user;
            }
        } catch (err) {
            showToast('Error saving profile', 'error');
            return;
        }

        showToast('Profile updated successfully', 'success');
        toggleEditProfile();
        renderProfile();
        if (typeof updateNavUser === 'function') updateNavUser();
    };

    // Handle profile picture upload
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            finishSave(ev.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        finishSave();
    }
}

function deleteAccount() {
    showModal('Delete Account', 'This will permanently delete your account and all reservations. This action cannot be undone.', async () => {
        try {
            await fetch(`/api/users/${state.currentUser.id}`, { method: 'DELETE' });
            showToast('Account deleted successfully', 'info');
            if (typeof logout === 'function') logout();
        } catch (err) {
            showToast('Error deleting account', 'error');
        }
    });
}

function viewUserProfile(userId) {
    const user = state.users.find(u => u.id === userId);
    if (user) {
        navigateTo('viewProfile', user);
    }
}

function renderViewProfile(user) {
    setAvatarElement('viewProfileAvatar', user);
    document.getElementById('viewProfileName').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('viewProfileRole').textContent = user.role === 'technician' ? 'Lab Technician' : 'Student';
    document.getElementById('viewProfileDescription').textContent = user.description || 'No description provided.';

    // Show non-anonymous reservations
    const container = document.getElementById('viewProfileReservationsList');
    const today = new Date(new Date().toDateString());

    const userReservations = state.reservations.filter(r =>
        r.userId === user.id && new Date(r.date) >= today && !r.anonymous
    ).slice(0, 5);

    if (userReservations.length === 0) {
        container.innerHTML = '<p>No visible reservations.</p>';
        return;
    }

    container.innerHTML = userReservations.map(r => {
        const lab = state.labs.find(l => l.id === r.labId);
        return `<div class="reservation-card"><div class="reservation-info"><h4>${lab?.name} - PC${r.seatNumber}</h4><p>${formatDate(r.date)} at ${formatTime(r.time)}</p></div></div>`;
    }).join('');
}

// ===== PROFILE PICTURE HELPERS =====
function previewProfilePicture(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('profilePicturePreview');
    if (file && preview) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Set an avatar element to show a profile picture (img) or letter fallback
function setAvatarElement(elementId, user) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (user.profilePicture) {
        el.innerHTML = `<img src="${user.profilePicture}" alt="${user.firstName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
        el.innerHTML = '';
        el.textContent = user.firstName[0].toUpperCase();
    }
}
