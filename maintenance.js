/**
 * Maintenance Module
 * Updated with async/await for Supabase support
 */

const Maintenance = {
    async refresh() {
        const search = document.getElementById('maintenance-search')?.value || '';
        const status = document.getElementById('maintenance-status-filter')?.value || '';

        try {
            const records = await DB.getMaintenance({ status });
            await this.renderTable(records, search);
        } catch (error) {
            console.error('Error refreshing maintenance:', error);
            Toast.error('Gagal memuat data pemeliharaan');
        }
    },

    async renderTable(records, searchFilter = '') {
        const tbody = document.getElementById('maintenance-table-body');
        if (!tbody) return;

        // Filter by search if needed
        let filteredRecords = records;
        if (searchFilter) {
            const search = searchFilter.toLowerCase();
            filteredRecords = records.filter(m => {
                const assetName = m.assets?.name || '';
                const technician = m.technician || '';
                return assetName.toLowerCase().includes(search) ||
                    technician.toLowerCase().includes(search);
            });
        }

        if (filteredRecords.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><p>Tidak ada data pemeliharaan</p></td></tr>`;
            return;
        }

        const html = await Promise.all(filteredRecords.map(async m => {
            // Get asset name
            let assetName = m.assets?.name;
            if (!assetName) {
                const asset = await DB.getAssetById(m.asset_id);
                assetName = asset?.name || 'Unknown';
            }

            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(assetName)}</strong></td>
                    <td>${Utils.formatDate(m.maintenance_date)}</td>
                    <td>${Utils.escapeHtml(m.technician) || '-'}</td>
                    <td>${m.estimated_cost ? Utils.formatCurrency(m.estimated_cost) : '-'}</td>
                    <td><span class="badge badge-${Utils.getStatusColor(m.status)}">${Utils.translateStatus(m.status)}</span></td>
                    <td>${Utils.escapeHtml(m.notes) || '-'}</td>
                    <td>
                        <div class="table-actions">
                            ${m.status === 'In Progress' ? `
                                <button class="return-btn" onclick="Maintenance.executeComplete('${m.id}')" title="Selesai">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </button>
                            ` : ''}
                            <button class="edit-btn" onclick="Maintenance.showEditModal('${m.id}')" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                </svg>
                            </button>
                            <button class="delete-btn" onclick="Maintenance.confirmDelete('${m.id}')" title="Hapus">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }));

        tbody.innerHTML = html.join('');
    },

    async showAddModal() {
        try {
            const assets = await DB.getAssets({});
            Modal.open('Tambah Pemeliharaan', this.getFormHtml(null, assets));
            this.initForm();
        } catch (error) {
            console.error('Error loading assets:', error);
            Toast.error('Gagal memuat data aset');
        }
    },

    async showEditModal(id) {
        try {
            const record = await DB.getMaintenanceById(id);
            if (!record) {
                Toast.error('Data tidak ditemukan');
                return;
            }
            const assets = await DB.getAssets({});
            Modal.open('Edit Pemeliharaan', this.getFormHtml(record, assets));
            this.initForm(record);
        } catch (error) {
            console.error('Error loading maintenance:', error);
            Toast.error('Gagal memuat data');
        }
    },

    getFormHtml(m = null, assets = []) {
        return `
            <form id="maintenance-form">
                <div class="form-group">
                    <label for="maint-asset">Aset *</label>
                    <select id="maint-asset" class="form-control" required ${m ? 'disabled' : ''}>
                        <option value="">Pilih Aset</option>
                        ${assets.map(a => `<option value="${a.id}" ${m?.asset_id === a.id ? 'selected' : ''}>${Utils.escapeHtml(a.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="maint-date">Tanggal *</label>
                        <input type="date" id="maint-date" class="form-control" value="${m?.maintenance_date || Utils.getToday()}" required>
                    </div>
                    <div class="form-group">
                        <label for="maint-status">Status *</label>
                        <select id="maint-status" class="form-control" required>
                            <option value="In Progress" ${m?.status === 'In Progress' ? 'selected' : ''}>Dalam Proses</option>
                            <option value="Completed" ${m?.status === 'Completed' ? 'selected' : ''}>Selesai</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="maint-technician">Teknisi</label>
                        <input type="text" id="maint-technician" class="form-control" value="${m?.technician || ''}">
                    </div>
                    <div class="form-group">
                        <label for="maint-cost">Estimasi Biaya</label>
                        <input type="number" id="maint-cost" class="form-control" min="0" value="${m?.estimated_cost || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="maint-notes">Catatan</label>
                    <textarea id="maint-notes" class="form-control" rows="3">${m?.notes || ''}</textarea>
                </div>
                <input type="hidden" id="maint-id" value="${m?.id || ''}">
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Batal</button>
                    <button type="submit" class="btn btn-primary">${m ? 'Simpan' : 'Tambah'}</button>
                </div>
            </form>
        `;
    },

    initForm(existing = null) {
        const form = document.getElementById('maintenance-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                asset_id: existing?.asset_id || document.getElementById('maint-asset').value,
                maintenance_date: document.getElementById('maint-date').value,
                status: document.getElementById('maint-status').value,
                technician: document.getElementById('maint-technician').value,
                estimated_cost: parseInt(document.getElementById('maint-cost').value) || 0,
                notes: document.getElementById('maint-notes').value
            };
            const id = document.getElementById('maint-id').value;

            try {
                if (id) {
                    await DB.updateMaintenance(id, data);
                    Toast.success('Pemeliharaan berhasil diperbarui!');
                } else {
                    await DB.createMaintenance(data);
                    Toast.success('Pemeliharaan berhasil ditambahkan!');
                }

                Modal.close();
                await this.refresh();
                Dashboard.refresh();
            } catch (error) {
                console.error('Error saving maintenance:', error);
                Toast.error('Gagal menyimpan data');
            }
        });
    },

    async executeComplete(id) {
        try {
            await DB.completeMaintenance(id);
            await this.refresh();
            Dashboard.refresh();
            Toast.success('Pemeliharaan selesai!');
        } catch (error) {
            console.error('Error completing maintenance:', error);
            Toast.error('Gagal menyelesaikan pemeliharaan');
        }
    },

    async confirmDelete(id) {
        Modal.open('Konfirmasi Hapus', `
            <p>Apakah Anda yakin ingin menghapus data pemeliharaan ini?</p>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="Modal.close()">Batal</button>
                <button class="btn btn-danger" onclick="Maintenance.executeDelete('${id}')">Hapus</button>
            </div>
        `);
    },

    async executeDelete(id) {
        try {
            await DB.deleteMaintenance(id);
            Modal.close();
            await this.refresh();
            Dashboard.refresh();
            Toast.success('Data dihapus!');
        } catch (error) {
            console.error('Error deleting maintenance:', error);
            Toast.error('Gagal menghapus data');
        }
    },

    initEvents() {
        document.getElementById('add-maintenance-btn')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('maintenance-search')?.addEventListener('input', Utils.debounce(() => this.refresh(), 300));
        document.getElementById('maintenance-status-filter')?.addEventListener('change', () => this.refresh());
    }
};
