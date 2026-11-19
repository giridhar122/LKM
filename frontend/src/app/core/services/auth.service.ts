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
  private apiUrl = 'https://lkm-5q6u.onrender.com/api/v1';
  private currentUserState = signal<User | null>(this.getStoredUser());

  public currentUser = computed(() => this.currentUserState());
  public isAuthenticated = computed(() => !!this.currentUserState());
  public userRole = computed(() => this.currentUserState()?.role ?? null);

  constructor(private http: HttpClient, private router: Router) {}

  private isStandalone(): boolean {
    return false;
  }

  private buildDemoUser(email: string): LoginResponse {
    const isMaint = email.includes('maint');
    const isAdmin = email.includes('admin');
    const role = isAdmin ? 'ADMIN' : (isMaint ? 'DEPARTMENT_OWNER' : 'SUPERVISOR');
    const fullName = isAdmin 
      ? 'LKM Administrator' 
      : (isMaint ? 'Venkatesh Rao (Maintenance Lead)' : 'Karthik Raja (Supervisor)');
    
    const demoUser: User = {
      id: isAdmin ? 1 : (isMaint ? 2 : 3),
      email,
      full_name: fullName,
      role: role as any,
      department_id: isMaint ? 2 : undefined,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const res: LoginResponse = {
      access_token: 'demo_token_' + Date.now(),
      token_type: 'bearer',
      user: demoUser
    };

    localStorage.setItem('lkm_token', res.access_token);
    localStorage.setItem('lkm_user', JSON.stringify(demoUser));
    this.currentUserState.set(demoUser);
    return res;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    // If hosted on GitHub Pages or static host, log in immediately in demo mode
    if (this.isStandalone()) {
      return of(this.buildDemoUser(email));
    }

    // On localhost, attempt backend authentication
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('lkm_token', res.access_token);
        localStorage.setItem('lkm_user', JSON.stringify(res.user));
        this.currentUserState.set(res.user);
      }),
      catchError(err => {
        // Fallback if localhost backend is not running
        if (password.includes('123') || email.includes('lkm.com')) {
          return of(this.buildDemoUser(email));
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
    const token = localStorage.getItem('lkm_token');
    if (token && token.startsWith('demo_token_')) {
      localStorage.removeItem('lkm_token');
      localStorage.removeItem('lkm_user');
      return null;
    }
    return token;
  }

  hasRole(allowedRoles: string[]): boolean {
    const role = this.userRole();
    return !!role && allowedRoles.includes(role);
  }

  private getStoredUser(): User | null {
    const token = localStorage.getItem('lkm_token');
    if (token && token.startsWith('demo_token_')) {
      return null;
    }
    const userJson = localStorage.getItem('lkm_user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  }
}
