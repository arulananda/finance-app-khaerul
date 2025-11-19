// Enhanced Dashboard functionality
class SuperDashboard {
    constructor() {
        this.data = [];
        this.stats = {};
        this.charts = {};
        this.isInitialized = false;
    }

    async init() {
        this.showLoading();
        try {
            await this.loadData();
            await this.calculateAdvancedStats();
            this.renderDashboard();
            this.hideLoading();
            this.isInitialized = true;
            
            // Update last update time
            this.updateLastUpdateTime();
            
            // Show welcome notification
            this.showWelcomeNotification();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.hideLoading();
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    async loadData() {
        if (!financialDB) {
            await initDatabase();
        }
        this.data = await financialDB.ambilSemuaData();
    }

    async calculateAdvancedStats() {
        if (this.data.length === 0) {
            this.setEmptyStats();
            return;
        }

        const totalAnalysis = this.data.length;
        const totalRevenue = this.data.reduce((sum, item) => sum + item.pendapatan, 0);
        const avgNetProfit = this.data.reduce((sum, item) => sum + item.labaBersih, 0) / totalAnalysis;
        
        const margins = this.data.map(item => parseFloat(item.marginBersih));
        const bestMargin = Math.max(...margins);
        const bestMarginItem = this.data.find(item => parseFloat(item.marginBersih) === bestMargin);
        
        const uniqueCompanies = [...new Set(this.data.map(item => item.namaPerusahaan))];
        const totalCompanies = uniqueCompanies.length;
        
        const activePeriods = [...new Set(this.data.map(item => item.periode))].length;
        
        const avgRoa = this.data.reduce((sum, item) => sum + parseFloat(item.roa), 0) / totalAnalysis;
        
        // Health Score Calculation
        const healthScores = this.data.map(item => this.calculateHealthScore(item));
        const avgHealthScore = healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length;

        // Trend calculation (simplified)
        const sortedData = this.data.sort((a, b) => new Date(a.periode) - new Date(b.periode));
        const recentData = sortedData.slice(-3);
        const olderData = sortedData.slice(0, -3);
        
        const recentAvgMargin = recentData.reduce((sum, item) => sum + parseFloat(item.marginBersih), 0) / recentData.length;
        const olderAvgMargin = olderData.reduce((sum, item) => sum + parseFloat(item.marginBersih), 0) / olderData.length;
        const marginTrend = olderAvgMargin > 0 ? ((recentAvgMargin - olderAvgMargin) / olderAvgMargin * 100) : 0;

        this.stats = {
            totalAnalysis,
            totalRevenue,
            avgNetProfit,
            bestMargin,
            bestMarginCompany: bestMarginItem?.namaPerusahaan || '-',
            totalCompanies,
            activePeriods,
            avgRoa: avgRoa.toFixed(1),
            avgHealthScore: avgHealthScore.toFixed(1),
            marginTrend: marginTrend.toFixed(1),
            totalDataPoints: totalAnalysis * 6 // Approximate data points
        };
    }

    calculateHealthScore(item) {
        const margin = parseFloat(item.marginBersih);
        const debt = parseFloat(item.rasioHutang);
        const roa = parseFloat(item.roa);

        let score = 0;
        
        // Margin scoring (0-4 points)
        if (margin > 20) score += 4;
        else if (margin > 15) score += 3;
        else if (margin > 8) score += 2;
        else if (margin > 0) score += 1;

        // ROA scoring (0-3 points)
        if (roa > 15) score += 3;
        else if (roa > 10) score += 2;
        else if (roa > 5) score += 1;

        // Debt scoring (0-3 points, inverse)
        if (debt < 30) score += 3;
        else if (debt < 50) score += 2;
        else if (debt < 70) score += 1;

        return Math.min(10, score);
    }

    setEmptyStats() {
        this.stats = {
            totalAnalysis: 0,
            totalRevenue: 0,
            avgNetProfit: 0,
            bestMargin: 0,
            bestMarginCompany: '-',
            totalCompanies: 0,
            activePeriods: 0,
            avgRoa: '0',
            avgHealthScore: '0',
            marginTrend: '0',
            totalDataPoints: 0
        };
    }

    renderDashboard() {
        this.renderKPICards();
        this.renderCharts();
        this.renderActivity();
        this.renderAlerts();
        this.renderQuickStats();
    }

    renderKPICards() {
        document.getElementById('totalRevenue').textContent = formatRupiah(this.stats.totalRevenue);
        document.getElementById('avgNetProfit').textContent = formatRupiah(this.stats.avgNetProfit);
        document.getElementById('bestMargin').textContent = this.stats.bestMargin + '%';
        document.getElementById('bestMarginCompany').textContent = this.stats.bestMarginCompany;
        document.getElementById('avgHealthScore').textContent = this.stats.avgHealthScore + '/10';
        document.getElementById('healthFill').style.width = (this.stats.avgHealthScore * 10) + '%';
        
        // Update trend indicators
        const trendElements = document.querySelectorAll('.kpi-trend');
        trendElements.forEach(el => {
            const isPositive = parseFloat(this.stats.marginTrend) >= 0;
            el.className = `kpi-trend ${isPositive ? 'positive' : 'negative'}`;
            el.innerHTML = `<i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i> ${Math.abs(this.stats.marginTrend)}%`;
        });
    }

    renderCharts() {
        this.createPerformanceTrendChart();
        this.createMarginDistributionChart();
        this.createHealthCategoryChart();
    }

    createPerformanceTrendChart() {
        const ctx = document.getElementById('performanceTrendChart').getContext('2d');
        
        if (this.charts.performanceTrend) {
            this.charts.performanceTrend.destroy();
        }

        // Group data by period
        const periodData = {};
        this.data.forEach(item => {
            if (!periodData[item.periode]) {
                periodData[item.periode] = [];
            }
            periodData[item.periode].push(item);
        });

        const periods = Object.keys(periodData).sort();
        const revenueData = periods.map(period => 
            periodData[period].reduce((sum, item) => sum + item.pendapatan, 0)
        );
        const profitData = periods.map(period => 
            periodData[period].reduce((sum, item) => sum + item.labaBersih, 0) / periodData[period].length
        );
        const marginData = periods.map(period => 
            periodData[period].reduce((sum, item) => sum + parseFloat(item.marginBersih), 0) / periodData[period].length
        );

        this.charts.performanceTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: periods.map(p => formatPeriode(p)),
                datasets: [
                    {
                        label: 'Pendapatan (Rp)',
                        data: revenueData,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        yAxisID: 'y',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Laba Bersih (Rp)',
                        data: profitData,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        yAxisID: 'y',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Margin Bersih (%)',
                        data: marginData,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        yAxisID: 'y1',
                        fill: true,
                        tension: 0.4
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
                            text: 'Nilai (Rp)'
                        },
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return 'Rp' + (value / 1000000).toFixed(1) + 'Jt';
                                } else if (value >= 1000) {
                                    return 'Rp' + (value / 1000).toFixed(0) + 'Rb';
                                }
                                return 'Rp' + value;
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Persentase (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Trend Kinerja Keuangan Over Time'
                    }
                }
            }
        });
    }

    createMarginDistributionChart() {
        const ctx = document.getElementById('marginDistributionChart').getContext('2d');
        
        if (this.charts.marginDistribution) {
            this.charts.marginDistribution.destroy();
        }

        const margins = this.data.map(item => parseFloat(item.marginBersih));
        
        const ranges = [
            { label: 'Excellent (>20%)', min: 20, max: 100, color: '#27ae60' },
            { label: 'Good (15-20%)', min: 15, max: 20, color: '#3498db' },
            { label: 'Fair (10-15%)', min: 10, max: 15, color: '#f39c12' },
            { label: 'Poor (5-10%)', min: 5, max: 10, color: '#e67e22' },
            { label: 'Critical (0-5%)', min: 0, max: 5, color: '#e74c3c' },
            { label: 'Loss (<0%)', min: -100, max: 0, color: '#7f8c8d' }
        ];

        const distribution = ranges.map(range => {
            return margins.filter(margin => margin > range.min && margin <= range.max).length;
        });

        this.charts.marginDistribution = new Chart(ctx, {
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
    }

    createHealthCategoryChart() {
        const ctx = document.getElementById('healthCategoryChart').getContext('2d');
        
        if (this.charts.healthCategory) {
            this.charts.healthCategory.destroy();
        }

        const healthCategories = {
            'Excellent (8-10)': 0,
            'Good (6-7)': 0,
            'Fair (4-5)': 0,
            'Poor (2-3)': 0,
            'Critical (0-1)': 0
        };

        this.data.forEach(item => {
            const score = this.calculateHealthScore(item);
            if (score >= 8) healthCategories['Excellent (8-10)']++;
            else if (score >= 6) healthCategories['Good (6-7)']++;
            else if (score >= 4) healthCategories['Fair (4-5)']++;
            else if (score >= 2) healthCategories['Poor (2-3)']++;
            else healthCategories['Critical (0-1)']++;
        });

        const colors = {
            'Excellent (8-10)': '#27ae60',
            'Good (6-7)': '#3498db',
            'Fair (4-5)': '#f39c12',
            'Poor (2-3)': '#e67e22',
            'Critical (0-1)': '#e74c3c'
        };

        this.charts.healthCategory = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(healthCategories),
                datasets: [{
                    label: 'Jumlah Perusahaan',
                    data: Object.values(healthCategories),
                    backgroundColor: Object.keys(healthCategories).map(cat => colors[cat]),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Jumlah Perusahaan'
                        }
                    }
                }
            }
        });
    }

    renderActivity() {
        const activityList = document.getElementById('recentActivityList');
        const recentData = this.data.sort((a, b) => b.id - a.id).slice(0, 5);

        if (recentData.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <p>Belum ada aktivitas analisis</p>
                    <div class="activity-time">Mulai dengan membuat analisis baru</div>
                </div>
            `;
            return;
        }

        activityList.innerHTML = recentData.map(item => `
            <div class="activity-item">
                <strong>${item.namaPerusahaan}</strong> - Analisis ${formatPeriode(item.periode)}
                <div class="activity-metrics">
                    <small>Margin: ${item.marginBersih}% | ROA: ${item.roa}%</small>
                </div>
                <div class="activity-time">${this.formatTimeAgo(item.tanggalInput)}</div>
            </div>
        `).join('');
    }

    renderAlerts() {
        const alertList = document.getElementById('alertList');
        const alerts = this.generateAlerts();

        if (alerts.length === 0) {
            alertList.innerHTML = `
                <div class="alert-item info">
                    <p>Tidak ada alert saat ini</p>
                    <div class="alert-time">Semua sistem berjalan normal</div>
                </div>
            `;
            return;
        }

        alertList.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <p><strong>${alert.title}</strong></p>
                <p>${alert.message}</p>
                <div class="alert-time">${alert.time}</div>
            </div>
        `).join('');
    }

    generateAlerts() {
        const alerts = [];
        const now = new Date();

        // Low margin alert
        const lowMarginCompanies = this.data.filter(item => parseFloat(item.marginBersih) < 5);
        if (lowMarginCompanies.length > 0) {
            alerts.push({
                type: 'warning',
                title: 'Margin Rendah Terdeteksi',
                message: `${lowMarginCompanies.length} perusahaan memiliki margin di bawah 5%`,
                time: this.formatTimeAgo(now.toISOString())
            });
        }

        // High debt alert
        const highDebtCompanies = this.data.filter(item => parseFloat(item.rasioHutang) > 70);
        if (highDebtCompanies.length > 0) {
            alerts.push({
                type: 'danger',
                title: 'Rasio Hutang Tinggi',
                message: `${highDebtCompanies.length} perusahaan memiliki rasio hutang >70%`,
                time: this.formatTimeAgo(now.toISOString())
            });
        }

        // Data age alert
        const oldestData = this.data.sort((a, b) => new Date(a.tanggalInput) - new Date(b.tanggalInput))[0];
        if (oldestData) {
            const dataAge = (now - new Date(oldestData.tanggalInput)) / (1000 * 60 * 60 * 24);
            if (dataAge > 30) {
                alerts.push({
                    type: 'info',
                    title: 'Data Perlu Update',
                    message: 'Beberapa data sudah berusia lebih dari 30 hari',
                    time: this.formatTimeAgo(now.toISOString())
                });
            }
        }

        return alerts.slice(0, 3); // Max 3 alerts
    }

    renderQuickStats() {
        document.getElementById('totalDataPoints').textContent = this.stats.totalDataPoints + ' Data Points';
        document.getElementById('totalCompanies').textContent = this.stats.totalCompanies;
        document.getElementById('totalAnalysis').textContent = this.stats.totalAnalysis;
        document.getElementById('activePeriods').textContent = this.stats.activePeriods;
        document.getElementById('avgRoa').textContent = this.stats.avgRoa + '%';
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInHours = (now - time) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'Beberapa menit yang lalu';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} jam yang lalu`;
        } else {
            return `${Math.floor(diffInHours / 24)} hari yang lalu`;
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = 
            `Last update: ${now.toLocaleTimeString()}`;
    }

    showWelcomeNotification() {
        if (this.data.length === 0) {
            setTimeout(() => {
                alert('Selamat datang di FinanceAnalytics! 🎉\n\nMulai dengan menambahkan data keuangan pertama Anda di tab "Analisis Baru".');
            }, 1000);
        }
    }

    updateTrendChart() {
        // This would update the trend chart based on selected period
        console.log('Updating trend chart...');
    }
}

// Global dashboard instance
let superDashboard;

// Initialize enhanced dashboard
async function initSuperDashboard() {
    superDashboard = new SuperDashboard();
    await superDashboard.init();
}

// Refresh dashboard
async function refreshSuperDashboard() {
    if (superDashboard) {
        await superDashboard.init();
        showNotification('Dashboard diperbarui!', 'success');
    }
}

// Update tab navigation for super dashboard
const originalOpenTab = window.openTab;
window.openTab = function(tabName) {
    originalOpenTab(tabName);
    
    if (tabName === 'dashboard-tab') {
        setTimeout(() => {
            if (superDashboard) {
                refreshSuperDashboard();
            } else {
                initSuperDashboard();
            }
        }, 100);
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initSuperDashboard().catch(error => {
            console.error('Gagal menginisialisasi dashboard:', error);
        });
    }, 500);
});