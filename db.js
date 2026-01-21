/**
 * Database Layer - Supabase + LocalStorage Fallback
 * Handles all data persistence operations
 */

const DB = {
    // Storage keys for fallback
    KEYS: {
        ASSETS: 'dkv_assets',
        BORROWERS: 'dkv_borrowers',
        LOANS: 'dkv_loans',
        MAINTENANCE: 'dkv_maintenance',
        AUTH: 'dkv_auth'
    },

    // Initialize database
    async init() {
        // Call init from window scope
        if (typeof window.initSupabase === 'function') {
            window.initSupabase();
        }

        if (typeof window.isSupabaseConfigured !== 'function' || !window.window.isSupabaseConfigured()) {
            console.log('📦 Using LocalStorage fallback...');
            this.initLocalStorage();
        } else {
            console.log('☁️ Using Supabase database...');
        }
    },

    // LocalStorage fallback initialization
    initLocalStorage() {
        if (!this.getLocal(this.KEYS.ASSETS)) {
            this.setLocal(this.KEYS.ASSETS, this.getSampleAssets());
        }
        if (!this.getLocal(this.KEYS.BORROWERS)) {
            this.setLocal(this.KEYS.BORROWERS, this.getSampleBorrowers());
        }
        if (!this.getLocal(this.KEYS.LOANS)) {
            this.setLocal(this.KEYS.LOANS, []);
        }
        if (!this.getLocal(this.KEYS.MAINTENANCE)) {
            this.setLocal(this.KEYS.MAINTENANCE, []);
        }
    },

    // LocalStorage get/set
    getLocal(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('LocalStorage get error:', e);
            return null;
        }
    },

    setLocal(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('LocalStorage set error:', e);
            return false;
        }
    },

    // Generate unique ID
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // ==========================================
    // ASSETS OPERATIONS
    // ==========================================
    async getAssets(filters = {}) {
        if (window.isSupabaseConfigured()) {
            let query = window.supabaseClient.from('assets').select('*');

            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`);
            }
            if (filters.category) {
                query = query.eq('category', filters.category);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } else {
            let assets = this.getLocal(this.KEYS.ASSETS) || [];
            if (filters.search) {
                const search = filters.search.toLowerCase();
                assets = assets.filter(a =>
                    a.name.toLowerCase().includes(search) ||
                    (a.brand && a.brand.toLowerCase().includes(search))
                );
            }
            if (filters.category) {
                assets = assets.filter(a => a.category === filters.category);
            }
            return assets;
        }
    },

    async getAssetById(id) {
        if (window.isSupabaseConfigured()) {
            const { data, error } = await window.supabaseClient.from('assets').select('*').eq('id', id).single();
            if (error) return null;
            return data;
        } else {
            const assets = this.getLocal(this.KEYS.ASSETS) || [];
            return assets.find(a => a.id === id);
        }
    },

    async createAsset(data) {
        if (window.isSupabaseConfigured()) {
            const { data: newAsset, error } = await window.supabaseClient.from('assets').insert([{
                name: data.name,
                category: data.category,
                brand: data.brand || null,
                purchase_date: data.purchase_date || null,
                purchase_price: data.purchase_price || 0,
                photo_url: data.photo || null,
                notes: data.notes || null,
                total_quantity: data.total_quantity,
                available_quantity: data.total_quantity,
                condition: data.condition || 'Good',
                status: data.status || 'Active'
            }]).select().single();

            if (error) throw error;
            return newAsset;
        } else {
            const assets = this.getLocal(this.KEYS.ASSETS) || [];
            const newAsset = {
                id: this.generateId('asset'),
                ...data,
                available_quantity: parseInt(data.total_quantity),
                created_at: Date.now(),
                updated_at: Date.now()
            };
            assets.push(newAsset);
            this.setLocal(this.KEYS.ASSETS, assets);
            return newAsset;
        }
    },

    async updateAsset(id, data) {
        if (window.isSupabaseConfigured()) {
            const { data: updated, error } = await window.supabaseClient.from('assets')
                .update({
                    name: data.name,
                    category: data.category,
                    brand: data.brand,
                    purchase_date: data.purchase_date,
                    purchase_price: data.purchase_price,
                    notes: data.notes,
                    total_quantity: data.total_quantity,
                    condition: data.condition,
                    status: data.status
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updated;
        } else {
            const assets = this.getLocal(this.KEYS.ASSETS) || [];
            const index = assets.findIndex(a => a.id === id);
            if (index === -1) return null;
            assets[index] = { ...assets[index], ...data, updated_at: Date.now() };
            this.setLocal(this.KEYS.ASSETS, assets);
            return assets[index];
        }
    },

    async deleteAsset(id) {
        if (window.isSupabaseConfigured()) {
            const { error } = await window.supabaseClient.from('assets').delete().eq('id', id);
            if (error) throw error;
            return true;
        } else {
            const assets = this.getLocal(this.KEYS.ASSETS) || [];
            this.setLocal(this.KEYS.ASSETS, assets.filter(a => a.id !== id));
            return true;
        }
    },

    // ==========================================
    // BORROWERS OPERATIONS
    // ==========================================
    async getBorrowers(filters = {}) {
        if (window.isSupabaseConfigured()) {
            let query = window.supabaseClient.from('borrowers').select('*');

            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,class.ilike.%${filters.search}%`);
            }
            if (filters.role) {
                query = query.eq('role', filters.role);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } else {
            let borrowers = this.getLocal(this.KEYS.BORROWERS) || [];
            if (filters.search) {
                const search = filters.search.toLowerCase();
                borrowers = borrowers.filter(b =>
                    b.name.toLowerCase().includes(search) ||
                    (b.class && b.class.toLowerCase().includes(search))
                );
            }
            if (filters.role) {
                borrowers = borrowers.filter(b => b.role === filters.role);
            }
            return borrowers;
        }
    },

    async getBorrowerById(id) {
        if (window.isSupabaseConfigured()) {
            const { data, error } = await window.supabaseClient.from('borrowers').select('*').eq('id', id).single();
            if (error) return null;
            return data;
        } else {
            const borrowers = this.getLocal(this.KEYS.BORROWERS) || [];
            return borrowers.find(b => b.id === id);
        }
    },

    async createBorrower(data) {
        if (window.isSupabaseConfigured()) {
            const { data: newBorrower, error } = await window.supabaseClient.from('borrowers').insert([{
                name: data.name,
                role: data.role,
                class: data.class || null,
                phone: data.phone || null
            }]).select().single();

            if (error) throw error;
            return newBorrower;
        } else {
            const borrowers = this.getLocal(this.KEYS.BORROWERS) || [];
            const newBorrower = { id: this.generateId('borrower'), ...data, created_at: Date.now() };
            borrowers.push(newBorrower);
            this.setLocal(this.KEYS.BORROWERS, borrowers);
            return newBorrower;
        }
    },

    async updateBorrower(id, data) {
        if (window.isSupabaseConfigured()) {
            const { data: updated, error } = await window.supabaseClient.from('borrowers')
                .update({ name: data.name, role: data.role, class: data.class })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updated;
        } else {
            const borrowers = this.getLocal(this.KEYS.BORROWERS) || [];
            const index = borrowers.findIndex(b => b.id === id);
            if (index === -1) return null;
            borrowers[index] = { ...borrowers[index], ...data };
            this.setLocal(this.KEYS.BORROWERS, borrowers);
            return borrowers[index];
        }
    },

    async deleteBorrower(id) {
        if (window.isSupabaseConfigured()) {
            const { error } = await window.supabaseClient.from('borrowers').delete().eq('id', id);
            if (error) throw error;
            return true;
        } else {
            const borrowers = this.getLocal(this.KEYS.BORROWERS) || [];
            this.setLocal(this.KEYS.BORROWERS, borrowers.filter(b => b.id !== id));
            return true;
        }
    },

    // ==========================================
    // LOANS OPERATIONS
    // ==========================================
    async getLoans(filters = {}) {
        if (window.isSupabaseConfigured()) {
            let query = window.supabaseClient.from('loans_detail').select('*');

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.activeOnly) {
                query = query.in('status', ['Borrowed', 'Late']);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;

            // Update late status
            const today = new Date().toISOString().split('T')[0];
            for (let loan of data || []) {
                if (loan.status === 'Borrowed' && loan.planned_return_date < today) {
                    await this.updateLoanStatus(loan.id, 'Late');
                    loan.status = 'Late';
                }
            }

            return data || [];
        } else {
            let loans = this.getLocal(this.KEYS.LOANS) || [];

            // Update late status locally
            const today = new Date().toISOString().split('T')[0];
            let updated = false;
            loans.forEach(loan => {
                if (loan.status === 'Borrowed' && loan.planned_return_date < today) {
                    loan.status = 'Late';
                    updated = true;
                }
            });
            if (updated) this.setLocal(this.KEYS.LOANS, loans);

            if (filters.status) {
                loans = loans.filter(l => l.status === filters.status);
            }
            if (filters.activeOnly) {
                loans = loans.filter(l => l.status === 'Borrowed' || l.status === 'Late');
            }

            return loans.sort((a, b) => b.created_at - a.created_at);
        }
    },

    async getLoanById(id) {
        if (window.isSupabaseConfigured()) {
            const { data, error } = await window.supabaseClient.from('loans').select('*').eq('id', id).single();
            if (error) return null;
            return data;
        } else {
            const loans = this.getLocal(this.KEYS.LOANS) || [];
            return loans.find(l => l.id === id);
        }
    },

    async createLoan(data) {
        if (window.isSupabaseConfigured()) {
            const { data: newLoan, error } = await window.supabaseClient.from('loans').insert([{
                borrower_id: data.borrower_id,
                asset_id: data.asset_id,
                quantity: data.quantity,
                loan_date: data.loan_date,
                planned_return_date: data.planned_return_date,
                condition_on_loan: data.condition_on_loan || 'Good',
                status: 'Borrowed'
            }]).select().single();

            if (error) throw error;

            // Update asset availability
            const asset = await this.getAssetById(data.asset_id);
            if (asset) {
                await window.supabaseClient.from('assets')
                    .update({ available_quantity: asset.available_quantity - data.quantity })
                    .eq('id', data.asset_id);
            }

            return newLoan;
        } else {
            const loans = this.getLocal(this.KEYS.LOANS) || [];
            const newLoan = {
                id: this.generateId('loan'),
                ...data,
                status: 'Borrowed',
                actual_return_date: null,
                condition_on_return: null,
                created_at: Date.now(),
                updated_at: Date.now()
            };
            loans.push(newLoan);
            this.setLocal(this.KEYS.LOANS, loans);

            // Update asset availability locally
            const assets = this.getLocal(this.KEYS.ASSETS) || [];
            const assetIndex = assets.findIndex(a => a.id === data.asset_id);
            if (assetIndex !== -1) {
                assets[assetIndex].available_quantity -= data.quantity;
                this.setLocal(this.KEYS.ASSETS, assets);
            }

            return newLoan;
        }
    },

    async returnLoan(id, returnData) {
        if (window.isSupabaseConfigured()) {
            const loan = await this.getLoanById(id);
            if (!loan) return null;

            const { data: updated, error } = await window.supabaseClient.from('loans')
                .update({
                    actual_return_date: returnData.return_date,
                    condition_on_return: returnData.condition,
                    status: 'Returned'
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Update asset availability
            const asset = await this.getAssetById(loan.asset_id);
            if (asset) {
                await window.supabaseClient.from('assets')
                    .update({ available_quantity: asset.available_quantity + loan.quantity })
                    .eq('id', loan.asset_id);
            }

            // Create maintenance if damaged
            if (returnData.condition === 'Damaged') {
                await this.createMaintenance({
                    asset_id: loan.asset_id,
                    loan_id: id,
                    maintenance_date: returnData.return_date,
                    status: 'In Progress',
                    notes: 'Kerusakan terdeteksi saat pengembalian'
                });
            }

            return updated;
        } else {
            const loans = this.getLocal(this.KEYS.LOANS) || [];
            const index = loans.findIndex(l => l.id === id);
            if (index === -1) return null;

            const loan = loans[index];
            loans[index] = {
                ...loan,
                actual_return_date: returnData.return_date,
                condition_on_return: returnData.condition,
                status: 'Returned',
                updated_at: Date.now()
            };
            this.setLocal(this.KEYS.LOANS, loans);

            // Update asset availability locally
            const assets = this.getLocal(this.KEYS.ASSETS) || [];
            const assetIndex = assets.findIndex(a => a.id === loan.asset_id);
            if (assetIndex !== -1) {
                assets[assetIndex].available_quantity += loan.quantity;
                this.setLocal(this.KEYS.ASSETS, assets);
            }

            // Create maintenance if damaged
            if (returnData.condition === 'Damaged') {
                await this.createMaintenance({
                    asset_id: loan.asset_id,
                    loan_id: id,
                    maintenance_date: returnData.return_date,
                    status: 'In Progress',
                    notes: 'Kerusakan terdeteksi saat pengembalian'
                });
            }

            return loans[index];
        }
    },

    async updateLoanStatus(id, status) {
        if (window.isSupabaseConfigured()) {
            const { error } = await window.supabaseClient.from('loans').update({ status }).eq('id', id);
            if (error) throw error;
        }
    },

    // ==========================================
    // MAINTENANCE OPERATIONS
    // ==========================================
    async getMaintenance(filters = {}) {
        if (window.isSupabaseConfigured()) {
            let query = window.supabaseClient.from('maintenance').select(`
                *,
                assets(name, category)
            `);

            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } else {
            let records = this.getLocal(this.KEYS.MAINTENANCE) || [];
            if (filters.status) {
                records = records.filter(m => m.status === filters.status);
            }
            return records.sort((a, b) => b.created_at - a.created_at);
        }
    },

    async getMaintenanceById(id) {
        if (window.isSupabaseConfigured()) {
            const { data, error } = await window.supabaseClient.from('maintenance').select('*').eq('id', id).single();
            if (error) return null;
            return data;
        } else {
            const records = this.getLocal(this.KEYS.MAINTENANCE) || [];
            return records.find(m => m.id === id);
        }
    },

    async getActiveMaintenanceCount() {
        if (window.isSupabaseConfigured()) {
            const { count, error } = await window.supabaseClient
                .from('maintenance')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'In Progress');

            if (error) return 0;
            return count || 0;
        } else {
            const records = this.getLocal(this.KEYS.MAINTENANCE) || [];
            return records.filter(m => m.status === 'In Progress').length;
        }
    },

    async createMaintenance(data) {
        if (window.isSupabaseConfigured()) {
            const { data: newRecord, error } = await window.supabaseClient.from('maintenance').insert([{
                asset_id: data.asset_id,
                loan_id: data.loan_id || null,
                maintenance_date: data.maintenance_date,
                technician: data.technician || null,
                estimated_cost: data.estimated_cost || 0,
                status: data.status || 'In Progress',
                notes: data.notes || null
            }]).select().single();

            if (error) throw error;
            return newRecord;
        } else {
            const records = this.getLocal(this.KEYS.MAINTENANCE) || [];
            const newRecord = {
                id: this.generateId('maint'),
                ...data,
                created_at: Date.now(),
                updated_at: Date.now()
            };
            records.push(newRecord);
            this.setLocal(this.KEYS.MAINTENANCE, records);
            return newRecord;
        }
    },

    async updateMaintenance(id, data) {
        if (window.isSupabaseConfigured()) {
            const { data: updated, error } = await window.supabaseClient.from('maintenance')
                .update({
                    maintenance_date: data.maintenance_date,
                    technician: data.technician,
                    estimated_cost: data.estimated_cost,
                    status: data.status,
                    notes: data.notes
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updated;
        } else {
            const records = this.getLocal(this.KEYS.MAINTENANCE) || [];
            const index = records.findIndex(m => m.id === id);
            if (index === -1) return null;
            records[index] = { ...records[index], ...data, updated_at: Date.now() };
            this.setLocal(this.KEYS.MAINTENANCE, records);
            return records[index];
        }
    },

    async completeMaintenance(id) {
        return this.updateMaintenance(id, { status: 'Completed' });
    },

    async deleteMaintenance(id) {
        if (window.isSupabaseConfigured()) {
            const { error } = await window.supabaseClient.from('maintenance').delete().eq('id', id);
            if (error) throw error;
            return true;
        } else {
            const records = this.getLocal(this.KEYS.MAINTENANCE) || [];
            this.setLocal(this.KEYS.MAINTENANCE, records.filter(m => m.id !== id));
            return true;
        }
    },

    // ==========================================
    // AUTH OPERATIONS
    // ==========================================
    async authenticate(username, password) {
        if (window.isSupabaseConfigured()) {
            const { data, error } = await window.supabaseClient
                .from('admins')
                .select('*')
                .eq('username', username)
                .eq('password_hash', password)
                .single();

            if (error || !data) {
                return { success: false, error: 'Username atau password salah!' };
            }

            this.setLocal(this.KEYS.AUTH, { authenticated: true, user: data.name });
            return { success: true, user: data };
        } else {
            if (username === 'admin' && password === 'admin123') {
                this.setLocal(this.KEYS.AUTH, { authenticated: true, user: 'Administrator' });
                return { success: true };
            }
            return { success: false, error: 'Username atau password salah!' };
        }
    },

    isAuthenticated() {
        const auth = this.getLocal(this.KEYS.AUTH);
        return auth?.authenticated === true;
    },

    logout() {
        this.setLocal(this.KEYS.AUTH, { authenticated: false });
    },

    // ==========================================
    // SAMPLE DATA (LocalStorage fallback)
    // ==========================================
    getSampleAssets() {
        const now = Date.now();
        return [
            { id: 'asset_001', name: 'Canon EOS 80D', category: 'Studio', brand: 'Canon', purchase_date: '2024-01-15', purchase_price: 15000000, photo: '', notes: 'Kamera DSLR untuk praktikum fotografi', total_quantity: 5, available_quantity: 5, condition: 'Good', status: 'Active', created_at: now, updated_at: now },
            { id: 'asset_002', name: 'Tripod Takara VIT-234', category: 'Studio', brand: 'Takara', purchase_date: '2024-02-10', purchase_price: 450000, photo: '', notes: 'Tripod profesional', total_quantity: 10, available_quantity: 10, condition: 'Good', status: 'Active', created_at: now, updated_at: now },
            { id: 'asset_003', name: 'MacBook Pro 14"', category: 'IT', brand: 'Apple', purchase_date: '2024-03-20', purchase_price: 35000000, photo: '', notes: 'Laptop untuk desain grafis', total_quantity: 3, available_quantity: 3, condition: 'Good', status: 'Active', created_at: now, updated_at: now },
            { id: 'asset_004', name: 'Wacom Intuos Pro', category: 'IT', brand: 'Wacom', purchase_date: '2024-01-05', purchase_price: 5000000, photo: '', notes: 'Pen tablet untuk ilustrasi digital', total_quantity: 8, available_quantity: 8, condition: 'Good', status: 'Active', created_at: now, updated_at: now },
            { id: 'asset_005', name: 'Gunting Kertas Besar', category: 'ATK', brand: 'Kenko', purchase_date: '2024-04-01', purchase_price: 35000, photo: '', notes: 'Gunting untuk kerajinan tangan', total_quantity: 20, available_quantity: 20, condition: 'Good', status: 'Active', created_at: now, updated_at: now },
            { id: 'asset_006', name: 'Meja Gambar A2', category: 'Furniture', brand: 'Local', purchase_date: '2023-08-15', purchase_price: 1500000, photo: '', notes: 'Meja gambar dengan lampu built-in', total_quantity: 15, available_quantity: 15, condition: 'Good', status: 'Active', created_at: now, updated_at: now }
        ];
    },

    getSampleBorrowers() {
        const now = Date.now();
        return [
            { id: 'borrower_001', name: 'Budi Santoso', role: 'Student', class: 'XII DKV 1', created_at: now },
            { id: 'borrower_002', name: 'Ani Wulandari', role: 'Student', class: 'XII DKV 2', created_at: now },
            { id: 'borrower_003', name: 'Dimas Pratama', role: 'Student', class: 'XI DKV 1', created_at: now },
            { id: 'borrower_004', name: 'Siti Nurhaliza', role: 'Student', class: 'XI DKV 2', created_at: now },
            { id: 'borrower_005', name: 'Pak Joko Widodo', role: 'Teacher', class: null, created_at: now },
            { id: 'borrower_006', name: 'Bu Sri Mulyani', role: 'Teacher', class: null, created_at: now }
        ];
    }
};
