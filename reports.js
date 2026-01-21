/**
 * Reports Module - Export to PDF and Excel
 * Updated with async/await for Supabase support
 */

const Reports = {
    async exportAssets(format) {
        try {
            const assets = await DB.getAssets();
            const data = assets.map(a => ({
                'Nama Barang': a.name,
                'Kategori': a.category,
                'Merk': a.brand || '-',
                'Total': a.total_quantity,
                'Tersedia': a.available_quantity,
                'Kondisi': Utils.translateStatus(a.condition),
                'Status': Utils.translateStatus(a.status),
                'Harga Beli': Utils.formatCurrency(a.purchase_price || 0)
            }));

            if (format === 'pdf') {
                this.generatePDF('Laporan Aset', data, ['Nama Barang', 'Kategori', 'Merk', 'Total', 'Tersedia', 'Kondisi', 'Status']);
            } else {
                this.generateExcel('Laporan_Aset', data);
            }
        } catch (error) {
            console.error('Error exporting assets:', error);
            Toast.error('Gagal mengexport laporan aset');
        }
    },

    async exportLoans(format) {
        try {
            const startDate = document.getElementById('report-date-start')?.value;
            const endDate = document.getElementById('report-date-end')?.value;

            let loans = await DB.getLoans({});

            // Apply date filters
            if (startDate) {
                loans = loans.filter(l => l.loan_date >= startDate);
            }
            if (endDate) {
                loans = loans.filter(l => l.loan_date <= endDate);
            }

            // Get borrower and asset details
            const data = await Promise.all(loans.map(async l => {
                let borrowerName = l.borrower_name;
                let assetName = l.asset_name;

                // Fetch names if not available (for LocalStorage mode)
                if (!borrowerName) {
                    const borrower = await DB.getBorrowerById(l.borrower_id);
                    borrowerName = borrower?.name || '-';
                }
                if (!assetName) {
                    const asset = await DB.getAssetById(l.asset_id);
                    assetName = asset?.name || '-';
                }

                return {
                    'Peminjam': borrowerName,
                    'Barang': assetName,
                    'Jumlah': l.quantity,
                    'Tanggal Pinjam': Utils.formatDate(l.loan_date),
                    'Rencana Kembali': Utils.formatDate(l.planned_return_date),
                    'Tanggal Kembali': l.actual_return_date ? Utils.formatDate(l.actual_return_date) : '-',
                    'Kondisi Kembali': l.condition_on_return ? Utils.translateStatus(l.condition_on_return) : '-',
                    'Status': Utils.translateStatus(l.status)
                };
            }));

            if (format === 'pdf') {
                this.generatePDF('Laporan Peminjaman', data, ['Peminjam', 'Barang', 'Jumlah', 'Tanggal Pinjam', 'Status']);
            } else {
                this.generateExcel('Laporan_Peminjaman', data);
            }
        } catch (error) {
            console.error('Error exporting loans:', error);
            Toast.error('Gagal mengexport laporan peminjaman');
        }
    },

    async exportMaintenance(format) {
        try {
            const records = await DB.getMaintenance({});

            const data = await Promise.all(records.map(async m => {
                let assetName = m.asset_name;

                if (!assetName) {
                    const asset = await DB.getAssetById(m.asset_id);
                    assetName = asset?.name || '-';
                }

                return {
                    'Aset': assetName,
                    'Tanggal': Utils.formatDate(m.maintenance_date),
                    'Teknisi': m.technician || '-',
                    'Estimasi Biaya': Utils.formatCurrency(m.estimated_cost || 0),
                    'Status': Utils.translateStatus(m.status),
                    'Catatan': m.notes || '-'
                };
            }));

            if (format === 'pdf') {
                this.generatePDF('Laporan Pemeliharaan', data, ['Aset', 'Tanggal', 'Teknisi', 'Estimasi Biaya', 'Status']);
            } else {
                this.generateExcel('Laporan_Pemeliharaan', data);
            }
        } catch (error) {
            console.error('Error exporting maintenance:', error);
            Toast.error('Gagal mengexport laporan pemeliharaan');
        }
    },

    generatePDF(title, data, columns) {
        try {
            if (typeof window.jspdf === 'undefined') {
                Toast.error('Library PDF belum dimuat');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, 22);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Dicetak: ${Utils.formatDate(Utils.getToday())}`, 14, 30);
            doc.text('Sistem Peminjaman Barang - DKV', 14, 36);

            // Table
            const tableData = data.map(row => columns.map(col => String(row[col] || '-')));

            doc.autoTable({
                head: [columns],
                body: tableData,
                startY: 42,
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [99, 102, 241],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Halaman ${i} dari ${pageCount}`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }

            const filename = `${title.replace(/\s/g, '_')}_${Utils.getToday()}.pdf`;
            doc.save(filename);
            Toast.success(`PDF berhasil diexport: ${filename}`);
        } catch (error) {
            console.error('PDF export error:', error);
            Toast.error('Gagal export PDF: ' + error.message);
        }
    },

    generateExcel(filename, data) {
        try {
            if (typeof XLSX === 'undefined') {
                Toast.error('Library Excel belum dimuat');
                return;
            }

            const ws = XLSX.utils.json_to_sheet(data);

            // Set column widths
            const colWidths = Object.keys(data[0] || {}).map(key => ({
                wch: Math.max(key.length, 15)
            }));
            ws['!cols'] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Data');

            const fullFilename = `${filename}_${Utils.getToday()}.xlsx`;
            XLSX.writeFile(wb, fullFilename);
            Toast.success(`Excel berhasil diexport: ${fullFilename}`);
        } catch (error) {
            console.error('Excel export error:', error);
            Toast.error('Gagal export Excel: ' + error.message);
        }
    }
};
