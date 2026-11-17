import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar d-flex flex-column p-3 text-white">
      <!-- Brand Header -->
      <div class="d-flex align-items-center mb-4 pb-2 border-bottom border-secondary">
        <div class="brand-icon me-2 d-flex align-items-center justify-content-center">
          <i class="bi bi-cpu-fill fs-4 text-info"></i>
        </div>
        <div>
          <div class="brand-title fw-bold lh-1 text-white">LKM SmartDesk</div>
          <small class="text-secondary" style="font-size: 0.72rem;">Industrial AI Platform</small>
        </div>
      </div>

      <!-- Navigation Links -->
      <ul class="nav nav-pills flex-column mb-auto gap-1">
        <li class="nav-item">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link text-white-50 d-flex align-items-center">
            <i class="bi bi-speedometer2 me-2 fs-5"></i>
            <span>Dashboard</span>
          </a>
        </li>
        <li class="nav-item">
          <a routerLink="/tickets" routerLinkActive="active" class="nav-link text-white-50 d-flex align-items-center">
            <i class="bi bi-ticket-detailed me-2 fs-5"></i>
            <span>Tickets</span>
          </a>
        </li>
        <li class="nav-item">
          <a routerLink="/simulator" routerLinkActive="active" class="nav-link text-white-50 d-flex align-items-center">
            <i class="bi bi-whatsapp me-2 fs-5 text-success"></i>
            <span>WhatsApp Sandbox</span>
            <span class="badge bg-success ms-auto" style="font-size: 0.65rem;">LIVE</span>
          </a>
        </li>
        <li class="nav-item" *ngIf="isAdminOrSupervisor()">
          <a routerLink="/departments" routerLinkActive="active" class="nav-link text-white-50 d-flex align-items-center">
            <i class="bi bi-building me-2 fs-5"></i>
            <span>Departments</span>
          </a>
        </li>
        <li class="nav-item" *ngIf="isAdminOrSupervisor()">
          <a routerLink="/employees" routerLinkActive="active" class="nav-link text-white-50 d-flex align-items-center">
            <i class="bi bi-people me-2 fs-5"></i>
            <span>Employees</span>
          </a>
        </li>
        <li class="nav-item">
          <a routerLink="/reports" routerLinkActive="active" class="nav-link text-white-50 d-flex align-items-center">
            <i class="bi bi-bar-chart-line me-2 fs-5"></i>
            <span>Reports & MIS</span>
          </a>
        </li>
      </ul>

      <!-- User Profile & Logout -->
      <div class="user-profile pt-3 mt-auto border-top border-secondary">
        <div class="d-flex align-items-center mb-2">
          <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 36px; height: 36px;">
            <i class="bi bi-person-fill"></i>
          </div>
          <div class="overflow-hidden">
            <div class="text-white text-truncate fw-semibold" style="font-size: 0.85rem;">
              {{ auth.currentUser()?.full_name || 'Plant Supervisor' }}
            </div>
            <span class="badge bg-secondary" style="font-size: 0.65rem;">
              {{ auth.currentUser()?.role || 'SUPERVISOR' }}
            </span>
          </div>
        </div>
        <button (click)="auth.logout()" class="btn btn-outline-light btn-sm w-100 d-flex align-items-center justify-content-center mt-2" style="font-size: 0.8rem;">
          <i class="bi bi-box-arrow-right me-1"></i> Sign Out
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      height: 100vh;
      position: sticky;
      top: 0;
      background-color: var(--lkm-sidebar-bg, #0f172a);
      border-right: 1px solid #1e293b;
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      background: #1e293b;
      border-radius: 8px;
    }
    .nav-link {
      color: #94a3b8 !important;
      border-radius: 6px;
      padding: 0.6rem 0.85rem;
      font-size: 0.9rem;
      transition: all 0.15s ease-in-out;
    }
    .nav-link:hover {
      background-color: #1e293b;
      color: #f8fafc !important;
    }
    .nav-link.active {
      background-color: #0284c7 !important;
      color: #ffffff !important;
      font-weight: 500;
    }
  `]
})
export class SidebarComponent {
  auth = inject(AuthService);

  isAdminOrSupervisor(): boolean {
    const role = this.auth.userRole();
    return role === 'ADMIN' || role === 'SUPERVISOR';
  }
}
