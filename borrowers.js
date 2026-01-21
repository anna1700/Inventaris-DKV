/**
 * Borrowers Module - CRUD operations for borrowers
 * Updated with async/await for Supabase support
 */

const Borrowers = {
    async refresh() {
        const search = document.getElementById('borrower-search')?.value || '';
        const role = document.getElementById('borrower-role-filter')?.value || '';

        try {
            const borrowers = await DB.getBorrowers({ search, role });
            await this.renderTable(borrowers);
        } catch (error) {
            console.error('Error refreshing borrowers:', error);
            Toast.error('Gagal memuat data peminjam');
        }
    },

    async renderTable(borrowers) {
        const tbody = document.getElementById('borrowers-table-body');
        if (!tbody) return;

        if (borrowers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        </svg>
                        <p>Belum ada peminjam</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Get loan counts
        const loans = await DB.getLoans({});

        tbody.innerHTML = borrowers.map(b => {
            const borrowerLoans = loans.filter(l => l.borrower_id === b.id);
            const activeLoans = borrowerLoans.filter(l => l.status !== 'Returned');
            const totalLoans = borrowerLoans.length;

            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(b.name)}</strong></td>
                    <td><span class="badge badge-${b.role === 'Student' ? 'info' : 'purple'}">${Utils.translateStatus(b.role)}</span></td>
                    <td>${b.class || '-'}</td>
                    <td>
                        <span class="loan-count ${activeLoans.length > 0 ? 'has-active' : ''}">
                            ${activeLoans.length > 0 ? `<strong>${activeLoans.length}</strong> aktif / ` : ''}${totalLoans} total
                        </span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="view-btn" onclick="Borrowers.showDetailModal('${b.id}')" title="Lihat Peminjaman">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                            <button class="edit-btn" onclick="Borrowers.showEditModal('${b.id}')" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                </svg>
                            </button>
                            <button class="delete-btn" onclick="Borrowers.confirmDelete('${b.id}')" title="Hapus">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async showDetailModal(id) {
        try {
            const borrower = await DB.getBorrowerById(id);
            if (!borrower) {
                Toast.error('Peminjam tidak ditemukan');
                return;
            }

            // Get all loans for this borrower
            const allLoans = await DB.getLoans({});
            const borrowerLoans = allLoans.filter(l => l.borrower_id === id);
            const activeLoans = borrowerLoans.filter(l => l.status !== 'Returned');

            // Get asset details for each loan
            const loansWithDetails = await Promise.all(activeLoans.map(async loan => {
                let assetName = loan.asset_name;
                if (!assetName) {
                    const asset = await DB.getAssetById(loan.asset_id);
                    assetName = asset?.name || 'Unknown';
                }
                return { ...loan, asset_name: assetName };
            }));

            const roleText = borrower.role === 'Student' ? 'Siswa' : 'Guru';
            const classText = borrower.class ? ` - ${borrower.class}` : '';

            let content = `
                <div class="borrower-detail">
                    <div class="detail-header">
                        <div class="detail-avatar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                        </div>
                        <div class="detail-info">
                            <h4>${Utils.escapeHtml(borrower.name)}</h4>
                            <span class="badge badge-${borrower.role === 'Student' ? 'info' : 'purple'}">${roleText}${classText}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h5>📋 Barang yang Sedang Dipinjam</h5>
            `;

            if (loansWithDetails.length === 0) {
                content += `
                    <div class="empty-state" style="padding: var(--space-4);">
                        <p>Tidak ada barang yang sedang dipinjam</p>
                    </div>
                `;
            } else {
                content += `<div class="loan-list">`;

                for (const loan of loansWithDetails) {
                    const isLate = loan.status === 'Late';
                    const dueDate = new Date(loan.planned_return_date);
                    const today = new Date();
                    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                    let dueText = '';
                    if (isLate) {
                        dueText = `<span class="due-text late">Terlambat ${Math.abs(daysLeft)} hari</span>`;
                    } else if (daysLeft <= 0) {
                        dueText = `<span class="due-text late">Jatuh tempo hari ini</span>`;
                    } else if (daysLeft <= 3) {
                        dueText = `<span class="due-text warning">Sisa ${daysLeft} hari</span>`;
                    } else {
                        dueText = `<span class="due-text">Sisa ${daysLeft} hari</span>`;
                    }

                    content += `
                        <div class="loan-item ${isLate ? 'is-late' : ''}">
                            <div class="loan-item-main">
                                <span class="loan-asset-name">${Utils.escapeHtml(loan.asset_name)}</span>
                                <span class="loan-quantity">${loan.quantity} unit</span>
                            </div>
                            <div class="loan-item-meta">
                                <span>Pinjam: ${Utils.formatDate(loan.loan_date)}</span>
                                <span>Kembali: ${Utils.formatDate(loan.planned_return_date)}</span>
                                ${dueText}
                            </div>
                        </div>
                    `;
                }

                content += `</div>`;
            }

            content += `
                    </div>
                    
                    <div class="detail-section">
                        <h5>📊 Statistik Peminjaman</h5>
                        <div class="stats-mini">
                            <div class="stat-mini">
                                <span class="stat-mini-value">${activeLoans.length}</span>
                                <span class="stat-mini-label">Sedang Dipinjam</span>
                            </div>
                            <div class="stat-mini">
                                <span class="stat-mini-value">${borrowerLoans.filter(l => l.status === 'Returned').length}</span>
                                <span class="stat-mini-label">Sudah Dikembalikan</span>
                            </div>
                            <div class="stat-mini">
                                <span class="stat-mini-value">${borrowerLoans.filter(l => l.status === 'Late').length}</span>
                                <span class="stat-mini-label">Pernah Terlambat</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="Modal.close()">Tutup</button>
                    </div>
                </div>
            `;

            Modal.open(`Detail Peminjam: ${borrower.name}`, content);
        } catch (error) {
            console.error('Error loading borrower detail:', error);
            Toast.error('Gagal memuat detail peminjam');
        }
    },

    showAddModal() {
        Modal.open('Tambah Peminjam', this.getFormHtml());
        this.initForm();
    },

    async showEditModal(id) {
        try {
            const borrower = await DB.getBorrowerById(id);
            if (!borrower) {
                Toast.error('Peminjam tidak ditemukan');
                return;
            }
            Modal.open('Edit Peminjam', this.getFormHtml(borrower));
            this.initForm(borrower);
        } catch (error) {
            console.error('Error loading borrower:', error);
            Toast.error('Gagal memuat data peminjam');
        }
    },

    getFormHtml(b = null) {
        return `
            <form id="borrower-form">
                <div class="form-group">
                    <label for="borrower-name">Nama *</label>
                    <input type="text" id="borrower-name" class="form-control" value="${b?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="borrower-role">Role *</label>
                    <select id="borrower-role" class="form-control" required>
                        <option value="Student" ${b?.role === 'Student' ? 'selected' : ''}>Siswa</option>
                        <option value="Teacher" ${b?.role === 'Teacher' ? 'selected' : ''}>Guru</option>
                    </select>
                </div>
                <div class="form-group" id="class-group" ${b?.role === 'Teacher' ? 'style="display:none"' : ''}>
                    <label for="borrower-class">Kelas</label>
                    <input type="text" id="borrower-class" class="form-control" value="${b?.class || ''}" placeholder="Contoh: XII DKV 1">
                </div>
                <input type="hidden" id="borrower-id" value="${b?.id || ''}">
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Batal</button>
                    <button type="submit" class="btn btn-primary">${b ? 'Simpan' : 'Tambah'}</button>
                </div>
            </form>
        `;
    },

    initForm(existing = null) {
        const form = document.getElementById('borrower-form');
        const roleSelect = document.getElementById('borrower-role');
        const classGroup = document.getElementById('class-group');

        roleSelect?.addEventListener('change', () => {
            classGroup.style.display = roleSelect.value === 'Teacher' ? 'none' : 'block';
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('borrower-name').value,
                role: document.getElementById('borrower-role').value,
                class: document.getElementById('borrower-role').value === 'Student'
                    ? document.getElementById('borrower-class').value
                    : null
            };
            const id = document.getElementById('borrower-id').value;

            try {
                if (id) {
                    await DB.updateBorrower(id, data);
                    Toast.success('Peminjam berhasil diperbarui!');
                } else {
                    await DB.createBorrower(data);
                    Toast.success('Peminjam berhasil ditambahkan!');
                }

                Modal.close();
                await this.refresh();
            } catch (error) {
                console.error('Error saving borrower:', error);
                Toast.error('Gagal menyimpan peminjam');
            }
        });
    },

    async confirmDelete(id) {
        try {
            const b = await DB.getBorrowerById(id);
            if (!b) return;

            Modal.open('Konfirmasi Hapus', `
                <p>Apakah Anda yakin ingin menghapus peminjam <strong>${Utils.escapeHtml(b.name)}</strong>?</p>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="Modal.close()">Batal</button>
                    <button class="btn btn-danger" onclick="Borrowers.executeDelete('${id}')">Hapus</button>
                </div>
            `);
        } catch (error) {
            console.error('Error:', error);
        }
    },

    async executeDelete(id) {
        try {
            await DB.deleteBorrower(id);
            Modal.close();
            await this.refresh();
            Toast.success('Peminjam berhasil dihapus!');
        } catch (error) {
            console.error('Error deleting borrower:', error);
            Toast.error('Gagal menghapus peminjam');
        }
    },

    initEvents() {
        document.getElementById('add-borrower-btn')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('borrower-search')?.addEventListener('input', Utils.debounce(() => this.refresh(), 300));
        document.getElementById('borrower-role-filter')?.addEventListener('change', () => this.refresh());
    }
};
