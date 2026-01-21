/**
 * Client-Side Router
 */

const Router = {
    routes: ['dashboard', 'assets', 'borrowers', 'loans', 'history', 'maintenance', 'reports'],
    currentPage: 'dashboard',

    init() {
        // Handle navigation clicks
        document.querySelectorAll('.nav-item[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigate(page);
                // Close sidebar on mobile after navigation
                this.closeSidebar();
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            const hash = window.location.hash.slice(1) || 'dashboard';
            this.showPage(hash, false);
        });

        // Sidebar toggle for mobile
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');

        sidebarToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar?.classList.contains('open')) {
                const isClickInsideSidebar = sidebar.contains(e.target);
                const isClickOnToggle = sidebarToggle?.contains(e.target);

                if (!isClickInsideSidebar && !isClickOnToggle) {
                    this.closeSidebar();
                }
            }
        });

        // Initial route
        const initialPage = window.location.hash.slice(1) || 'dashboard';
        if (Auth.isAuthenticated()) {
            this.showPage(initialPage, false);
        }
    },

    closeSidebar() {
        document.getElementById('sidebar')?.classList.remove('open');
    },

    navigate(page) {
        if (page === 'login') {
            this.showLogin();
            return;
        }

        if (!Auth.isAuthenticated()) {
            this.showLogin();
            return;
        }

        if (this.routes.includes(page)) {
            window.location.hash = page;
            this.showPage(page, true);
        }
    },

    showPage(page, updateHistory = true) {
        if (!this.routes.includes(page)) page = 'dashboard';

        // Update URL if needed
        if (updateHistory && window.location.hash !== `#${page}`) {
            window.location.hash = page;
        }

        // Hide all pages
        document.querySelectorAll('.content-page').forEach(p => {
            p.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'assets': 'Manajemen Aset',
            'borrowers': 'Manajemen Peminjam',
            'loans': 'Peminjaman Aktif',
            'history': 'Riwayat Peminjaman',
            'maintenance': 'Pemeliharaan',
            'reports': 'Laporan'
        };
        document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

        // Refresh page content
        this.refreshPage(page);
        this.currentPage = page;
    },

    refreshPage(page) {
        switch (page) {
            case 'dashboard': Dashboard.refresh(); break;
            case 'assets': Assets.refresh(); break;
            case 'borrowers': Borrowers.refresh(); break;
            case 'loans': Loans.refresh(); break;
            case 'history': History.refresh(); break;
            case 'maintenance': Maintenance.refresh(); break;
        }
    },

    showLogin() {
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('login-page').classList.add('active');
        document.getElementById('main-layout').classList.add('hidden');
    },

    showMain() {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('login-page').classList.remove('active');
        document.getElementById('main-layout').classList.remove('hidden');
        this.navigate('dashboard');
    }
};
