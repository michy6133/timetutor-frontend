import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import type { User, AuthResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _user = signal<User | null>(null);
  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (!this.isBrowser) return;
    const token = localStorage.getItem('tt_token');
    const raw = localStorage.getItem('tt_user');
    if (token && raw) {
      try {
        this._user.set(JSON.parse(raw) as User);
      } catch {
        this.clearStorage();
      }
    }
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('tt_token');
  }

  login(email: string, password: string) {
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap((res) => {
        if (this.isBrowser) {
          localStorage.setItem('tt_token', res.token);
          localStorage.setItem('tt_user', JSON.stringify(res.user));
        }
        this._user.set(res.user);
      })
    );
  }

  register(data: { schoolName: string; schoolSlug: string; fullName: string; email: string; password: string }) {
    return this.api.post<AuthResponse>('/auth/register', data).pipe(
      tap((res) => {
        if (this.isBrowser) {
          localStorage.setItem('tt_token', res.token);
          localStorage.setItem('tt_user', JSON.stringify(res.user));
        }
        this._user.set(res.user);
      })
    );
  }

  registerTeacher(data: { fullName: string; email: string; password: string }) {
    return this.api.post<AuthResponse>('/auth/register-teacher', data).pipe(
      tap((res) => {
        if (this.isBrowser) {
          localStorage.setItem('tt_token', res.token);
          localStorage.setItem('tt_user', JSON.stringify(res.user));
        }
        this._user.set(res.user);
      })
    );
  }

  logout(): void {
    this.clearStorage();
    this.router.navigate(['/login']);
  }

  loadCurrentUser() {
    return this.api.get<User>('/auth/me').pipe(
      tap((user) => {
        this._user.set(user);
        if (this.isBrowser) localStorage.setItem('tt_user', JSON.stringify(user));
      })
    );
  }

  private clearStorage(): void {
    if (this.isBrowser) {
      localStorage.removeItem('tt_token');
      localStorage.removeItem('tt_user');
    }
    this._user.set(null);
  }
}
