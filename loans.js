/**
 * Loans Module - Loan transactions management
 * Updated with async/await for Supabase support
 */

const Loans = {
    async refresh() {
        const search = document.getElementById('loan-search')?.value || '';
        const status = document.getElementById('loan-status-filter')?.value || '';

        try {
            const loans = await DB.getLoans({ status, activeOnly: true });
            await this.renderTable(loans, search);
        } catch (error) {
            console.error('Error refreshing loans:', error);
            Toast.error('Gagal memuat data peminjaman');
        }
    },

    async renderTable(loans, searchFilter = '') {
        const tbody = document.getElementById('loans-table-body');
        if (!tbody) return;

        // Filter by search if needed
        let filteredLoans = loans;
        if (searchFilter) {
            const search = searchFilter.toLowerCase();
            filteredLoans = loans.filter(l => {
                const borrowerName = l.borrower_name || '';
                const assetName = l.asset_name || '';
                return borrowerName.toLowerCase().includes(search) ||
                    assetName.toLowerCase().includes(search);
            });
        }

        if (filteredLoans.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                        </svg>
                        <p>Tidak ada peminjaman aktif</p>
                    </td>
                </tr>
            `;
            return;
        }

        const html = await Promise.all(filteredLoans.map(async loan => {
            // Get borrower and asset names (from view or fetch)
            let borrowerName = loan.borrower_name;
            let borrowerClass = loan.borrower_class;
            let borrowerRole = loan.borrower_role;
            let assetName = loan.asset_name;

            if (!borrowerName) {
                const borrower = await DB.getBorrowerById(loan.borrower_id);
                borrowerName = borrower?.name || 'Unknown';
                borrowerClass = borrower?.class;
                borrowerRole = borrower?.role;
            }
            if (!assetName) {
                const asset = await DB.getAssetById(loan.asset_id);
                assetName = asset?.name || 'Unknown';
            }

            return `
                <tr>
                    <td>
                        <strong>${Utils.escapeHtml(borrowerName)}</strong>
                        <br><span class="text-sm" style="color: var(--gray-500)">${borrowerClass || Utils.translateStatus(borrowerRole)}</span>
                    </td>
                    <td>${Utils.escapeHtml(assetName)}</td>
                    <td>${loan.quantity}</td>
                    <td>${Utils.formatDate(loan.loan_date)}</td>
                    <td>${Utils.formatDate(loan.planned_return_date)}</td>
                    <td><span class="badge badge-${Utils.getStatusColor(loan.status)}">${Utils.translateStatus(loan.status)}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="return-btn" onclick="Loans.showReturnModal('${loan.id}')" title="Kembalikan">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>
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
            const borrowers = await DB.getBorrowers({});
            const allAssets = await DB.getAssets({});
            const assets = allAssets.filter(a => a.available_quantity > 0 && a.status === 'Active');

            const content = `
                <form id="loan-form">
                    <div class="form-group">
                        <label for="loan-borrower">Peminjam *</label>
                        <select id="loan-borrower" class="form-control" required>
                            <option value="">Pilih Peminjam</option>
                            ${borrowers.map(b => `<option value="${b.id}">${Utils.escapeHtml(b.name)} (${b.class || Utils.translateStatus(b.role)})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="loan-asset">Barang *</label>
                        <select id="loan-asset" class="form-control" required>
                            <option value="">Pilih Barang</option>
                            ${assets.map(a => `<option value="${a.id}" data-max="${a.available_quantity}">${Utils.escapeHtml(a.name)} (Tersedia: ${a.available_quantity})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="loan-quantity">Jumlah *</label>
                        <input type="number" id="loan-quantity" class="form-control" min="1" value="1" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="loan-date">Tanggal Pinjam *</label>
                            <input type="date" id="loan-date" class="form-control" value="${Utils.getToday()}" required>
                        </div>
                        <div class="form-group">
                            <label for="loan-return-date">Rencana Kembali *</label>
                            <input type="date" id="loan-return-date" class="form-control" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="loan-condition">Kondisi Saat Pinjam *</label>
                        <select id="loan-condition" class="form-control" required>
                            <option value="Good">Baik</option>
                            <option value="Damaged">Rusak</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="Modal.close()">Batal</button>
                        <button type="submit" class="btn btn-primary">Pinjam</button>
                    </div>
                </form>
            `;

            Modal.open('Peminjaman Baru', content);
            this.initLoanForm();
        } catch (error) {
            console.error('Error loading form data:', error);
            Toast.error('Gagal memuat data form');
        }
    },

    initLoanForm() {
        const form = document.getElementById('loan-form');
        const assetSelect = document.getElementById('loan-asset');
        const quantityInput = document.getElementById('loan-quantity');

        assetSelect?.addEventListener('change', () => {
            const max = assetSelect.options[assetSelect.selectedIndex]?.dataset.max || 1;
            quantityInput.max = max;
            if (parseInt(quantityInput.value) > parseInt(max)) {
                quantityInput.value = max;
            }
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                borrower_id: document.getElementById('loan-borrower').value,
                asset_id: document.getElementById('loan-asset').value,
                quantity: parseInt(document.getElementById('loan-quantity').value),
                loan_date: document.getElementById('loan-date').value,
                planned_return_date: document.getElementById('loan-return-date').value,
                condition_on_loan: document.getElementById('loan-condition').value
            };

            try {
                await DB.createLoan(data);
                Toast.success('Peminjaman berhasil dibuat!');
                Modal.close();
                await this.refresh();
                Dashboard.refresh();
            } catch (error) {
                console.error('Error creating loan:', error);
                Toast.error('Gagal membuat peminjaman');
            }
        });
    },

    async showReturnModal(id) {
        try {
            const loan = await DB.getLoanById(id);
            if (!loan) return;

            const borrower = await DB.getBorrowerById(loan.borrower_id);
            const asset = await DB.getAssetById(loan.asset_id);

            const content = `
                <form id="return-form">
                    <div style="background: var(--gray-50); padding: var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-5);">
                        <p><strong>Peminjam:</strong> ${Utils.escapeHtml(borrower?.name || 'Unknown')}</p>
                        <p><strong>Barang:</strong> ${Utils.escapeHtml(asset?.name || 'Unknown')} (${loan.quantity} unit)</p>
                        <p><strong>Tanggal Pinjam:</strong> ${Utils.formatDate(loan.loan_date)}</p>
                    </div>
                    <div class="form-group">
                        <label for="return-date">Tanggal Kembali *</label>
                        <input type="date" id="return-date" class="form-control" value="${Utils.getToday()}" required>
                    </div>
                    <div class="form-group">
                        <label for="return-condition">Kondisi Barang *</label>
                        <select id="return-condition" class="form-control" required>
                            <option value="Good">Baik</option>
                            <option value="Damaged">Rusak</option>
                        </select>
                    </div>
                    <input type="hidden" id="return-loan-id" value="${id}">
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="Modal.close()">Batal</button>
                        <button type="submit" class="btn btn-success">Kembalikan</button>
                    </div>
                </form>
            `;

            Modal.open('Pengembalian Barang', content);
            this.initReturnForm();
        } catch (error) {
            console.error('Error loading loan:', error);
            Toast.error('Gagal memuat data peminjaman');
        }
    },

    initReturnForm() {
        const form = document.getElementById('return-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('return-loan-id').value;
            const data = {
                return_date: document.getElementById('return-date').value,
                condition: document.getElementById('return-condition').value
            };

            try {
                await DB.returnLoan(id, data);

                if (data.condition === 'Damaged') {
                    Toast.warning('Barang dikembalikan dengan kondisi rusak. Record pemeliharaan telah dibuat.');
                } else {
                    Toast.success('Barang berhasil dikembalikan!');
                }

                Modal.close();
                await this.refresh();
                Dashboard.refresh();
            } catch (error) {
                console.error('Error returning loan:', error);
                Toast.error('Gagal mengembalikan barang');
            }
        });
    },

    initEvents() {
        document.getElementById('add-loan-btn')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('loan-search')?.addEventListener('input', Utils.debounce(() => this.refresh(), 300));
        document.getElementById('loan-status-filter')?.addEventListener('change', () => this.refresh());
    }
};

