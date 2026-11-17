import { Component, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { KPIData, DepartmentStat, PriorityStat, TrendStat, Ticket } from '../../core/models/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <!-- Title & Action Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="fw-bold mb-1 text-dark">Executive Operations Dashboard</h4>
          <p class="text-secondary small mb-0">Real-time shop-floor issue tracking and AI ticket intelligence</p>
        </div>
        <div class="d-flex gap-2">
          <a routerLink="/simulator" class="btn btn-outline-success btn-sm d-flex align-items-center">
            <i class="bi bi-whatsapp me-1"></i> WhatsApp Sandbox
          </a>
          <button (click)="loadDashboardData()" class="btn btn-light border btn-sm d-flex align-items-center" [disabled]="loading">
            <i class="bi bi-arrow-clockwise me-1" [class.spin]="loading"></i> Refresh
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100 p-3">
            <span class="text-secondary small fw-semibold text-uppercase">Total Issues</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0 text-dark">{{ kpis?.total_tickets ?? 0 }}</h3>
              <i class="bi bi-inbox-fill text-muted fs-4"></i>
            </div>
            <small class="text-muted mt-2" style="font-size: 0.72rem;">All platforms</small>
          </div>
        </div>

        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100 p-3 border-start border-primary border-4">
            <span class="text-primary small fw-semibold text-uppercase">Open</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0 text-primary">{{ kpis?.open_tickets ?? 0 }}</h3>
              <i class="bi bi-exclamation-circle text-primary fs-4"></i>
            </div>
            <small class="text-muted mt-2" style="font-size: 0.72rem;">Awaiting triage</small>
          </div>
        </div>

        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100 p-3 border-start border-purple border-4">
            <span class="text-purple small fw-semibold text-uppercase" style="color: #7c3aed;">In Progress</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0" style="color: #7c3aed;">{{ kpis?.in_progress_tickets ?? 0 }}</h3>
              <i class="bi bi-gear-wide-connected fs-4" style="color: #7c3aed;"></i>
            </div>
            <small class="text-muted mt-2" style="font-size: 0.72rem;">Under maintenance</small>
          </div>
        </div>

        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100 p-3 border-start border-danger border-4">
            <span class="text-danger small fw-semibold text-uppercase">Critical</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0 text-danger">{{ kpis?.critical_tickets ?? 0 }}</h3>
              <i class="bi bi-fire text-danger fs-4"></i>
            </div>
            <small class="text-danger mt-2" style="font-size: 0.72rem;">Production stoppage</small>
          </div>
        </div>

        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100 p-3 border-start border-warning border-4">
            <span class="text-warning-emphasis small fw-semibold text-uppercase">Needs Review</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0 text-warning-emphasis">{{ kpis?.needs_review_tickets ?? 0 }}</h3>
              <i class="bi bi-patch-question-fill text-warning fs-4"></i>
            </div>
            <small class="text-muted mt-2" style="font-size: 0.72rem;">Ambiguous issue</small>
          </div>
        </div>

        <div class="col-6 col-md-4 col-xl-2">
          <div class="card h-100 p-3 border-start border-success border-4">
            <span class="text-success small fw-semibold text-uppercase">Resolved</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0 text-success">{{ kpis?.resolved_tickets ?? 0 }}</h3>
              <i class="bi bi-check2-circle text-success fs-4"></i>
            </div>
            <small class="text-muted mt-2" style="font-size: 0.72rem;">Rate: {{ kpis?.resolution_rate_percent ?? 0 }}%</small>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="row g-4 mb-4">
        <!-- 7-Day Trend Line Chart -->
        <div class="col-12 col-lg-8">
          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="bi bi-graph-up me-2 text-primary"></i> 7-Day Incident Influx</span>
              <span class="badge bg-light text-muted border">Daily Volume</span>
            </div>
            <div class="card-body">
              <div style="height: 250px;">
                <canvas #trendChart></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Priority Breakdown Doughnut Chart -->
        <div class="col-12 col-lg-4">
          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="bi bi-pie-chart-fill me-2 text-warning"></i> Issues by Priority</span>
              <span class="badge bg-light text-muted border">Distribution</span>
            </div>
            <div class="card-body d-flex align-items-center justify-content-center">
              <div style="height: 220px; width: 100%;">
                <canvas #priorityChart></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Department Distribution & Recent Activity Row -->
      <div class="row g-4">
        <!-- Department Load Breakdown -->
        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="bi bi-building me-2 text-info"></i> Department Load</span>
              <span class="badge bg-light text-muted border">Active Tickets</span>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th class="text-center">Open</th>
                      <th class="text-center">In Progress</th>
                      <th class="text-center">Resolved</th>
                      <th class="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let dept of departmentStats">
                      <td class="fw-semibold">{{ dept.department_name }}</td>
                      <td class="text-center"><span class="badge bg-primary-subtle text-primary">{{ dept.open_tickets }}</span></td>
                      <td class="text-center"><span class="badge bg-purple-subtle text-purple">{{ dept.in_progress_tickets }}</span></td>
                      <td class="text-center"><span class="badge bg-success-subtle text-success">{{ dept.resolved_tickets }}</span></td>
                      <td class="text-end fw-bold">{{ dept.total_tickets }}</td>
                    </tr>
                    <tr *ngIf="departmentStats.length === 0">
                      <td colspan="5" class="text-center py-4 text-muted">No department statistics available</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Operational Tickets -->
        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="bi bi-clock-history me-2 text-secondary"></i> Recent Plant Tickets</span>
              <a routerLink="/tickets" class="small text-decoration-none fw-semibold">View All &rarr;</a>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Issue</th>
                      <th>Dept</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let t of recentTickets" style="cursor: pointer;" [routerLink]="['/tickets']" [queryParams]="{ id: t.id }">
                      <td class="fw-bold text-primary">{{ t.ticket_number }}</td>
                      <td class="text-truncate" style="max-width: 160px;" title="{{ t.issue_title }}">{{ t.issue_title }}</td>
                      <td><span class="badge bg-light text-dark border">{{ t.department_code || 'TBD' }}</span></td>
                      <td>
                        <span class="badge" [ngClass]="getPriorityBadgeClass(t.priority)">{{ t.priority }}</span>
                      </td>
                      <td>
                        <span class="badge" [ngClass]="getStatusBadgeClass(t.status)">{{ t.status }}</span>
                      </td>
                    </tr>
                    <tr *ngIf="recentTickets.length === 0">
                      <td colspan="5" class="text-center py-4 text-muted">No tickets registered yet</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class DashboardComponent implements OnInit {
  @ViewChild('trendChart') trendChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('priorityChart') priorityChartCanvas!: ElementRef<HTMLCanvasElement>;

  api = inject(ApiService);

  kpis: KPIData | null = null;
  departmentStats: DepartmentStat[] = [];
  recentTickets: Ticket[] = [];
  loading = false;

  private trendChartInstance: Chart | null = null;
  private priorityChartInstance: Chart | null = null;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load KPIs
    this.api.getKPIs().subscribe({
      next: (data) => this.kpis = data,
      error: (e) => console.error(e)
    });

    // Load Department Breakdown
    this.api.getDepartmentStats().subscribe({
      next: (data) => this.departmentStats = data,
      error: (e) => console.error(e)
    });

    // Load Recent Tickets
    this.api.getTickets({ page: 1, size: 6 }).subscribe({
      next: (res) => {
        this.recentTickets = res.items;
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });

    // Render Charts
    this.renderCharts();
  }

  renderCharts(): void {
    // 7-Day Trend
    this.api.getTrends(7).subscribe({
      next: (trends: TrendStat[]) => {
        setTimeout(() => {
          if (!this.trendChartCanvas) return;
          if (this.trendChartInstance) this.trendChartInstance.destroy();

          this.trendChartInstance = new Chart(this.trendChartCanvas.nativeElement, {
            type: 'line',
            data: {
              labels: trends.map(t => t.date),
              datasets: [{
                label: 'Issues Logged',
                data: trends.map(t => t.tickets),
                borderColor: '#0284c7',
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#0284c7',
                pointRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
              }
            }
          });
        }, 100);
      }
    });

    // Priority Distribution
    this.api.getPriorityStats().subscribe({
      next: (stats: PriorityStat[]) => {
        setTimeout(() => {
          if (!this.priorityChartCanvas) return;
          if (this.priorityChartInstance) this.priorityChartInstance.destroy();

          this.priorityChartInstance = new Chart(this.priorityChartCanvas.nativeElement, {
            type: 'doughnut',
            data: {
              labels: stats.map(s => s.priority),
              datasets: [{
                data: stats.map(s => s.count),
                backgroundColor: ['#dc2626', '#f97316', '#eab308', '#22c55e'],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12 } }
              }
            }
          });
        }, 100);
      }
    });
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'Critical': return 'badge-critical';
      case 'High': return 'badge-high';
      case 'Medium': return 'badge-medium';
      case 'Low': return 'badge-low';
      default: return 'bg-secondary';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Open': return 'badge-open';
      case 'In Progress': return 'badge-in-progress';
      case 'Resolved': return 'badge-resolved';
      case 'Closed': return 'badge-closed';
      default: return 'bg-secondary text-white';
    }
  }
}
