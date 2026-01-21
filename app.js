
// ==========================================
// 1. MODULE DASHBOARD (Statistik & Grafik)
// ==========================================
const Dashboard = {
    categoryChart: null,
    loansChart: null,

    async refresh() {
        await this.updateStats();
        await this.updateActiveLoans();
        await this.updateRecentAssets();
        await this.updateCharts();
    },

    async updateStats() {
        try {
            const assets = await DB.getAssets();
            const loans = await DB.getLoans({ activeOnly: true });
            const lateLoans = loans.filter(l => l.status === 'Late');
            const maintenanceCount = await DB.getActiveMaintenanceCount();

            // Hitung Total
            const totalAssets = assets.reduce((sum, a) => sum + (parseInt(a.total_quantity) || 0), 0);
            const available = assets.reduce((sum, a) => sum + (parseInt(a.available_quantity) || 0), 0);
            const borrowed = loans.reduce((sum, l) => sum + (parseInt(l.quantity) || 0), 0);

            // Update UI
            document.getElementById('stat-total-assets').textContent = totalAssets;
            document.getElementById('stat-available').textContent = available;
            document.getElementById('stat-borrowed').textContent = borrowed;
            document.getElementById('stat-late').textContent = lateLoans.length;
            document.getElementById('stat-maintenance').textContent = maintenanceCount;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    },

    async updateActiveLoans() {
        const container = document.getElementById('active-loans-list');
        if (!container) return;

        try {
            const loans = await DB.getLoans({ activeOnly: true });
            const displayLoans = loans.slice(0, 5);

            if (displayLoans.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>Tidak ada peminjaman aktif</p></div>';
                return;
            }

            const html = await Promise.all(displayLoans.map(async loan => {
                let borrowerName = loan.borrower_name || 'Unknown';
                let assetName = loan.asset_name;

                if (!assetName) {
                    const asset = await DB.getAssetById(loan.asset_id);
                    assetName = asset?.name || 'Unknown';
                }

                return `
                    <div class="activity-item">
                        <div class="activity-info">
                            <span class="activity-title">${Utils.escapeHtml(borrowerName)}</span>
                            <span class="activity-subtitle">${Utils.escapeHtml(assetName)} - ${loan.quantity} unit</span>
                        </div>
                        <span class="badge badge-${Utils.getStatusColor(loan.status)}">${Utils.translateStatus(loan.status)}</span>
                    </div>
                `;
            }));

            container.innerHTML = html.join('');
        } catch (error) {
            console.error('Error updating active loans:', error);
        }
    },

    async updateRecentAssets() {
        const container = document.getElementById('recent-assets-list');
        if (!container) return;

        try {
            const assets = await DB.getAssets();
            const recentAssets = assets.slice(0, 5);

            if (recentAssets.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>Belum ada aset</p></div>';
                return;
            }

            container.innerHTML = recentAssets.map(asset => `
                <div class="activity-item">
                    <div class="activity-info">
                        <span class="activity-title">${Utils.escapeHtml(asset.name)}</span>
                        <span class="activity-subtitle">${asset.category} - ${asset.available_quantity}/${asset.total_quantity}</span>
                    </div>
                    <span class="badge badge-${Utils.getCategoryColor(asset.category)}">${asset.category}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error updating recent assets:', error);
        }
    },

    async updateCharts() {
        await this.updateCategoryChart();
        await this.updateLoansChart();
    },

    async updateCategoryChart() {
        const canvas = document.getElementById('category-chart');
        if (!canvas || typeof Chart === 'undefined') return;

        try {
            const assets = await DB.getAssets();
            const categories = ['Studio', 'IT', 'ATK', 'Furniture'];
            const counts = categories.map(cat =>
                assets.filter(a => a.category === cat).reduce((sum, a) => sum + (parseInt(a.total_quantity) || 0), 0)
            );

            if (this.categoryChart) this.categoryChart.destroy();

            this.categoryChart = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: counts,
                        backgroundColor: ['#6366f1', '#3b82f6', '#f59e0b', '#10b981'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        } catch (error) {
            console.error('Error chart:', error);
        }
    },

    async updateLoansChart() {
        const canvas = document.getElementById('loans-chart');
        if (!canvas || typeof Chart === 'undefined') return;

        try {
            const loans = await DB.getLoans({});
            const months = [];
            const monthlyData = [];

            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthName = date.toLocaleDateString('id-ID', { month: 'short' });
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                months.push(monthName);
                
                const count = loans.filter(loan => loan.loan_date?.startsWith(monthYear)).length;
                monthlyData.push(count);
            }

            if (this.loansChart) this.loansChart.destroy();

            this.loansChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Peminjaman',
                        data: monthlyData,
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { display: false } } }
                }
            });
        } catch (error) {
            console.error('Error loan chart:', error);
        }
    }
};

// ==========================================
// 2. APP INITIALIZATION (Logika Utama)
// ==========================================
const App = {
    async init() {
        // --- PROTEKSI HALAMAN (SATPAM) ---
        // Jika yang login adalah Siswa, lempar ke siswa.html
        const session = JSON.parse(localStorage.getItem('dkv_session_user'));
        if (session && session.role === 'siswa') {
            window.location.href = 'siswa.html';
            return;
        }

        // Initialize modules
        await DB.init();
        Modal.init();
        Toast.init();

        document.getElementById('current-date').textContent = Utils.formatDate(Utils.getToday());

        Auth.initLoginForm();
        Auth.initLogoutButton();

        Assets.initEvents();
        Borrowers.initEvents();
        Loans.initEvents();
        History.initEvents();
        Maintenance.initEvents();

        this.initSidebarToggle();

        // Check Login Status
        if (Auth.isAuthenticated()) {
            Router.showMain();
            // --- JALANKAN NOTIFIKASI REALTIME ---
            initRealtimeListener();
        } else {
            Router.showLogin();
        }

        Router.init();
        console.log('✅ Admin Dashboard Ready');
    },

    initSidebarToggle() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        toggle?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
};

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());


// ============================================================
// 3. FITUR: QR CODE GENERATOR & MODAL
// ============================================================

window.tampilkanQR = function(idBarang, namaBarang) {
    const modal = document.getElementById('modalQR');
    if (!modal) { alert("Modal QR tidak ditemukan!"); return; }

    modal.style.display = 'block';
    document.getElementById('qrNamaBarang').innerText = namaBarang;
    document.getElementById('qrIDBarang').innerText = idBarang;

    const tempatQR = document.getElementById('tempatQRCode');
    tempatQR.innerHTML = "";

    try {
        new QRCode(tempatQR, {
            text: idBarang,
            width: 160,
            height: 160,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    } catch (e) {
        console.error("Library QR Error", e);
        tempatQR.innerHTML = "Error: Library QR belum terload.";
    }
}

window.tutupModalQR = function() {
    document.getElementById('modalQR').style.display = 'none';
}

window.printQR = function() {
    const kontenQR = document.getElementById("tempatQRCode").innerHTML;
    const namaBarang = document.getElementById("qrNamaBarang").innerText;
    const idBarang = document.getElementById("qrIDBarang").innerText;

    const win = window.open('', '', 'height=600,width=500');
    win.document.write('<html><head><title>Cetak QR - ' + namaBarang + '</title>');
    win.document.write('<style>body { font-family: sans-serif; text-align: center; padding: 20px; } .sticker { border: 2px solid #000; padding: 15px; display: inline-block; border-radius: 10px; } h2 { margin: 5px 0; font-size: 16px; } p { font-size: 10px; }</style>');
    win.document.write('</head><body>');
    win.document.write('<div class="sticker"><h2>' + namaBarang + '</h2><div>' + kontenQR + '</div><p>' + idBarang + '</p></div>');
    win.document.write('<script>setTimeout(() => { window.print(); window.close(); }, 500);</script></body></html>');
    win.document.close();
}

window.onclick = function(event) {
    const modal = document.getElementById('modalQR');
    if (event.target == modal) tutupModalQR();
}


// ============================================================
// 4. FITUR: NOTIFIKASI REALTIME (Admin Listening Mode)
// ============================================================

// Sound Effect
const audioNotif = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function mainkanBunyi() {
    audioNotif.play().catch(e => console.log("Audio play blocked (user must interact first)"));
}

function initRealtimeListener() {
    if (typeof _supabase === 'undefined') return;

    console.log("📡 Radar Notifikasi Aktif...");

    _supabase
    .channel('peminjaman-live')
    .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'loans' }, 
        async (payload) => {
            console.log('🔔 Peminjaman Baru:', payload);
            
            // Ambil nama barang
            const { data: aset } = await _supabase
                .from('assets')
                .select('name')
                .eq('id', payload.new.asset_id)
                .single();

            const namaBarang = aset ? aset.name : "Barang";
            const namaPeminjam = payload.new.borrower_name;

            mainkanBunyi();
            
            // Refresh data tanpa reload halaman
            if(typeof Loans !== 'undefined') Loans.refresh();
            if(typeof Dashboard !== 'undefined') Dashboard.refresh();

            Swal.fire({
                title: 'Peminjaman Baru!',
                text: `${namaPeminjam} meminjam ${namaBarang}`,
                icon: 'info',
                timer: 5000,
                position: 'top-end',
                toast: true,
                showConfirmButton: false
            });
        }
    )
    .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'loans' }, 
        (payload) => {
            // Jika status berubah jadi Returned
            if (payload.new.status === 'Returned' && payload.old.status !== 'Returned') {
                console.log('✅ Barang Kembali:', payload);
                mainkanBunyi();
                
                if(typeof Loans !== 'undefined') Loans.refresh();
                if(typeof Dashboard !== 'undefined') Dashboard.refresh();

                Swal.fire({
                    title: 'Barang Dikembalikan',
                    text: `Cek video bukti di menu Riwayat.`,
                    icon: 'success',
                    timer: 5000,
                    position: 'top-end',
                    toast: true,
                    showConfirmButton: false
                });
            }
        }
    )
    .subscribe();
}