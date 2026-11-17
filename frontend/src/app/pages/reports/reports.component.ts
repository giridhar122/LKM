import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { KPIData, DepartmentStat, PriorityStat } from '../../core/models/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <!-- Title & Export Buttons -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="fw-bold mb-1 text-dark">Management Information System (MIS) Reports</h4>
          <p class="text-secondary small mb-0">Plant operational reliability, MTTR (Mean Time to Resolve), and departmental resolution metrics</p>
        </div>
        <div class="d-flex gap-2">
          <button (click)="downloadCsv()" [disabled]="exportingCsv" class="btn btn-outline-dark btn-sm d-flex align-items-center">
            <span *ngIf="exportingCsv" class="spinner-border spinner-border-sm me-1"></span>
            <i *ngIf="!exportingCsv" class="bi bi-filetype-csv me-1"></i> Export CSV
          </button>
          <button (click)="downloadExcel()" [disabled]="exportingExcel" class="btn btn-success btn-sm d-flex align-items-center">
            <span *ngIf="exportingExcel" class="spinner-border spinner-border-sm me-1"></span>
            <i *ngIf="!exportingExcel" class="bi bi-file-earmark-excel-fill me-1"></i> Export Excel (.xlsx)
          </button>
        </div>
      </div>

      <!-- High-Level Metric Tiles -->
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-3">
          <div class="card p-3 shadow-sm border">
            <span class="text-muted small fw-semibold text-uppercase">Resolution Rate</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0 text-success">{{ kpis?.resolution_rate_percent ?? 0 }}%</h3>
              <i class="bi bi-pie-chart text-success fs-3"></i>
            </div>
            <div class="progress mt-2" style="height: 6px;">
              <div class="progress-bar bg-success" [style.width.%]="kpis?.resolution_rate_percent ?? 0"></div>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-3">
          <div class="card p-3 shadow-sm border">
            <span class="text-muted small fw-semibold text-uppercase">Avg Resolution Time</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0 text-primary">{{ kpis?.avg_resolution_hours ?? 0 }} <small class="fs-6 text-muted">hrs</small></h3>
              <i class="bi bi-stopwatch text-primary fs-3"></i>
            </div>
            <small class="text-muted mt-2" style="font-size: 0.72rem;">MTTR based on resolved logs</small>
          </div>
        </div>

        <div class="col-12 col-md-3">
          <div class="card p-3 shadow-sm border">
            <span class="text-muted small fw-semibold text-uppercase">Pending Operations</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0 text-warning-emphasis">
                {{ (kpis?.open_tickets ?? 0) + (kpis?.in_progress_tickets ?? 0) }}
              </h3>
              <i class="bi bi-hourglass-split text-warning fs-3"></i>
            </div>
            <small class="text-muted mt-2" style="font-size: 0.72rem;">Open + In Progress</small>
          </div>
        </div>

        <div class="col-12 col-md-3">
          <div class="card p-3 shadow-sm border">
            <span class="text-muted small fw-semibold text-uppercase">Critical Line Stops</span>
            <div class="d-flex align-items-baseline justify-content-between mt-2">
              <h3 class="fw-bold mb-0 text-danger">{{ kpis?.critical_tickets ?? 0 }}</h3>
              <i class="bi bi-exclamation-octagon text-danger fs-3"></i>
            </div>
            <small class="text-danger mt-2" style="font-size: 0.72rem;">Immediate intervention</small>
          </div>
        </div>
      </div>

      <!-- Department Performance Matrix -->
      <div class="card shadow-sm border mb-4">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <span class="fw-bold text-dark"><i class="bi bi-table text-primary me-2"></i> Department Performance & Triage Matrix</span>
          <span class="badge bg-light text-muted border">Live Data</span>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Code</th>
                <th class="text-center">Total Incidents</th>
                <th class="text-center">Open (Backlog)</th>
                <th class="text-center">In Progress</th>
                <th class="text-center">Resolved</th>
                <th>Resolution Efficiency</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of departmentStats">
                <td class="fw-bold text-dark">{{ d.department_name }}</td>
                <td><span class="badge bg-light text-dark border">{{ d.department_code }}</span></td>
                <td class="text-center fw-semibold">{{ d.total_tickets }}</td>
                <td class="text-center"><span class="badge bg-primary-subtle text-primary">{{ d.open_tickets }}</span></td>
                <td class="text-center"><span class="badge bg-purple-subtle text-purple">{{ d.in_progress_tickets }}</span></td>
                <td class="text-center"><span class="badge bg-success-subtle text-success">{{ d.resolved_tickets }}</span></td>
                <td style="width: 200px;">
                  <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" style="height: 6px;">
                      <div
                        class="progress-bar bg-success"
                        [style.width.%]="getDepartmentRate(d)"
                      ></div>
                    </div>
                    <small class="fw-semibold text-muted" style="font-size: 0.75rem;">{{ getDepartmentRate(d) }}%</small>
                  </div>
                </td>
              </tr>
              <tr *ngIf="departmentStats.length === 0">
                <td colspan="7" class="text-center py-4 text-muted">No department statistics loaded</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ReportsComponent implements OnInit {
  api = inject(ApiService);

  kpis: KPIData | null = null;
  departmentStats: DepartmentStat[] = [];
  exportingCsv = false;
  exportingExcel = false;

  ngOnInit(): void {
    this.loadReportsData();
  }

  loadReportsData(): void {
    this.api.getKPIs().subscribe({
      next: (kpi) => this.kpis = kpi,
      error: (e) => console.error(e)
    });

    this.api.getDepartmentStats().subscribe({
      next: (depts) => this.departmentStats = depts,
      error: (e) => console.error(e)
    });
  }

  downloadCsv(): void {
    this.exportingCsv = true;
    this.api.exportCsv().subscribe({
      next: (blob) => {
        this.exportingCsv = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lkm_tickets_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.exportingCsv = false;
        alert('Failed to export CSV: ' + (err.error?.detail || err.message));
      }
    });
  }

  downloadExcel(): void {
    this.exportingExcel = true;
    this.api.exportExcel().subscribe({
      next: (blob) => {
        this.exportingExcel = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lkm_tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.exportingExcel = false;
        alert('Failed to export Excel: ' + (err.error?.detail || err.message));
      }
    });
  }

  getDepartmentRate(d: DepartmentStat): number {
    if (!d.total_tickets) return 0;
    return Math.round((d.resolved_tickets / d.total_tickets) * 100);
  }
}
