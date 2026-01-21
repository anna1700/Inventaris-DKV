/**
 * Authentication Module (Updated for Role-Based Login)
 */

const Auth = {
    // Cek apakah user sudah login (berdasarkan session di LocalStorage)
    isAuthenticated() {
        const session = localStorage.getItem('dkv_session_user');
        return session !== null;
    },

    // Mendapatkan data user yang sedang login
    getUser() {
        const session = localStorage.getItem('dkv_session_user');
        return session ? JSON.parse(session) : null;
    },

    // Fungsi Login Baru (Cek ke tabel app_users)
    async login(username, password) {
        try {
            // Gunakan _supabase (variable global dari supabase-config.js)
            // Pastikan mengecek tabel 'app_users' yang baru dibuat
            const { data, error } = await _supabase
                .from('app_users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (error || !data) {
                return { success: false, error: 'Username atau Password salah!' };
            }

            return { success: true, user: data };
        } catch (err) {
            console.error("Login Error:", err);
            return { success: false, error: 'Gagal terhubung ke database.' };
        }
    },

    // Logout: Hapus semua sesi dan kembalikan ke login
    logout() {
        localStorage.removeItem('dkv_session_user');
        localStorage.removeItem('dkv_user_name'); // Hapus nama siswa juga
        
        // Redirect ke halaman login (index.html bagian login)
        window.location.href = 'index.html';
    },

    // Inisialisasi Form Login
    initLoginForm() {
        const form = document.getElementById('login-form');
        const errorEl = document.getElementById('login-error');
        const submitBtn = form?.querySelector('button[type="submit"]');

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Efek Loading pada tombol
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Memproses...</span>';
            }

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                // Panggil fungsi login di atas
                const result = await this.login(username, password);

                if (result.success) {
                    errorEl.classList.add('hidden');
                    
                    // 1. SIMPAN SESI PENTING
                    localStorage.setItem('dkv_session_user', JSON.stringify(result.user));
                    
                    // Jika siswa, simpan namanya biar form peminjaman otomatis terisi
                    if(result.user.role === 'siswa') {
                        localStorage.setItem('dkv_user_name', result.user.full_name || username);
                    }

                    // 2. CEK ROLE & ARAHKAN (REDIRECT)
                    if (result.user.role === 'admin') {
                        console.log("Login sebagai Admin");
                        // Refresh halaman untuk masuk ke Dashboard Admin
                        // (Karena index.html menghandle Login & Dashboard sekaligus)
                        window.location.href = 'index.html#dashboard';
                        window.location.reload(); 
                    } 
                    else if (result.user.role === 'siswa') {
                        console.log("Login sebagai Siswa");
                        // Lempar ke halaman khusus Siswa
                        window.location.href = 'siswa.html';
                    } 
                    else {
                        errorEl.textContent = "Role akun tidak dikenali.";
                        errorEl.classList.remove('hidden');
                    }

                } else {
                    // Jika Gagal Login
                    errorEl.textContent = result.error;
                    errorEl.classList.remove('hidden');
                }
            } catch (error) {
                errorEl.textContent = 'Terjadi kesalahan sistem.';
                errorEl.classList.remove('hidden');
                console.error('Login system error:', error);
            } finally {
                // Kembalikan tombol seperti semula
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>Masuk</span><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
                }
            }
        });
    },

    // Inisialisasi Tombol Logout
    initLogoutButton() {
        const logoutBtn = document.getElementById('logout-btn');
        logoutBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }
};