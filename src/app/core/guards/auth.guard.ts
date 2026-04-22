import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  // Prérendu / SSR : pas d'accès à localStorage — on laisse passer pour que l'hydratation
  // réexécute le garde côté navigateur avec la session restaurée.
  if (!isPlatformBrowser(platformId)) return true;
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (auth.currentUser()?.role === 'teacher') return router.createUrlTree(['/teacher/portal']);
  return true;
};
