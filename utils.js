/**
 * Utility Functions
 */

const Utils = {
    // Format date for display
    formatDate(dateString) {
        if (!dateString) return '-';
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    },

    // Get today's date in YYYY-MM-DD format
    getToday() {
        return new Date().toISOString().split('T')[0];
    },

    // Check if date is past
    isPastDate(dateString) {
        if (!dateString) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const date = new Date(dateString);
        return date < today;
    },

    // Debounce function for search
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Get category badge color
    getCategoryColor(category) {
        const colors = {
            'Studio': 'purple',
            'IT': 'info',
            'ATK': 'success',
            'Furniture': 'warning'
        };
        return colors[category] || 'gray';
    },

    // Get status badge color
    getStatusColor(status) {
        const colors = {
            'Borrowed': 'warning',
            'Returned': 'success',
            'Late': 'danger',
            'Active': 'success',
            'Inactive': 'gray',
            'Good': 'success',
            'Damaged': 'danger',
            'In Progress': 'warning',
            'Completed': 'success'
        };
        return colors[status] || 'gray';
    },

    // Translate status to Indonesian
    translateStatus(status) {
        const translations = {
            'Borrowed': 'Dipinjam',
            'Returned': 'Dikembalikan',
            'Late': 'Terlambat',
            'Active': 'Aktif',
            'Inactive': 'Tidak Aktif',
            'Good': 'Baik',
            'Damaged': 'Rusak',
            'In Progress': 'Dalam Proses',
            'Completed': 'Selesai',
            'Student': 'Siswa',
            'Teacher': 'Guru'
        };
        return translations[status] || status;
    }
};

// Modal Handler
const Modal = {
    overlay: null,
    modal: null,
    title: null,
    body: null,

    init() {
        this.overlay = document.getElementById('modal-overlay');
        this.modal = document.getElementById('modal');
        this.title = document.getElementById('modal-title');
        this.body = document.getElementById('modal-body');

        // Close on overlay click
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.close();
            }
        });
    },

    open(title, content) {
        this.title.textContent = title;
        this.body.innerHTML = content;
        this.overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    close() {
        this.overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

// Toast Notifications
const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${Utils.escapeHtml(message)}</span>
            <button onclick="this.parentElement.remove()" style="margin-left: auto; padding: 4px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
            </button>
        `;
        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    warning(message) { this.show(message, 'warning'); },
    info(message) { this.show(message, 'info'); }
};
