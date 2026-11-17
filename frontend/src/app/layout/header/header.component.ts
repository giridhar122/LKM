import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="app-header bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center shadow-sm">
      <div class="d-flex align-items-center">
        <span class="text-secondary fw-semibold small">
          <i class="bi bi-building-gear me-1 text-primary"></i>
          LKM Industrial Operations &bull; Plant 01
        </span>
      </div>

      <div class="d-flex align-items-center gap-3">
        <div class="text-end d-none d-sm-block">
          <div class="fw-semibold text-dark" style="font-size: 0.85rem;">
            {{ auth.currentUser()?.full_name || 'Plant Supervisor' }}
          </div>
          <small class="text-muted" style="font-size: 0.72rem;">
            {{ auth.currentUser()?.email }}
          </small>
        </div>
        <div class="avatar bg-dark text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 0.8rem;">
          {{ (auth.currentUser()?.full_name || 'U').charAt(0) }}
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      height: 56px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
  `]
})
export class HeaderComponent {
  auth = inject(AuthService);
}
