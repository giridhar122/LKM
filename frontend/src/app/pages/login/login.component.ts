import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper d-flex align-items-center justify-content-center min-vh-100 bg-light p-3">
      <div class="card shadow border-0" style="max-width: 440px; width: 100%; border-radius: 12px; overflow: hidden;">
        <!-- Header banner -->
        <div class="p-4 text-center text-white" style="background-color: #0f172a;">
          <div class="d-inline-flex p-3 rounded-circle bg-secondary bg-opacity-25 mb-3">
            <i class="bi bi-cpu-fill fs-2 text-info"></i>
          </div>
          <h4 class="fw-bold mb-1">LKM SmartDesk</h4>
          <p class="text-secondary small mb-0">Industrial AI-Powered Issue Reporting Platform</p>
        </div>

        <!-- Form Card Body -->
        <div class="card-body p-4">
          <h5 class="fw-semibold mb-3 text-dark">Supervisor Portal Login</h5>

          <div *ngIf="errorMessage" class="alert alert-danger py-2 small d-flex align-items-center">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            {{ errorMessage }}
          </div>

          <form (ngSubmit)="onSubmit()">
            <div class="mb-3">
              <label class="form-label small fw-semibold text-secondary">Work Email Address</label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="bi bi-envelope text-muted"></i></span>
                <input
                  type="email"
                  class="form-control"
                  placeholder="name@lkm.com"
                  [(ngModel)]="email"
                  name="email"
                  required
                />
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label small fw-semibold text-secondary">Password</label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="bi bi-lock text-muted"></i></span>
                <input
                  type="password"
                  class="form-control"
                  placeholder="Enter password"
                  [(ngModel)]="password"
                  name="password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 py-2 fw-semibold"
              [disabled]="loading"
            >
              <span *ngIf="loading" class="spinner-border spinner-border-sm me-1"></span>
              {{ loading ? 'Authenticating...' : 'Sign In to Portal' }}
            </button>
          </form>

          <!-- Quick Fill Demo Roles -->
          <div class="mt-4 pt-3 border-top">
            <div class="text-muted small fw-semibold mb-2">Demo Testing Credentials:</div>
            <div class="d-grid gap-2">
              <button
                type="button"
                (click)="fillCredentials('admin@lkm.com', 'AdminPassword123!')"
                class="btn btn-sm btn-outline-dark text-start d-flex justify-content-between align-items-center"
              >
                <span><i class="bi bi-shield-lock-fill me-1 text-danger"></i> System Admin</span>
                <code class="small text-muted">admin&#64;lkm.com</code>
              </button>
              <button
                type="button"
                (click)="fillCredentials('supervisor@lkm.com', 'Supervisor123!')"
                class="btn btn-sm btn-outline-dark text-start d-flex justify-content-between align-items-center"
              >
                <span><i class="bi bi-person-badge-fill me-1 text-primary"></i> Plant Supervisor</span>
                <code class="small text-muted">supervisor&#64;lkm.com</code>
              </button>
              <button
                type="button"
                (click)="fillCredentials('maint.lead@lkm.com', 'MaintLead123!')"
                class="btn btn-sm btn-outline-dark text-start d-flex justify-content-between align-items-center"
              >
                <span><i class="bi bi-tools me-1 text-warning"></i> Maintenance Lead</span>
                <code class="small text-muted">maint.lead&#64;lkm.com</code>
              </button>
            </div>
          </div>
        </div>

        <div class="card-footer bg-light text-center py-2 text-muted" style="font-size: 0.75rem;">
          In collaboration with Auralytic Technologies Pvt Ltd
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = 'admin@lkm.com';
  password = 'AdminPassword123!';
  loading = false;
  errorMessage = '';

  private auth = inject(AuthService);
  private router = inject(Router);

  fillCredentials(e: string, p: string) {
    this.email = e;
    this.password = p;
    this.errorMessage = '';
  }

  onSubmit() {
    this.loading = true;
    this.errorMessage = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Invalid email or password';
      }
    });
  }
}
