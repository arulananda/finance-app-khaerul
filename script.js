// Main application functionality
let financialChart = null;
let trendChart = null;

// Tab Navigation
function openTab(tabName) {
    // Hide all tabs
    const tabs = document.getElementsByClassName('tab-content');
    for (let tab of tabs) {
        tab.classList.remove('active');
    }
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Update tab buttons
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let button of tabButtons) {
        button.classList.remove('active');
    }
    event.currentTarget.classList.add('active');
    
    // Load data when switching to specific tabs
    if (tabName === 'history-tab') {
        setTimeout(() => muatRiwayat(), 100);
    } else if (tabName === 'report-tab') {
        setTimeout(() => buatTrendChart(), 100);
    }
}

// Save and analyze data
async function simpanData() {
    // Get input values
    const namaPerusahaan = document.getElementById('namaPerusahaan').value;
    const periode = document.getElementById('periode').value;
    const pendapatan = parseFloat(document.getElementById('pendapatan').value) || 0;
    const hpp = parseFloat(document.getElementById('hpp').value) || 0;
    const biayaOperasional = parseFloat(document.getElementById('biayaOperasional').value) || 0;
    const aset = parseFloat(document.getElementById('aset').value) || 0;
    const kewajiban = parseFloat(document.getElementById('kewajiban').value) || 0;

    // Validation
    if (!namaPerusahaan || !periode) {
        showNotification('Nama perusahaan dan periode harus diisi!', 'error');
        return;
    }

    if (pendapatan === 0) {
        showNotification('Silakan masukkan data pendapatan terlebih dahulu!', 'error');
        return;
    }

    // Calculate financial metrics
    const analisisData = hitungAnalisisKeuangan(pendapatan, hpp, biayaOperasional, aset, kewajiban);
    
    // Save to database
    const data = {
        id: Date.now(), // Unique ID based on timestamp
        namaPerusahaan,
        periode,
        pendapatan,
        hpp,
        biayaOperasional,
        aset,
        kewajiban,
        ...analisisData,
        tanggalInput: new Date().toISOString()
    };

    try {
        await simpanKeDatabase(data);
        tampilkanHasilAnalisis(analisisData);
        showNotification('Data berhasil disimpan! ✅', 'success');
        
        // Refresh dashboard if it exists
        if (superDashboard) {
            setTimeout(() => superDashboard.init(), 500);
        }
    } catch (error) {
        console.error('Error menyimpan data:', error);
        showNotification('Gagal menyimpan data! ❌', 'error');
    }
}

// Calculate financial analysis
function hitungAnalisisKeuangan(pendapatan, hpp, biayaOperasional, aset, kewajiban) {
    const labaKotor = pendapatan - hpp;
    const labaBersih = labaKotor - biayaOperasional;
    const marginKotor = pendapatan > 0 ? ((labaKotor / pendapatan) * 100).toFixed(2) : 0;
    const marginBersih = pendapatan > 0 ? ((labaBersih / pendapatan) * 100).toFixed(2) : 0;
    const roa = aset > 0 ? ((labaBersih / aset) * 100).toFixed(2) : 0;
    const rasioHutang = aset > 0 ? ((kewajiban / aset) * 100).toFixed(2) : 0;

    return {
        labaKotor,
        labaBersih,
        marginKotor,
        marginBersih,
        roa,
        rasioHutang
    };
}

// Display analysis results
function tampilkanHasilAnalisis(analisisData) {
    // Display results
    document.getElementById('labaKotor').textContent = formatRupiah(analisisData.labaKotor);
    document.getElementById('labaBersih').textContent = formatRupiah(analisisData.labaBersih);
    document.getElementById('marginKotor').textContent = analisisData.marginKotor + '%';
    document.getElementById('marginBersih').textContent = analisisData.marginBersih + '%';
    document.getElementById('roa').textContent = analisisData.roa + '%';
    document.getElementById('rasioHutang').textContent = analisisData.rasioHutang + '%';

    // Show results section
    document.getElementById('results').style.display = 'block';

    // Create chart
    buatChart(
        parseFloat(document.getElementById('pendapatan').value),
        parseFloat(document.getElementById('hpp').value),
        parseFloat(document.getElementById('biayaOperasional').value),
        analisisData.labaBersih
    );

    // Provide interpretation
    berikanInterpretasi(analisisData.marginBersih, analisisData.roa, analisisData.rasioHutang);
}

// Format currency in Rupiah
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

// Create financial chart
function buatChart(pendapatan, hpp, biayaOperasional, labaBersih) {
    const ctx = document.getElementById('financialChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (financialChart) {
        financialChart.destroy();
    }

    financialChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pendapatan', 'HPP', 'Biaya Operasional', 'Laba Bersih'],
            datasets: [{
                label: 'Nilai (Rp)',
                data: [pendapatan, hpp, biayaOperasional, labaBersih],
                backgroundColor: [
                    '#27ae60',
                    '#e74c3c',
                    '#f39c12',
                    '#3498db'
                ],
                borderColor: [
                    '#219a52',
                    '#c0392b',
                    '#d35400',
                    '#2980b9'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Grafik Analisis Keuangan'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000000) {
                                return 'Rp' + (value / 1000000000).toFixed(1) + 'M';
                            } else if (value >= 1000000) {
                                return 'Rp' + (value / 1000000).toFixed(1) + 'Jt';
                            } else if (value >= 1000) {
                                return 'Rp' + (value / 1000).toFixed(0) + 'Rb';
                            }
                            return 'Rp' + value;
                        }
                    }
                }
            }
        }
    });
}

