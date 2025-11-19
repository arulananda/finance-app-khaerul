// ===== DASHBOARD FEATURES =====

const dashboard = {
    // Initialize dashboard
    init: function() {
        this.loadQuickStats();
        this.setupEventListeners();
        
        // Show welcome message for first time users
        this.showWelcomeMessage();
    },

    // Open tab
    openTab: function(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName).classList.add('active');
        event.currentTarget.classList.add('active');

        // Load tab-specific content
        switch(tabName) {
            case 'history-tab':
                historyManager.loadHistory();
                break;
            case 'reports-tab':
                reports.loadReports();
                break;
        }
    },

    // Load quick stats for welcome banner
    loadQuickStats: function() {
        const stats = database.getAnalysisStats();
        const quickStatsElement = document.getElementById('quickStats');
        
        if (!quickStatsElement) return;

        quickStatsElement.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Analisis</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.companies}</div>
                <div class="stat-label">Perusahaan</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.avgNetMargin}%</div>
                <div class="stat-label">Rata-rata Margin</div>
            </div>
        `;
    },

    // Setup event listeners
    setupEventListeners: function() {
        // Enter key support in analysis form
        const analysisInputs = document.querySelectorAll('#analysisForm input');
        analysisInputs.forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    analysis.calculate();
                }
            });
        });

        // Real-time input validation
        document.getElementById('revenue')?.addEventListener('input', function(e) {
            if (this.value < 0) this.value = 0;
        });

        document.getElementById('cogs')?.addEventListener('input', function(e) {
            if (this.value < 0) this.value = 0;
        });

        document.getElementById('expenses')?.addEventListener('input', function(e) {
            if (this.value < 0) this.value = 0;
        });
    },

    // Show welcome message for new users
    showWelcomeMessage: function() {
        const userAnalysis = database.getUserAnalysis();
        if (userAnalysis.length === 0) {
            setTimeout(() => {
                analysis.showNotification(
                    '🎉 Selamat datang! Mulai dengan menganalisis data keuangan pertama Anda.',
                    'info'
                );
            }, 1000);
        }
    }
};

// ===== HISTORY MANAGEMENT =====

const historyManager = {
    // Load and display history
    loadHistory: function() {
        const userAnalysis = database.getUserAnalysis();
        const historyList = document.getElementById('historyList');
        
        if (!historyList) return;

        if (userAnalysis.length === 0) {
            historyList.innerHTML = `
                <div class="history-item" style="text-align: center;">
                    <p style="color: var(--gray); margin-bottom: 10px;">📝 Belum ada riwayat analisis</p>
                    <p style="color: var(--gray-light); font-size: 14px;">
                        Analisis keuangan pertama Anda akan muncul di sini
                    </p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = userAnalysis.map(analysis => `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-company">${analysis.companyName}</span>
                    <span class="history-period">${formatPeriod(analysis.period)}</span>
                </div>
                
                <div class="history-metrics">
                    <div class="history-metric">
                        <span>${analysis.formatRupiah ? analysis.formatRupiah(analysis.revenue) : 'Rp ' + analysis.revenue?.toLocaleString('id-ID')}</span>
                        <small>Pendapatan</small>
                    </div>
                    <div class="history-metric">
                        <span>${analysis.formatRupiah ? analysis.formatRupiah(analysis.netProfit) : 'Rp ' + analysis.netProfit?.toLocaleString('id-ID')}</span>
                        <small>Laba Bersih</small>
                    </div>
                    <div class="history-metric">
                        <span style="color: ${analysis.netMargin > 15 ? '#27ae60' : analysis.netMargin > 5 ? '#f39c12' : '#e74c3c'}">
                            ${analysis.netMargin}%
                        </span>
                        <small>Margin</small>
                    </div>
                </div>
                
                <div class="history-actions">
                    <button class="btn-secondary" onclick="historyManager.viewAnalysis(${analysis.id})" style="padding: 6px 12px; font-size: 12px;">
                        👁️ Lihat
                    </button>
                    <button class="logout-btn" onclick="historyManager.deleteAnalysis(${analysis.id})" style="padding: 6px 12px; font-size: 12px;">
                        🗑️ Hapus
                    </button>
                </div>
                
                <div style="margin-top: 8px; font-size: 12px; color: var(--gray);">
                    ${new Date(analysis.timestamp).toLocaleString('id-ID')}
                </div>
            </div>
        `).join('');
    },

    // Search history
    search: function() {
        const searchTerm = document.getElementById('searchHistory').value.toLowerCase();
        const userAnalysis = database.getUserAnalysis();
        const historyList = document.getElementById('historyList');
        
        const filteredAnalysis = userAnalysis.filter(analysis => 
            analysis.companyName.toLowerCase().includes(searchTerm) ||
            analysis.period.includes(searchTerm)
        );

        if (filteredAnalysis.length === 0) {
            historyList.innerHTML = `
                <div class="history-item" style="text-align: center;">
                    <p style="color: var(--gray);">🔍 Tidak ditemukan analisis dengan kata kunci "${searchTerm}"</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = filteredAnalysis.map(analysis => `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-company">${analysis.companyName}</span>
                    <span class="history-period">${formatPeriod(analysis.period)}</span>
                </div>
                
                <div class="history-metrics">
                    <div class="history-metric">
                        <span>Rp ${analysis.revenue?.toLocaleString('id-ID')}</span>
                        <small>Pendapatan</small>
                    </div>
                    <div class="history-metric">
                        <span>Rp ${analysis.netProfit?.toLocaleString('id-ID')}</span>
                        <small>Laba Bersih</small>
                    </div>
                    <div class="history-metric">
                        <span>${analysis.netMargin}%</span>
                        <small>Margin</small>
                    </div>
                </div>
                
                <div class="history-actions">
                    <button class="btn-secondary" onclick="historyManager.viewAnalysis(${analysis.id})" style="padding: 6px 12px; font-size: 12px;">
                        👁️ Lihat
                    </button>
                    <button class="logout-btn" onclick="historyManager.deleteAnalysis(${analysis.id})" style="padding: 6px 12px; font-size: 12px;">
                        🗑️ Hapus
                    </button>
                </div>
            </div>
        `).join('');
    },

    // View analysis details
    viewAnalysis: function(analysisId) {
        const userAnalysis = database.getUserAnalysis();
        const analysis = userAnalysis.find(a => a.id === analysisId);
        
        if (analysis) {
            // Switch to analysis tab
            dashboard.openTab('analysis-tab');
            
            // Fill form with analysis data
            document.getElementById('companyName').value = analysis.companyName;
            document.getElementById('period').value = analysis.period;
            document.getElementById('revenue').value = analysis.revenue;
            document.getElementById('cogs').value = analysis.cogs;
            document.getElementById('expenses').value = analysis.expenses;
            
            // Calculate and show results
            setTimeout(() => {
                analysis.calculate();
                analysis.showNotification('📊 Data analisis berhasil dimuat!', 'success');
            }, 500);
        }
    },

    // Delete analysis
    deleteAnalysis: function(analysisId) {
        if (confirm('Apakah Anda yakin ingin menghapus analisis ini?')) {
            database.deleteAnalysis(analysisId);
            this.loadHistory();
            dashboard.loadQuickStats();
            analysis.showNotification('✅ Analisis berhasil dihapus!', 'success');
        }
    },

    // Clear all history
    clearAll: function() {
        if (confirm('Apakah Anda yakin ingin menghapus SEMUA riwayat analisis? Tindakan ini tidak dapat dibatalkan!')) {
            database.clearUserAnalysis();
            this.loadHistory();
            dashboard.loadQuickStats();
            analysis.showNotification('🗑️ Semua riwayat berhasil dihapus!', 'success');
        }
    }
};

// ===== REPORTS & ANALYTICS =====

const reports = {
    // Load reports and charts
    loadReports: function() {
        this.createProfitabilityChart();
        this.createMarginDistributionChart();
    },

    // Create profitability trend chart
    createProfitabilityChart: function() {
        const userAnalysis = database.getUserAnalysis();
        const ctx = document.getElementById('profitabilityChart');
        
        if (!ctx || userAnalysis.length === 0) {
            ctx.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Tidak ada data untuk ditampilkan</p>';
            return;
        }

        // Sort by timestamp and get last 6 records
        const sortedAnalysis = userAnalysis
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .slice(-6);

        const labels = sortedAnalysis.map(a => 
            `${a.companyName} (${formatPeriod(a.period)})`
        );
        const revenueData = sortedAnalysis.map(a => a.revenue);
        const netProfitData = sortedAnalysis.map(a => a.netProfit);
        const marginData = sortedAnalysis.map(a => parseFloat(a.netMargin));

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Pendapatan',
                        data: revenueData,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        yAxisID: 'y',
                        fill: true
                    },
                    {
                        label: 'Laba Bersih',
                        data: netProfitData,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        yAxisID: 'y',
                        fill: true
                    },
                    {
                        label: 'Margin (%)',
                        data: marginData,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        yAxisID: 'y1',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Nilai (Rupiah)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Margin (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    },

    // Create margin distribution chart
    createMarginDistributionChart: function() {
        const userAnalysis = database.getUserAnalysis();
        const ctx = document.getElementById('marginDistributionChart');
        
        if (!ctx || userAnalysis.length === 0) {
            ctx.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 40px;">Tidak ada data untuk ditampilkan</p>';
            return;
        }

        const margins = userAnalysis.map(a => parseFloat(a.netMargin)).filter(m => !isNaN(m));
        
        const ranges = [
            { label: 'Excellent (>20%)', min: 20, max: 100, color: '#27ae60' },
            { label: 'Good (15-20%)', min: 15, max: 20, color: '#3498db' },
            { label: 'Fair (10-15%)', min: 10, max: 15, color: '#f39c12' },
            { label: 'Poor (5-10%)', min: 5, max: 10, color: '#e67e22' },
            { label: 'Critical (0-5%)', min: 0, max: 5, color: '#e74c3c' }
        ];

        const distribution = ranges.map(range => {
            return margins.filter(margin => margin > range.min && margin <= range.max).length;
        });

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ranges.map(range => range.label),
                datasets: [{
                    data: distribution,
                    backgroundColor: ranges.map(range => range.color),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    },

    // Export to PDF
    exportToPDF: function() {
        analysis.showNotification('📊 Fitur export PDF akan segera hadir!', 'info');
    },

    // Export to Excel
    exportToExcel: function() {
        const csvData = database.exportUserData('csv');
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `finance-analysis-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        analysis.showNotification('✅ Data berhasil diexport ke CSV!', 'success');
    }
};

// Add formatRupiah to analysis objects for history display
if (typeof analysis !== 'undefined' && analysis.formatRupiah) {
    // This will be used in history display
}
