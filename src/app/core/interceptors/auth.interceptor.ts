import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
const refreshToken$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = typeof window !== 'undefined' ? localStorage.getItem('tt_token') : null;
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthRoute = req.url.includes('/auth/login') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh') || req.url.includes('/auth/logout');
      if (error.status !== 401 || isAuthRoute) {
        return throwError(() => error);
      }

      // Do not attempt token refresh on the server (SSR)
      if (typeof window === 'undefined') {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshToken$.next(null);
        return auth.refreshSession().pipe(
          switchMap((newToken) => {
            isRefreshing = false;
            refreshToken$.next(newToken);
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
            return next(retried);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            auth.logout();
            return throwError(() => refreshError);
          })
        );
      }

      return refreshToken$.pipe(
        filter((t) => t !== null),
        take(1),
        switchMap((t) => next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } })))
      );
    })
  );
};
