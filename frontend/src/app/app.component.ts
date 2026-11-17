import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <ng-container *ngIf="auth.isAuthenticated(); else unauthenticatedLayout">
      <div class="d-flex min-vh-100">
        <!-- Enterprise Dark Navy Sidebar -->
        <app-sidebar></app-sidebar>

        <!-- Main Content Area -->
        <div class="flex-grow-1 d-flex flex-column" style="min-width: 0; background-color: var(--lkm-body-bg, #f8fafc);">
          <!-- Top App Header -->
          <app-header></app-header>

          <!-- Router Page Content -->
          <main class="flex-grow-1 overflow-auto">
            <router-outlet></router-outlet>
          </main>
        </div>
      </div>
    </ng-container>

    <ng-template #unauthenticatedLayout>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
  `]
})
export class AppComponent {
  auth = inject(AuthService);
}
