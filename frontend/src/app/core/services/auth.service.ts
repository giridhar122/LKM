import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { User } from '../models/models';

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api/v1';
  private currentUserState = signal<User | null>(this.getStoredUser());

  public currentUser = computed(() => this.currentUserState());
  public isAuthenticated = computed(() => !!this.currentUserState());
  public userRole = computed(() => this.currentUserState()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('lkm_token', res.access_token);
        localStorage.setItem('lkm_user', JSON.stringify(res.user));
        this.currentUserState.set(res.user);
      }),
      catchError(err => {
        // Fallback for standalone GitHub Pages demo
        if (password.includes('123') || email.includes('lkm.com')) {
          const role = email.includes('admin') ? 'ADMIN' : (email.includes('maint') ? 'DEPARTMENT_OWNER' : 'SUPERVISOR');
          const demoUser: User = {
            id: 1,
            email,
            full_name: email.includes('admin') ? 'LKM Administrator' : (email.includes('maint') ? 'Venkatesh Rao (Maintenance Lead)' : 'Karthik Raja (Supervisor)'),
            role: role as any,
            is_active: true,
            created_at: new Date().toISOString()
          };
          const fallbackRes: LoginResponse = {
            access_token: 'demo_token_' + Date.now(),
            token_type: 'bearer',
            user: demoUser
          };
          localStorage.setItem('lkm_token', fallbackRes.access_token);
          localStorage.setItem('lkm_user', JSON.stringify(demoUser));
          this.currentUserState.set(demoUser);
          return of(fallbackRes);
        }
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('lkm_token');
    localStorage.removeItem('lkm_user');
    this.currentUserState.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('lkm_token');
  }

  hasRole(allowedRoles: string[]): boolean {
    const role = this.userRole();
    return !!role && allowedRoles.includes(role);
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem('lkm_user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  }
}
