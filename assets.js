/**
 * Assets Module - CRUD operations for assets
 * Updated with async/await for Supabase support
 */

const Assets = {
    // UI Methods
    async refresh() {
        const search = document.getElementById('asset-search')?.value || '';
        const category = document.getElementById('asset-category-filter')?.value || '';

        try {
            const assets = await DB.getAssets({ search, category });
            this.renderTable(assets);
        } catch (error) {
            console.error('Error refreshing assets:', error);
            Toast.error('Gagal memuat data aset');
        }
    },

    renderTable(assets) {
        const tbody = document.getElementById('assets-table-body');
        if (!tbody) return;

        if (assets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                        </svg>
                        <p>Belum ada aset</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = assets.map(asset => {
            const totalQty = parseInt(asset.total_quantity) || 0;
            const availableQty = parseInt(asset.available_quantity) || 0;
            const stockPercent = totalQty > 0 ? (availableQty / totalQty) * 100 : 0;
            const stockClass = stockPercent === 0 ? 'empty' : stockPercent < 30 ? 'low' : '';
            const photo = asset.photo || asset.photo_url;

            return `
                <tr>
                    <td>
                        ${photo ?
                    `<img src="${photo}" class="photo-preview" alt="${Utils.escapeHtml(asset.name)}">` :
                    `<div class="photo-placeholder">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                                </svg>
                            </div>`
                }
                    </td>
                    <td><strong>${Utils.escapeHtml(asset.name)}</strong></td>
                    <td><span class="badge badge-${Utils.getCategoryColor(asset.category)}">${asset.category}</span></td>
                    <td>${Utils.escapeHtml(asset.brand || '-')}</td>
                    <td>
                        <div class="stock-display">
                            <div class="stock-bar">
                                <div class="stock-fill ${stockClass}" style="width: ${stockPercent}%"></div>
                            </div>
                            <span class="stock-text">${availableQty} / ${totalQty}</span>
                        </div>
                    </td>
                    <td><span class="badge badge-${Utils.getStatusColor(asset.condition)}">${Utils.translateStatus(asset.condition)}</span></td>
                    <td><span class="badge badge-${Utils.getStatusColor(asset.status)}">${Utils.translateStatus(asset.status)}</span></td>
                    <td>
                        <div class="table-actions" style="display:flex; gap:5px;">
                            <button class="btn-icon" onclick="tampilkanQR('${asset.id}', '${Utils.escapeHtml(asset.name)}')" title="Lihat QR Code" style="background:none; border:none; cursor:pointer; color:#4a90e2;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <path d="M3 14h7v7H3z"></path>
                                </svg>
                            </button>

                            <button class="edit-btn" onclick="Assets.showEditModal('${asset.id}')" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                </svg>
                            </button>

                            <button class="delete-btn" onclick="Assets.confirmDelete('${asset.id}')" title="Hapus">
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

    showAddModal() {
        const content = this.getFormHtml();
        Modal.open('Tambah Aset Baru', content);
        this.initForm();
    },

    async showEditModal(id) {
        try {
            const asset = await DB.getAssetById(id);
            if (!asset) {
                Toast.error('Aset tidak ditemukan');
                return;
            }

            const content = this.getFormHtml(asset);
            Modal.open('Edit Aset', content);
            this.initForm(asset);
        } catch (error) {
            console.error('Error loading asset:', error);
            Toast.error('Gagal memuat data aset');
        }
    },

    getFormHtml(asset = null) {
        const photoUrl = asset?.photo || asset?.photo_url || '';
        return `
            <form id="asset-form">
                <div class="form-group">
                    <label for="asset-name">Nama Barang *</label>
                    <input type="text" id="asset-name" class="form-control" value="${asset?.name || ''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="asset-category">Kategori *</label>
                        <select id="asset-category" class="form-control" required>
                            <option value="">Pilih Kategori</option>
                            <option value="Studio" ${asset?.category === 'Studio' ? 'selected' : ''}>Studio</option>
                            <option value="IT" ${asset?.category === 'IT' ? 'selected' : ''}>IT</option>
                            <option value="ATK" ${asset?.category === 'ATK' ? 'selected' : ''}>ATK</option>
                            <option value="Furniture" ${asset?.category === 'Furniture' ? 'selected' : ''}>Furniture</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="asset-brand">Merk</label>
                        <input type="text" id="asset-brand" class="form-control" value="${asset?.brand || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="asset-quantity">Jumlah Total *</label>
                        <input type="number" id="asset-quantity" class="form-control" min="1" value="${asset?.total_quantity || 1}" required>
                    </div>
                    <div class="form-group">
                        <label for="asset-condition">Kondisi *</label>
                        <select id="asset-condition" class="form-control" required>
                            <option value="Good" ${asset?.condition === 'Good' ? 'selected' : ''}>Baik</option>
                            <option value="Damaged" ${asset?.condition === 'Damaged' ? 'selected' : ''}>Rusak</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="asset-date">Tanggal Pembelian</label>
                        <input type="date" id="asset-date" class="form-control" value="${asset?.purchase_date || ''}">
                    </div>
                    <div class="form-group">
                        <label for="asset-price">Harga Pembelian</label>
                        <input type="number" id="asset-price" class="form-control" min="0" value="${asset?.purchase_price || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="asset-photo">Foto Barang</label>
                    <div class="photo-upload-container">
                        <input type="file" id="asset-photo" class="form-control" accept="image/*">
                        <div id="photo-preview" class="photo-preview-box ${photoUrl ? 'has-image' : ''}">
                            ${photoUrl ?
                `<img src="${photoUrl}" alt="Preview">
                                 <button type="button" class="remove-photo" onclick="Assets.removePhoto()">&times;</button>` :
                `<span>Preview foto akan muncul di sini</span>`
            }
                        </div>
                    </div>
                    <input type="hidden" id="asset-photo-data" value="${photoUrl}">
                </div>
                <div class="form-group">
                    <label for="asset-notes">Catatan</label>
                    <textarea id="asset-notes" class="form-control" rows="3">${asset?.notes || ''}</textarea>
                </div>
                <input type="hidden" id="asset-id" value="${asset?.id || ''}">
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Modal.close()">Batal</button>
                    <button type="submit" class="btn btn-primary">${asset ? 'Simpan' : 'Tambah'}</button>
                </div>
            </form>
        `;
    },

    removePhoto() {
        document.getElementById('asset-photo-data').value = '';
        document.getElementById('photo-preview').innerHTML = '<span>Preview foto akan muncul di sini</span>';
        document.getElementById('photo-preview').classList.remove('has-image');
        document.getElementById('asset-photo').value = '';
    },

    initForm(existing = null) {
        const form = document.getElementById('asset-form');
        const photoInput = document.getElementById('asset-photo');

        // Photo preview handler
        photoInput?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                Toast.error('Ukuran foto maksimal 2MB');
                photoInput.value = '';
                return;
            }

            // Convert to base64
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result;
                document.getElementById('asset-photo-data').value = base64;

                const preview = document.getElementById('photo-preview');
                preview.innerHTML = `
                    <img src="${base64}" alt="Preview">
                    <button type="button" class="remove-photo" onclick="Assets.removePhoto()">&times;</button>
                `;
                preview.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const photoData = document.getElementById('asset-photo-data').value;

            const data = {
                name: document.getElementById('asset-name').value,
                category: document.getElementById('asset-category').value,
                brand: document.getElementById('asset-brand').value || '',
                total_quantity: parseInt(document.getElementById('asset-quantity').value),
                condition: document.getElementById('asset-condition').value,
                purchase_date: document.getElementById('asset-date').value || null,
                purchase_price: parseInt(document.getElementById('asset-price').value) || 0,
                notes: document.getElementById('asset-notes').value,
                status: 'Active',
                photo: photoData
            };

            const id = document.getElementById('asset-id').value;

            try {
                if (id) {
                    await DB.updateAsset(id, data);
                    Toast.success('Aset berhasil diperbarui!');
                } else {
                    await DB.createAsset(data);
                    Toast.success('Aset berhasil ditambahkan!');
                }

                Modal.close();
                await this.refresh();
                Dashboard.refresh();
            } catch (error) {
                console.error('Error saving asset:', error);
                Toast.error('Gagal menyimpan aset');
            }
        });
    },

    async confirmDelete(id) {
        try {
            const asset = await DB.getAssetById(id);
            if (!asset) return;

            Modal.open('Konfirmasi Hapus', `
                <p>Apakah Anda yakin ingin menghapus aset <strong>${Utils.escapeHtml(asset.name)}</strong>?</p>
                <p style="color: var(--danger-500); font-size: var(--font-size-sm);">Tindakan ini tidak dapat dibatalkan.</p>
                <div class="form-actions">
                    <button class="btn btn-secondary" onclick="Modal.close()">Batal</button>
                    <button class="btn btn-danger" onclick="Assets.executeDelete('${id}')">Hapus</button>
                </div>
            `);
        } catch (error) {
            console.error('Error:', error);
        }
    },

    async executeDelete(id) {
        try {
            await DB.deleteAsset(id);
            Modal.close();
            await this.refresh();
            Dashboard.refresh();
            Toast.success('Aset berhasil dihapus!');
        } catch (error) {
            console.error('Error deleting asset:', error);
            Toast.error('Gagal menghapus aset');
        }
    },

    initEvents() {
        document.getElementById('add-asset-btn')?.addEventListener('click', () => this.showAddModal());

        const searchInput = document.getElementById('asset-search');
        searchInput?.addEventListener('input', Utils.debounce(() => this.refresh(), 300));

        document.getElementById('asset-category-filter')?.addEventListener('change', () => this.refresh());
    }
};
