import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Ticket, Department, User, TicketUpdatePayload } from '../../core/models/models';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <!-- Title & Filters Bar -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 class="fw-bold mb-1 text-dark">Ticket Management Center</h4>
          <p class="text-secondary small mb-0">Triage, assign, and track industrial issue resolution workflows</p>
        </div>
        <div class="d-flex gap-2">
          <button (click)="loadTickets()" class="btn btn-outline-secondary btn-sm d-flex align-items-center">
            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Filter Card -->
      <div class="card mb-4 p-3 bg-white shadow-sm border">
        <div class="row g-2 align-items-center">
          <!-- Search -->
          <div class="col-12 col-md-3">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
              <input
                type="text"
                class="form-control"
                placeholder="Search ticket, machine..."
                [(ngModel)]="searchQuery"
                (keyup.enter)="applyFilters()"
              />
            </div>
          </div>

          <!-- Department Filter -->
          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" [(ngModel)]="selectedDepartment" (change)="applyFilters()">
              <option [ngValue]="null">All Departments</option>
              <option *ngFor="let d of departments" [ngValue]="d.id">{{ d.name }}</option>
            </select>
          </div>

          <!-- Priority Filter -->
          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" [(ngModel)]="selectedPriority" (change)="applyFilters()">
              <option value="">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="col-6 col-md-2">
            <select class="form-select form-select-sm" [(ngModel)]="selectedStatus" (change)="applyFilters()">
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <!-- Needs Review Filter -->
          <div class="col-6 col-md-3 d-flex gap-2 justify-content-end">
            <button
              class="btn btn-sm"
              [class.btn-danger]="filterNeedsReview === true"
              [class.btn-outline-danger]="filterNeedsReview !== true"
              (click)="toggleNeedsReviewFilter()"
            >
              <i class="bi bi-shield-exclamation me-1"></i> Needs Review
            </button>
            <button class="btn btn-sm btn-primary" (click)="applyFilters()">
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      <!-- Tickets Data Table -->
      <div class="card shadow-sm border mb-4">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th style="width: 140px;">Ticket ID</th>
                <th>Issue Details</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Reported By</th>
                <th>Status</th>
                <th>Created At</th>
                <th class="text-end" style="width: 100px;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of tickets" [class.table-warning]="t.needs_review">
                <td>
                  <span class="fw-bold text-primary">{{ t.ticket_number }}</span>
                  <div *ngIf="t.needs_review" class="mt-1">
                    <span class="badge badge-review" style="font-size: 0.65rem;">
                      <i class="bi bi-exclamation-triangle-fill me-1"></i> AI REVIEW
                    </span>
                  </div>
                </td>
                <td>
                  <div class="fw-semibold text-dark">{{ t.issue_title }}</div>
                  <small class="text-muted d-block text-truncate" style="max-width: 280px;">{{ t.description }}</small>
                  <div class="mt-1 small" *ngIf="t.asset || t.location">
                    <span *ngIf="t.asset" class="badge bg-light text-dark border me-1"><i class="bi bi-gear-fill me-1"></i>{{ t.asset }}</span>
                    <span *ngIf="t.location" class="badge bg-light text-dark border"><i class="bi bi-geo-alt-fill me-1"></i>{{ t.location }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge bg-light text-dark border fw-medium px-2 py-1">
                    {{ t.department_name || 'Unassigned' }}
                  </span>
                </td>
                <td>
                  <span class="badge px-2 py-1" [ngClass]="getPriorityBadgeClass(t.priority)">
                    {{ t.priority }}
                  </span>
                </td>
                <td>
                  <div class="fw-medium text-dark" style="font-size: 0.85rem;">
                    {{ t.reported_by_name || 'Shop Floor Operator' }}
                  </div>
                  <small class="text-muted d-flex align-items-center">
                    <i class="bi bi-whatsapp text-success me-1" style="font-size: 0.75rem;"></i>
                    {{ t.employee_phone }}
                  </small>
                </td>
                <td>
                  <span class="badge px-2 py-1" [ngClass]="getStatusBadgeClass(t.status)">
                    {{ t.status }}
                  </span>
                </td>
                <td>
                  <small class="text-muted">{{ t.created_at | date:'short' }}</small>
                </td>
                <td class="text-end">
                  <button (click)="openTicketDetails(t)" class="btn btn-sm btn-outline-primary px-2 py-1">
                    Inspect
                  </button>
                </td>
              </tr>
              <tr *ngIf="tickets.length === 0 && !loading">
                <td colspan="8" class="text-center py-5 text-muted">
                  <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                  No tickets match the selected filters.
                </td>
              </tr>
              <tr *ngIf="loading">
                <td colspan="8" class="text-center py-5 text-muted">
                  <div class="spinner-border text-primary spinner-border-sm me-2"></div>
                  Loading tickets...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div class="card-footer bg-white d-flex justify-content-between align-items-center py-2 px-3 border-top">
          <small class="text-muted">
            Showing {{ tickets.length }} of {{ totalTickets }} tickets (Page {{ currentPage }} of {{ totalPages || 1 }})
          </small>
          <div class="btn-group btn-group-sm">
            <button
              class="btn btn-outline-secondary"
              [disabled]="currentPage <= 1"
              (click)="changePage(currentPage - 1)"
            >
              Previous
            </button>
            <button
              class="btn btn-outline-secondary"
              [disabled]="currentPage >= totalPages"
              (click)="changePage(currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- TICKET DETAILS MODAL / DRAWER -->
      <div *ngIf="activeTicket" class="modal-backdrop fade show" (click)="closeDetails()"></div>
      <div *ngIf="activeTicket" class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content border-0 shadow-lg">
            <!-- Modal Header -->
            <div class="modal-header bg-dark text-white py-3">
              <div class="d-flex align-items-center gap-2">
                <span class="badge bg-primary fs-6">{{ activeTicket.ticket_number }}</span>
                <h5 class="modal-title fw-bold mb-0 text-white">{{ activeTicket.issue_title }}</h5>
              </div>
              <button type="button" class="btn-close btn-close-white" (click)="closeDetails()"></button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body p-4 bg-light">
              <div class="row g-4">
                <!-- Left Column: Details & Actions -->
                <div class="col-12 col-lg-7">
                  <!-- Original WhatsApp Message Card -->
                  <div class="card mb-3 border-success border-2 shadow-sm">
                    <div class="card-header bg-success-subtle text-success-emphasis py-2 d-flex justify-content-between align-items-center">
                      <span class="fw-semibold small"><i class="bi bi-whatsapp me-1"></i> Original Employee WhatsApp Message</span>
                      <small class="badge bg-success">{{ activeTicket.source_platform }}</small>
                    </div>
                    <div class="card-body bg-white py-3">
                      <p class="mb-2 font-monospace small bg-light p-2 rounded border">
                        "{{ activeTicket.original_message_text || activeTicket.description }}"
                      </p>
                      <div class="d-flex justify-content-between text-muted small">
                        <span>Reported by: <strong>{{ activeTicket.reported_by_name || 'Shop Floor Operator' }}</strong></span>
                        <span>Phone: <strong>{{ activeTicket.employee_phone }}</strong></span>
                      </div>
                    </div>
                  </div>

                  <!-- AI Classification Audit Card -->
                  <div class="card mb-3 shadow-sm border">
                    <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">
                      <span class="fw-semibold small"><i class="bi bi-cpu me-1 text-primary"></i> Gemini AI Extraction Details</span>
                      <span class="badge" [class.bg-success]="activeTicket.confidence_score >= 0.75" [class.bg-danger]="activeTicket.confidence_score < 0.75">
                        Confidence: {{ (activeTicket.confidence_score * 100).toFixed(0) }}%
                      </span>
                    </div>
                    <div class="card-body bg-white">
                      <div class="row g-2 small">
                        <div class="col-6">
                          <span class="text-muted d-block">Identified Category:</span>
                          <strong>{{ activeTicket.category }}</strong>
                        </div>
                        <div class="col-6">
                          <span class="text-muted d-block">Identified Asset:</span>
                          <strong>{{ activeTicket.asset || 'None detected' }}</strong>
                        </div>
                        <div class="col-6">
                          <span class="text-muted d-block">Shop Location:</span>
                          <strong>{{ activeTicket.location || 'General Floor' }}</strong>
                        </div>
                        <div class="col-6">
                          <span class="text-muted d-block">Needs Supervisor Review:</span>
                          <strong [class.text-danger]="activeTicket.needs_review">{{ activeTicket.needs_review ? 'YES (Ambiguous)' : 'No' }}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Triage / Update Form -->
                  <div class="card shadow-sm border">
                    <div class="card-header bg-light py-2 fw-semibold small">
                      <i class="bi bi-sliders me-1 text-primary"></i> Supervisor Action & Status Transition
                    </div>
                    <div class="card-body bg-white">
                      <div class="row g-3 mb-3">
                        <div class="col-6">
                          <label class="form-label small fw-semibold">Department Assignment</label>
                          <select class="form-select form-select-sm" [(ngModel)]="editDeptId">
                            <option *ngFor="let d of departments" [ngValue]="d.id">{{ d.name }} ({{ d.code }})</option>
                          </select>
                        </div>
                        <div class="col-6">
                          <label class="form-label small fw-semibold">Priority Level</label>
                          <select class="form-select form-select-sm" [(ngModel)]="editPriority">
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                      </div>

                      <!-- Quick Status Action Buttons -->
                      <label class="form-label small fw-semibold text-secondary d-block">Update Ticket Status</label>
                      <div class="btn-group w-100 mb-3" role="group">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-primary"
                          [class.active]="editStatus === 'Acknowledged'"
                          (click)="editStatus = 'Acknowledged'"
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-purple"
                          [class.active]="editStatus === 'In Progress'"
                          (click)="editStatus = 'In Progress'"
                        >
                          In Progress
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-warning"
                          [class.active]="editStatus === 'On Hold'"
                          (click)="editStatus = 'On Hold'"
                        >
                          Hold
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-success"
                          [class.active]="editStatus === 'Resolved'"
                          (click)="editStatus = 'Resolved'"
                        >
                          Resolved
                        </button>
                      </div>

                      <!-- Resolution Notes input if Resolved/Closed -->
                      <div class="mb-3" *ngIf="editStatus === 'Resolved' || editStatus === 'Closed'">
                        <label class="form-label small fw-semibold text-success">
                          <i class="bi bi-check-circle-fill me-1"></i> Resolution Summary & Repair Details
                        </label>
                        <textarea
                          class="form-control form-control-sm"
                          rows="2"
                          placeholder="e.g., Replaced pneumatic seal and calibrated sensors. Verified operational."
                          [(ngModel)]="editResolutionNotes"
                        ></textarea>
                      </div>

                      <!-- Internal Comment for history -->
                      <div class="mb-3">
                        <label class="form-label small fw-semibold text-secondary">Internal Log Comment</label>
                        <input
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Note for audit log (e.g., Shift tech dispatched)"
                          [(ngModel)]="editComment"
                        />
                      </div>

                      <button
                        (click)="saveTicketChanges()"
                        class="btn btn-primary btn-sm w-100 fw-semibold py-2"
                        [disabled]="updating"
                      >
                        <span *ngIf="updating" class="spinner-border spinner-border-sm me-1"></span>
                        Save Updates & Send WhatsApp Status Notification
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Right Column: Audit Timeline History -->
                <div class="col-12 col-lg-5">
                  <div class="card shadow-sm border h-100">
                    <div class="card-header bg-white py-2 fw-semibold small d-flex justify-content-between align-items-center">
                      <span><i class="bi bi-clock-history me-1 text-primary"></i> Lifecycle Timeline & History</span>
                      <span class="badge bg-light text-muted border">{{ activeTicket.history?.length || 0 }} Events</span>
                    </div>
                    <div class="card-body bg-white p-3 overflow-auto" style="max-height: 520px;">
                      <div class="timeline">
                        <div *ngFor="let h of activeTicket.history" class="timeline-item pb-3 mb-2 border-bottom">
                          <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-secondary-subtle text-secondary fw-semibold" style="font-size: 0.7rem;">
                              {{ h.action }}
                            </span>
                            <small class="text-muted" style="font-size: 0.72rem;">{{ h.created_at | date:'short' }}</small>
                          </div>
                          <div class="small fw-semibold mt-1 text-dark">{{ h.comment }}</div>
                          <small class="text-muted" style="font-size: 0.72rem;">By: {{ h.changed_by_name || 'System/WhatsApp' }}</small>
                        </div>
                        <div *ngIf="!activeTicket.history || activeTicket.history.length === 0" class="text-muted small text-center py-4">
                          No history logged yet
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer bg-white py-2">
              <button type="button" class="btn btn-secondary btn-sm" (click)="closeDetails()">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .btn-outline-purple {
      color: #7c3aed;
      border-color: #7c3aed;
    }
    .btn-outline-purple:hover, .btn-outline-purple.active {
      background-color: #7c3aed;
      color: #ffffff;
    }
    .timeline-item:last-child {
      border-bottom: none !important;
    }
  `]
})
export class TicketsComponent implements OnInit {
  api = inject(ApiService);
  auth = inject(AuthService);
  route = inject(ActivatedRoute);

  tickets: Ticket[] = [];
  departments: Department[] = [];
  totalTickets = 0;
  totalPages = 1;
  currentPage = 1;
  pageSize = 10;
  loading = false;
  updating = false;

  // Filter models
  searchQuery = '';
  selectedDepartment: number | null = null;
  selectedPriority = '';
  selectedStatus = '';
  filterNeedsReview: boolean | null = null;

  // Modal / Drawer state
  activeTicket: Ticket | null = null;
  editDeptId: number | null = null;
  editPriority = '';
  editStatus = '';
  editResolutionNotes = '';
  editComment = '';

  ngOnInit(): void {
    this.loadDepartments();
    this.loadTickets();

    // Check query params if deep linked from dashboard
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        const id = parseInt(params['id'], 10);
        this.api.getTicket(id).subscribe(t => this.openTicketDetails(t));
      }
    });
  }

  loadDepartments(): void {
    this.api.getDepartments().subscribe({
      next: (data) => this.departments = data,
      error: (e) => console.error(e)
    });
  }

  loadTickets(): void {
    this.loading = true;
    this.api.getTickets({
      search: this.searchQuery || undefined,
      department_id: this.selectedDepartment || undefined,
      priority: this.selectedPriority || undefined,
      status: this.selectedStatus || undefined,
      needs_review: this.filterNeedsReview !== null ? this.filterNeedsReview : undefined,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (res) => {
        this.tickets = res.items;
        this.totalTickets = res.total;
        this.totalPages = res.total_pages;
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadTickets();
  }

  toggleNeedsReviewFilter(): void {
    this.filterNeedsReview = this.filterNeedsReview === true ? null : true;
    this.applyFilters();
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadTickets();
  }

  openTicketDetails(ticket: Ticket): void {
    this.activeTicket = ticket;
    this.editDeptId = ticket.department_id ?? null;
    this.editPriority = ticket.priority;
    this.editStatus = ticket.status;
    this.editResolutionNotes = ticket.resolution_notes || '';
    this.editComment = '';
  }

  closeDetails(): void {
    this.activeTicket = null;
  }

  saveTicketChanges(): void {
    if (!this.activeTicket) return;
    this.updating = true;

    const payload: TicketUpdatePayload = {
      department_id: this.editDeptId ?? undefined,
      priority: this.editPriority,
      status: this.editStatus,
      resolution_notes: this.editResolutionNotes || undefined,
      internal_comment: this.editComment || undefined
    };

    this.api.updateTicket(this.activeTicket.id, payload).subscribe({
      next: (updated) => {
        this.activeTicket = updated;
        this.updating = false;
        this.loadTickets();
      },
      error: (err) => {
        alert(`Error updating ticket: ${err.error?.detail || err.message}`);
        this.updating = false;
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
