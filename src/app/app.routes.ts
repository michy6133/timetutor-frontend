import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/director/dashboard/dashboard.component';
import { BillingComponent } from './features/director/billing/billing.component';
import { CheckoutComponent } from './features/director/checkout/checkout.component';
import { SessionsListComponent } from './features/director/sessions/sessions-list/sessions-list.component';
import { SessionCreateComponent } from './features/director/sessions/session-create/session-create.component';
import { SessionDetailComponent } from './features/director/sessions/session-detail/session-detail.component';
import { SlotPickerComponent } from './features/teacher/slot-picker/slot-picker.component';
import { TeacherRegisterComponent } from './features/teacher/teacher-register/teacher-register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { TeacherPortalComponent } from './features/teacher/teacher-portal/teacher-portal.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { DirectorLayoutComponent } from './features/director/director-layout/director-layout.component';
import { HelpComponent } from './features/help/help.component';
import { RosterComponent } from './features/director/roster/roster.component';
import { authGuard } from './core/guards/auth.guard';
import { teacherGuard } from './core/guards/teacher.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'register-teacher', component: TeacherRegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'help', component: HelpComponent },
  {
    path: 'director',
    component: DirectorLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'billing', component: BillingComponent },
      { path: 'checkout', component: CheckoutComponent },
      { path: 'sessions', component: SessionsListComponent },
      { path: 'sessions/new', component: SessionCreateComponent },
      { path: 'sessions/:id', component: SessionDetailComponent },
      { path: 'roster', component: RosterComponent },
    ],
  },
  { path: 'teacher/:token', component: SlotPickerComponent },
  {
    path: 'teacher',
    canActivate: [teacherGuard],
    children: [
      { path: 'portal', component: TeacherPortalComponent },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    children: [
      { path: '', component: AdminDashboardComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
