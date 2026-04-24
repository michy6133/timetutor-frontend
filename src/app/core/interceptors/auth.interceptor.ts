import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, EMPTY, catchError, filter, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
const refreshToken$ = new BehaviorSubject<string | null>(null);

const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/register-teacher',
  '/auth/refresh',
  '/auth/logout',
];

function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTES.some((r) => url.includes(r));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isBrowser = typeof window !== 'undefined';
  const token = isBrowser ? localStorage.getItem('tt_token') : null;

  if (!isBrowser && !isPublicRoute(req.url)) {
    return EMPTY;
  }

  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isPublicRoute(req.url)) {
        return throwError(() => error);
      }

      if (!isBrowser) {
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
