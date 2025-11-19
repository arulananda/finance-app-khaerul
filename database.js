// Database Configuration
const DB_NAME = 'FinanceAnalyticsDB';
const DB_VERSION = 2;
const STORE_NAME = 'financialRecords';

class FinancialDatabase {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Error membuka database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Database berhasil dibuka');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store if not exists
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    
                    // Create indexes for searching
                    store.createIndex('namaPerusahaan', 'namaPerusahaan', { unique: false });
                    store.createIndex('periode', 'periode', { unique: false });
                    store.createIndex('tanggalInput', 'tanggalInput', { unique: false });
                    store.createIndex('marginBersih', 'marginBersih', { unique: false });
                    
                    console.log('✅ Object store berhasil dibuat');
                }

                // Check if new indexes are needed
                const store = event.currentTarget.transaction.objectStore(STORE_NAME);
                if (!store.indexNames.contains('marginBersih')) {
                    store.createIndex('marginBersih', 'marginBersih', { unique: false });
                }
            };
        });
    }

    // Save data to database
    async simpanData(data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database belum diinisialisasi'));
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(data);

            request.onsuccess = () => {
                console.log('✅ Data berhasil disimpan:', data);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('❌ Error menyimpan data:', request.error);
                reject(request.error);
            };
        });
    }

    // Get all data
    async ambilSemuaData() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database belum diinisialisasi'));
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                console.log(`✅ ${request.result.length} data berhasil diambil`);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('❌ Error mengambil data:', request.error);
                reject(request.error);
            };
        });
    }

    // Search data by company name
    async cariData(namaPerusahaan) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database belum diinisialisasi'));
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('namaPerusahaan');
            const request = index.getAll(namaPerusahaan);

            request.onsuccess = () => {
                console.log(`🔍 ${request.result.length} data ditemukan untuk: ${namaPerusahaan}`);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('❌ Error mencari data:', request.error);
                reject(request.error);
            };
        });
    }

    // Delete data by ID
    async hapusData(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database belum diinisialisasi'));
                return;
            }

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log(`🗑️ Data berhasil dihapus: ${id}`);
                resolve(true);
            };

            request.onerror = () => {
                console.error('❌ Error menghapus data:', request.error);
                reject(request.error);
            };
        });
    }

    // Get data for trend analysis
    async ambilDataTrend() {
        const semuaData = await this.ambilSemuaData();
        
        // Sort by period
        return semuaData.sort((a, b) => a.periode.localeCompare(b.periode));
    }

    // Get data with high margin (>15%)
    async ambilDataMarginTinggi() {
        const semuaData = await this.ambilSemuaData();
        return semuaData.filter(item => parseFloat(item.marginBersih) > 15);
    }

    // Get data with high debt (>60%)
    async ambilDataHutangTinggi() {
        const semuaData = await this.ambilSemuaData();
        return semuaData.filter(item => parseFloat(item.rasioHutang) > 60);
    }

    // Get statistics summary
    async ambilStatistik() {
        const semuaData = await this.ambilSemuaData();
        
        if (semuaData.length === 0) {
            return {
                total: 0,
                perusahaan: 0,
                periode: 0,
                rataRataMargin: 0,
                rataRataROA: 0
            };
        }

        const uniqueCompanies = [...new Set(semuaData.map(item => item.namaPerusahaan))];
        const uniquePeriods = [...new Set(semuaData.map(item => item.periode))];
        
        const rataRataMargin = semuaData.reduce((sum, item) => sum + parseFloat(item.marginBersih), 0) / semuaData.length;
        const rataRataROA = semuaData.reduce((sum, item) => sum + parseFloat(item.roa), 0) / semuaData.length;

        return {
            total: semuaData.length,
            perusahaan: uniqueCompanies.length,
            periode: uniquePeriods.length,
            rataRataMargin: rataRataMargin.toFixed(2),
            rataRataROA: rataRataROA.toFixed(2)
        };
    }
}

// Initialize global database
let financialDB;

// Initialize database
async function initDatabase() {
    financialDB = new FinancialDatabase();
    await financialDB.init();
    return financialDB;
}

// Wrapper functions for database operations
async function simpanKeDatabase(data) {
    if (!financialDB) {
        await initDatabase();
    }
    return await financialDB.simpanData(data);
}

async function muatRiwayat() {
    if (!financialDB) {
        await initDatabase();
    }
    
    try {
        const semuaData = await financialDB.ambilSemuaData();
        tampilkanRiwayat(semuaData);
    } catch (error) {
        console.error('Error memuat riwayat:', error);
        showNotification('Gagal memuat riwayat!', 'error');
    }
}

async function cariRiwayat() {
    if (!financialDB) {
        await initDatabase();
    }
    
    const searchTerm = document.getElementById('searchInput').value.trim();
    
    try {
        let hasil;
        if (searchTerm) {
            hasil = await financialDB.cariData(searchTerm);
        } else {
            hasil = await financialDB.ambilSemuaData();
        }
        tampilkanRiwayat(hasil);
    } catch (error) {
        console.error('Error mencari riwayat:', error);
        showNotification('Gagal mencari data!', 'error');
    }
}

