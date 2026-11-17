import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Department } from '../../core/models/models';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <!-- Title Bar -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="fw-bold mb-1 text-dark">Department Operations & Classification Rules</h4>
          <p class="text-secondary small mb-0">Configure plant departments, assign department owners, and customize AI routing keywords</p>
        </div>
        <button (click)="openAddModal()" class="btn btn-primary btn-sm d-flex align-items-center">
          <i class="bi bi-plus-lg me-1"></i> Add Department
        </button>
      </div>

      <!-- Department Cards Grid -->
      <div class="row g-3">
        <div *ngFor="let d of departments" class="col-12 col-md-6 col-xl-4">
          <div class="card h-100 shadow-sm border" [class.border-secondary-subtle]="!d.is_active">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center gap-2">
                <span class="badge bg-dark fw-bold">{{ d.code }}</span>
                <span class="fw-bold text-dark">{{ d.name }}</span>
              </div>
              <span class="badge" [class.bg-success]="d.is_active" [class.bg-secondary]="!d.is_active">
                {{ d.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="card-body p-3">
              <p class="small text-muted mb-3" style="min-height: 38px;">
                {{ d.description || 'No description provided.' }}
              </p>

              <div class="mb-2 small">
                <span class="text-muted d-block">Department In-Charge:</span>
                <strong>{{ d.owner_name || 'Unassigned' }}</strong>
              </div>

              <!-- AI Keyword Rules Tags -->
              <div class="mb-3">
                <span class="text-muted small d-block mb-1">AI Classification Keywords:</span>
                <div class="d-flex flex-wrap gap-1">
                  <span
                    *ngFor="let kw of d.classification_rules?.keywords"
                    class="badge bg-light text-secondary border"
                    style="font-size: 0.7rem;"
                  >
                    {{ kw }}
                  </span>
                  <span *ngIf="!d.classification_rules?.keywords?.length" class="text-muted small">None defined</span>
                </div>
              </div>

              <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                <small class="text-muted">Total Tickets: <strong>{{ d.ticket_count || 0 }}</strong></small>
                <button (click)="openEditModal(d)" class="btn btn-outline-secondary btn-sm px-3 py-1">
                  <i class="bi bi-pencil me-1"></i> Edit Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- EDIT / ADD MODAL -->
      <div *ngIf="showModal" class="modal-backdrop fade show" (click)="closeModal()"></div>
      <div *ngIf="showModal" class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white py-3">
              <h5 class="modal-title fw-bold mb-0">
                {{ isEditing ? 'Edit Department: ' + modalDept.name : 'Create New Department' }}
              </h5>
              <button type="button" class="btn-close btn-close-white" (click)="closeModal()"></button>
            </div>
            <div class="modal-body p-4 bg-light">
              <div class="mb-3" *ngIf="!isEditing">
                <label class="form-label small fw-semibold">Department Code (e.g. SAFETY, ENG)</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="modalDept.code" placeholder="ENG" />
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Department Name</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="modalDept.name" placeholder="Engineering" />
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Operational Scope / Description</label>
                <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="modalDept.description"></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">AI Routing Keywords (Comma-separated)</label>
                <input
                  type="text"
                  class="form-control form-control-sm"
                  [(ngModel)]="keywordsInput"
                  placeholder="e.g. machine, motor, bearing, leak"
                />
                <small class="text-muted" style="font-size: 0.72rem;">Gemini AI and rule engine prioritize tickets with these terms.</small>
              </div>

              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" [(ngModel)]="modalDept.is_active" id="activeSwitch" />
                <label class="form-check-label small fw-semibold" for="activeSwitch">Department Active Status</label>
              </div>
            </div>
            <div class="modal-footer bg-white py-2">
              <button type="button" class="btn btn-secondary btn-sm" (click)="closeModal()">Cancel</button>
              <button type="button" class="btn btn-primary btn-sm px-3" (click)="saveDepartment()" [disabled]="saving">
                {{ saving ? 'Saving...' : 'Save Configuration' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DepartmentsComponent implements OnInit {
  api = inject(ApiService);

  departments: Department[] = [];
  showModal = false;
  isEditing = false;
  saving = false;

  modalDept: any = {};
  keywordsInput = '';

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.api.getDepartments().subscribe({
      next: (data) => this.departments = data,
      error: (e) => console.error(e)
    });
  }

  openEditModal(dept: Department): void {
    this.isEditing = true;
    this.modalDept = { ...dept };
    this.keywordsInput = dept.classification_rules?.keywords?.join(', ') || '';
    this.showModal = true;
  }

  openAddModal(): void {
    this.isEditing = false;
    this.modalDept = {
      code: '',
      name: '',
      description: '',
      is_active: true
    };
    this.keywordsInput = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveDepartment(): void {
    this.saving = true;
    const kwList = this.keywordsInput.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      ...this.modalDept,
      classification_rules: {
        keywords: kwList,
        default_priority: this.modalDept.classification_rules?.default_priority || 'Medium'
      }
    };

    if (this.isEditing) {
      this.api.updateDepartment(this.modalDept.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.loadDepartments();
        },
        error: (err) => {
          alert(`Error saving department: ${err.error?.detail || err.message}`);
          this.saving = false;
        }
      });
    } else {
      this.api.createDepartment(payload).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.loadDepartments();
        },
        error: (err) => {
          alert(`Error creating department: ${err.error?.detail || err.message}`);
          this.saving = false;
        }
      });
    }
  }
}
