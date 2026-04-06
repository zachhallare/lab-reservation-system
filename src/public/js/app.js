/* ===== APP.JS - Application Initialization ===== */

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    checkSession();
    setupEventListeners();
    setDefaultFilterDate();
});

function setupEventListeners() {
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('dropdownMenu');
        const userBtn = document.querySelector('.user-btn');
        if (dropdown && !dropdown.contains(e.target) && !userBtn?.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

function setDefaultFilterDate() {
    const filterDate = document.getElementById('filterDate');
    if (filterDate) {
        filterDate.value = new Date().toISOString().split('T')[0];
        filterDate.min = new Date().toISOString().split('T')[0];
    }
}