// History Module
const History = {
    async refresh() {
        const search = document.getElementById('history-search')?.value || '';
        const status = document.getElementById('history-status-filter')?.value || '';

        try {
            const loans = await DB.getLoans({ status });
            await this.renderTable(loans, search);
        } catch (error) {
            console.error('Error refreshing history:', error);
        }
    },

    async renderTable(loans, searchFilter = '') {
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;

        // Filter by search if needed
        let filteredLoans = loans;
        if (searchFilter) {
            const search = searchFilter.toLowerCase();
            filteredLoans = loans.filter(l => {
                const borrowerName = l.borrower_name || '';
                const assetName = l.asset_name || '';
                return borrowerName.toLowerCase().includes(search) ||
                    assetName.toLowerCase().includes(search);
            });
        }

        if (filteredLoans.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><p>Belum ada riwayat</p></td></tr>`;
            return;
        }

        const html = await Promise.all(filteredLoans.map(async loan => {
            let borrowerName = loan.borrower_name;
            let assetName = loan.asset_name;

            if (!borrowerName) {
                const borrower = await DB.getBorrowerById(loan.borrower_id);
                borrowerName = borrower?.name || 'Unknown';
            }
            if (!assetName) {
                const asset = await DB.getAssetById(loan.asset_id);
                assetName = asset?.name || 'Unknown';
            }

            return `
                <tr>
                    <td>${Utils.escapeHtml(borrowerName)}</td>
                    <td>${Utils.escapeHtml(assetName)}</td>
                    <td>${loan.quantity}</td>
                    <td>${Utils.formatDate(loan.loan_date)}</td>
                    <td>${Utils.formatDate(loan.actual_return_date)}</td>
                    <td>${loan.condition_on_return ? `<span class="badge badge-${Utils.getStatusColor(loan.condition_on_return)}">${Utils.translateStatus(loan.condition_on_return)}</span>` : '-'}</td>
                    <td><span class="badge badge-${Utils.getStatusColor(loan.status)}">${Utils.translateStatus(loan.status)}</span></td>
                </tr>
            `;
        }));

        tbody.innerHTML = html.join('');
    },

    initEvents() {
        document.getElementById('history-search')?.addEventListener('input', Utils.debounce(() => this.refresh(), 300));
        document.getElementById('history-status-filter')?.addEventListener('change', () => this.refresh());
    }
};
