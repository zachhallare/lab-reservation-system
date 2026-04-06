/* ===== NAVIGATION.JS - Page Navigation ===== */

// ===== NAVIGATION =====
function navigateTo(page, data = null) {
    state.previousPage = state.currentPage;
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) link.classList.add('active');
    });

    // Show/hide navbar based on auth state
    const navbar = document.getElementById('navbar');
    const footer = document.getElementById('footer');
    const isAuthPage = page === 'login' || page === 'register';

    navbar.style.display = isAuthPage ? 'none' : 'block';
    footer.style.display = isAuthPage ? 'none' : 'block';

    state.currentPage = page;

    switch (page) {
        case 'login':
            document.getElementById('loginPage').style.display = 'flex';
            break;
        case 'register':
            document.getElementById('registerPage').style.display = 'flex';
            break;
        case 'dashboard':
            document.getElementById('dashboardPage').style.display = 'block';
            renderDashboard();
            break;
        case 'labs':
            document.getElementById('dashboardPage').style.display = 'block';
            renderDashboard();
            break;
        case 'labView':
            document.getElementById('labViewPage').style.display = 'block';
            if (data) state.selectedLab = data;
            renderLabView();
            break;
        case 'reservations':
            document.getElementById('reservationsPage').style.display = 'block';
            renderReservations('upcoming');
            break;
        case 'profile':
            document.getElementById('profilePage').style.display = 'block';
            renderProfile();
            break;
        case 'viewProfile':
            document.getElementById('viewProfilePage').style.display = 'block';
            if (data) renderViewProfile(data);
            break;
    }
}

function goBack() {
    if (state.previousPage) {
        navigateTo(state.previousPage);
    } else {
        navigateTo('dashboard');
    }
}

function toggleMobileNav() {
    document.getElementById('navLinks').classList.toggle('show');
}

function toggleUserMenu() {
    document.getElementById('dropdownMenu').classList.toggle('show');
}

function updateNavUser() {
    if (state.currentUser) {
        const avatar = document.getElementById('navAvatar');
        const name = document.getElementById('navUserName');
        if (state.currentUser.profilePicture) {
            avatar.innerHTML = `<img src="${state.currentUser.profilePicture}" alt="${state.currentUser.firstName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            avatar.innerHTML = '';
            avatar.textContent = state.currentUser.firstName[0].toUpperCase();
        }
        name.textContent = state.currentUser.firstName;

        const techLink = document.getElementById('navTechnician');
        if (techLink) {
            techLink.style.display = state.currentUser.role === 'technician' ? 'block' : 'none';
        }
    }
}