// Provide financial interpretation
function berikanInterpretasi(marginBersih, roa, rasioHutang) {
    const interpretasiElement = document.getElementById('interpretasi');
    let interpretasi = '';

    const margin = parseFloat(marginBersih);
    if (margin > 20) {
        interpretasi += '✅ <strong>Margin Laba Bersih sangat baik</strong> (>20%). Perusahaan memiliki profitabilitas yang excellent.<br><br>';
    } else if (margin > 10) {
        interpretasi += '👍 <strong>Margin Laba Bersih baik</strong> (10-20%). Perusahaan memiliki profitabilitas yang sehat.<br><br>';
    } else if (margin > 5) {
        interpretasi += '⚠️ <strong>Margin Laba Bersih cukup</strong> (5-10%). Perusahaan masih profitabel tetapi perlu efisiensi.<br><br>';
    } else if (margin > 0) {
        interpretasi += '🔶 <strong>Margin Laba Bersih rendah</strong> (0-5%). Perusahaan perlu meningkatkan efisiensi operasional.<br><br>';
    } else {
        interpretasi += '❌ <strong>Perusahaan mengalami kerugian</strong>. Perlu evaluasi menyeluruh terhadap bisnis model.<br><br>';
    }

    const roaValue = parseFloat(roa);
    if (roaValue > 15) {
        interpretasi += '✅ <strong>ROA sangat baik</strong> (>15%). Aset perusahaan digunakan sangat efektif.<br><br>';
    } else if (roaValue > 8) {
        interpretasi += '👍 <strong>ROA baik</strong> (8-15%). Penggunaan aset cukup efisien.<br><br>';
    } else if (roaValue > 5) {
        interpretasi += '⚠️ <strong>ROA cukup</strong> (5-8%). Perlu optimasi penggunaan aset.<br><br>';
    } else {
        interpretasi += '🔶 <strong>ROA rendah</strong> (<5%). Efisiensi penggunaan aset perlu ditingkatkan.<br><br>';
    }

    const hutang = parseFloat(rasioHutang);
    if (hutang < 30) {
        interpretasi += '✅ <strong>Struktur modal sehat</strong> (Rasio hutang <30%). Risiko keuangan rendah.<br><br>';
    } else if (hutang < 50) {
        interpretasi += '👍 <strong>Struktur modal cukup sehat</strong> (Rasio hutang 30-50%). Masih dalam batas wajar.<br><br>';
    } else if (hutang < 70) {
        interpretasi += '⚠️ <strong>Perhatian: Rasio hutang tinggi</strong> (50-70%). Perlu monitoring ketat.<br><br>';
    } else {
        interpretasi += '❌ <strong>Rasio hutang sangat tinggi</strong> (>70%). Berisiko terhadap kelangsungan usaha.<br><br>';
    }

    interpretasi += '<strong>Rekomendasi:</strong><br>';
    if (margin < 5 || hutang > 50) {
        interpretasi += '- Tingkatkan efisiensi operasional<br>';
        interpretasi += '- Optimalkan pengelolaan piutang dan persediaan<br>';
        interpretasi += '- Pertimbangkan restrukturisasi hutang<br>';
        interpretasi += '- Lakukan analisis break-even point<br>';
    } else {
        interpretasi += '- Pertahankan kinerja yang baik<br>';
        interpretasi += '- Eksplorasi peluang ekspansi bisnis<br>';
        interpretasi += '- Tingkatkan investasi pada aset produktif<br>';
        interpretasi += '- Optimalkan struktur modal<br>';
    }

    interpretasiElement.innerHTML = interpretasi;
}

// Reset form
function resetForm() {
    document.getElementById('namaPerusahaan').value = '';
    document.getElementById('periode').value = '';
    document.getElementById('pendapatan').value = '';
    document.getElementById('hpp').value = '';
    document.getElementById('biayaOperasional').value = '';
    document.getElementById('aset').value = '';
    document.getElementById('kewajiban').value = '';
    document.getElementById('results').style.display = 'none';
    
    showNotification('Form telah direset!', 'info');
}

// Show notification
function showNotification(message, type) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        background: ${type === 'success' ? '#27ae60' : 
                     type === 'error' ? '#e74c3c' : 
                     type === 'info' ? '#3498db' : '#f39c12'};
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    // Add icon based on type
    const icon = type === 'success' ? '✅' : 
                 type === 'error' ? '❌' : 
                 type === 'info' ? 'ℹ️' : '⚠️';
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2em;">${icon}</span>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Format period display
function formatPeriode(periode) {
    if (!periode) return '-';
    
    const [tahun, bulan] = periode.split('-');
    const namaBulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ][parseInt(bulan) - 1];
    
    return `${namaBulan} ${tahun}`;
}

// Event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Enter key support for inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                simpanData();
            }
        });
    });
    
    // Set default period to current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('periode').value = `${year}-${month}`;
    
    // Add input validation
    inputs.forEach(input => {
        input.addEventListener('input', function(e) {
            if (this.type === 'number' && this.value < 0) {
                this.value = 0;
            }
        });
    });
    
    console.log('Aplikasi Analisis Keuangan siap digunakan! 🚀');
});