async function hapusAnalisis(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        return;
    }
    
    if (!financialDB) {
        await initDatabase();
    }
    
    try {
        await financialDB.hapusData(id);
        showNotification('Data berhasil dihapus!', 'success');
        muatRiwayat(); // Refresh list
    } catch (error) {
        console.error('Error menghapus data:', error);
        showNotification('Gagal menghapus data!', 'error');
    }
}

function tampilkanRiwayat(data) {
    const historyList = document.getElementById('historyList');
    
    if (data.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Belum ada data analisis</h3>
                <p>Mulai dengan menambahkan analisis baru</p>
            </div>
        `;
        return;
    }
    
    // Sort by latest first
    data.sort((a, b) => b.id - a.id);
    
    historyList.innerHTML = data.map(item => `
        <div class="history-item">
            <div class="history-header">
                <span class="company-name">${item.namaPerusahaan}</span>
                <span class="period">${formatPeriode(item.periode)}</span>
            </div>
            <div class="history-metrics">
                <div class="metric-small">
                    <h4>Pendapatan</h4>
                    <p>${formatRupiah(item.pendapatan)}</p>
                </div>
                <div class="metric-small">
                    <h4>Laba Bersih</h4>
                    <p>${formatRupiah(item.labaBersih)}</p>
                </div>
                <div class="metric-small">
                    <h4>Margin Bersih</h4>
                    <p class="${getMarginClass(item.marginBersih)}">${item.marginBersih}%</p>
                </div>
                <div class="metric-small">
                    <h4>ROA</h4>
                    <p class="${getRoaClass(item.roa)}">${item.roa}%</p>
                </div>
            </div>
            <div class="history-actions">
                <button onclick="lihatDetail(${item.id})" class="btn-small btn-primary">
                    <i class="fas fa-eye"></i> Detail
                </button>
                <button onclick="hapusAnalisis(${item.id})" class="btn-small btn-danger">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </div>
        </div>
    `).join('');
}

function getMarginClass(margin) {
    const value = parseFloat(margin);
    if (value > 15) return 'excellent';
    if (value > 10) return 'good';
    if (value > 5) return 'fair';
    if (value > 0) return 'poor';
    return 'critical';
}

function getRoaClass(roa) {
    const value = parseFloat(roa);
    if (value > 10) return 'excellent';
    if (value > 5) return 'good';
    if (value > 0) return 'fair';
    return 'poor';
}

async function lihatDetail(id) {
    if (!financialDB) {
        await initDatabase();
    }
    
    try {
        const semuaData = await financialDB.ambilSemuaData();
        const data = semuaData.find(item => item.id === id);
        
        if (data) {
            // Fill form with selected data
            document.getElementById('namaPerusahaan').value = data.namaPerusahaan;
            document.getElementById('periode').value = data.periode;
            document.getElementById('pendapatan').value = data.pendapatan;
            document.getElementById('hpp').value = data.hpp;
            document.getElementById('biayaOperasional').value = data.biayaOperasional;
            document.getElementById('aset').value = data.aset;
            document.getElementById('kewajiban').value = data.kewajiban;
            
            // Show analysis results
            tampilkanHasilAnalisis(data);
            
            // Switch to input tab
            openTab('input-tab');
            
            // Scroll to results
            document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
            
            showNotification('Data berhasil dimuat!', 'success');
        }
    } catch (error) {
        console.error('Error melihat detail:', error);
        showNotification('Gagal memuat detail data!', 'error');
    }
}

async function buatTrendChart() {
    if (!financialDB) {
        await initDatabase();
    }
    
    try {
        const dataTrend = await financialDB.ambilDataTrend();
        
        if (dataTrend.length === 0) {
            const ctx = document.getElementById('trendChart');
            if (ctx) {
                ctx.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-line"></i>
                        <h3>Belum ada data untuk trend analysis</h3>
                        <p>Tambahkan lebih banyak data untuk melihat trend</p>
                    </div>
                `;
            }
            return;
        }
        
        // [Kode untuk membuat trend chart...]
        
    } catch (error) {
        console.error('Error membuat trend chart:', error);
    }
}

// Initialize database when page loads
document.addEventListener('DOMContentLoaded', function() {
    initDatabase().catch(error => {
        console.error('Gagal menginisialisasi database:', error);
        showNotification('Error menginisialisasi database!', 'error');
    });
});

// Export database functions for global use
window.simpanKeDatabase = simpanKeDatabase;
window.muatRiwayat = muatRiwayat;
window.cariRiwayat = cariRiwayat;
window.hapusAnalisis = hapusAnalisis;
window.lihatDetail = lihatDetail;
window.buatTrendChart = buatTrendChart;