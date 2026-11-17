import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
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
