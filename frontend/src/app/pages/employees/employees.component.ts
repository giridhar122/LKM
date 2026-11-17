import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Employee, Department } from '../../core/models/models';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <!-- Title Bar -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="fw-bold mb-1 text-dark">Employee WhatsApp Directory</h4>
          <p class="text-secondary small mb-0">Map employee identity to WhatsApp phone numbers for automated issue triage</p>
        </div>
        <button (click)="openAddModal()" class="btn btn-primary btn-sm d-flex align-items-center">
          <i class="bi bi-person-plus-fill me-1"></i> Register Employee
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="card mb-4 p-3 bg-white shadow-sm border">
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md-4">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
              <input
                type="text"
                class="form-control"
                placeholder="Search by name, code, or phone..."
                [(ngModel)]="searchQuery"
                (keyup.enter)="loadEmployees()"
              />
            </div>
          </div>
          <div class="col-6 col-md-3">
            <select class="form-select form-select-sm" [(ngModel)]="selectedDepartment" (change)="loadEmployees()">
              <option [ngValue]="null">All Departments</option>
              <option *ngFor="let d of departments" [ngValue]="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <button class="btn btn-sm btn-primary w-100" (click)="loadEmployees()">Search</button>
          </div>
        </div>
      </div>

      <!-- Employee Table -->
      <div class="card shadow-sm border">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Emp Code</th>
                <th>Full Name</th>
                <th>WhatsApp Phone</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let emp of employees">
                <td class="fw-bold text-dark">{{ emp.employee_code }}</td>
                <td>
                  <div class="fw-semibold text-dark">{{ emp.full_name }}</div>
                  <small class="text-muted">Registered {{ emp.created_at | date:'mediumDate' }}</small>
                </td>
                <td>
                  <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                    <i class="bi bi-whatsapp me-1"></i> {{ emp.phone_number }}
                  </span>
                </td>
                <td>
                  <span class="badge bg-light text-dark border">{{ emp.department_name || 'Unassigned' }}</span>
                </td>
                <td class="text-secondary small">{{ emp.designation || 'Staff Member' }}</td>
                <td>
                  <span class="badge" [class.bg-success]="emp.is_active" [class.bg-secondary]="!emp.is_active">
                    {{ emp.is_active ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td class="text-end">
                  <button (click)="openEditModal(emp)" class="btn btn-sm btn-outline-secondary px-2 py-1 me-1">
                    <i class="bi bi-pencil"></i>
                  </button>
                </td>
              </tr>
              <tr *ngIf="employees.length === 0">
                <td colspan="7" class="text-center py-5 text-muted">No employees found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ADD / EDIT MODAL -->
      <div *ngIf="showModal" class="modal-backdrop fade show" (click)="closeModal()"></div>
      <div *ngIf="showModal" class="modal fade show d-block" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white py-3">
              <h5 class="modal-title fw-bold mb-0">
                {{ isEditing ? 'Edit Employee: ' + modalEmp.full_name : 'Register Employee for WhatsApp' }}
              </h5>
              <button type="button" class="btn-close btn-close-white" (click)="closeModal()"></button>
            </div>
            <div class="modal-body p-4 bg-light">
              <div class="mb-3" *ngIf="!isEditing">
                <label class="form-label small fw-semibold">Employee Code</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="modalEmp.employee_code" placeholder="EMP-1006" />
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Full Name</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="modalEmp.full_name" placeholder="John Doe" />
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">WhatsApp Number (E.164 Format)</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="modalEmp.phone_number" placeholder="+919876543210" />
                <small class="text-muted" style="font-size: 0.72rem;">Must include country code (e.g. +91XXXXXXXXXX)</small>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Department</label>
                <select class="form-select form-select-sm" [(ngModel)]="modalEmp.department_id">
                  <option [ngValue]="null">Select Department</option>
                  <option *ngFor="let d of departments" [ngValue]="d.id">{{ d.name }}</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Designation / Role</label>
                <input type="text" class="form-control form-control-sm" [(ngModel)]="modalEmp.designation" placeholder="e.g. CNC Operator" />
              </div>

              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" [(ngModel)]="modalEmp.is_active" id="empActiveSwitch" />
                <label class="form-check-label small fw-semibold" for="empActiveSwitch">Active for Issue Reporting</label>
              </div>
            </div>
            <div class="modal-footer bg-white py-2">
              <button type="button" class="btn btn-secondary btn-sm" (click)="closeModal()">Cancel</button>
              <button type="button" class="btn btn-primary btn-sm px-3" (click)="saveEmployee()" [disabled]="saving">
                {{ saving ? 'Saving...' : 'Save Employee' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EmployeesComponent implements OnInit {
  api = inject(ApiService);

  employees: Employee[] = [];
  departments: Department[] = [];
  searchQuery = '';
  selectedDepartment: number | null = null;

  showModal = false;
  isEditing = false;
  saving = false;
  modalEmp: any = {};

  ngOnInit(): void {
    this.loadDepartments();
    this.loadEmployees();
  }

  loadDepartments(): void {
    this.api.getDepartments().subscribe({
      next: (data) => this.departments = data,
      error: (e) => console.error(e)
    });
  }

  loadEmployees(): void {
    this.api.getEmployees(this.searchQuery, this.selectedDepartment || undefined).subscribe({
      next: (data) => this.employees = data,
      error: (e) => console.error(e)
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.modalEmp = {
      employee_code: '',
      full_name: '',
      phone_number: '+91',
      department_id: null,
      designation: '',
      is_active: true
    };
    this.showModal = true;
  }

  openEditModal(emp: Employee): void {
    this.isEditing = true;
    this.modalEmp = { ...emp };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveEmployee(): void {
    this.saving = true;
    if (this.isEditing) {
      this.api.updateEmployee(this.modalEmp.id, this.modalEmp).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.loadEmployees();
        },
        error: (err) => {
          alert(`Error saving employee: ${err.error?.detail || err.message}`);
          this.saving = false;
        }
      });
    } else {
      this.api.createEmployee(this.modalEmp).subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.loadEmployees();
        },
        error: (err) => {
          alert(`Error registering employee: ${err.error?.detail || err.message}`);
          this.saving = false;
        }
      });
    }
  }
}
