export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'director' | 'teacher';
  schoolId: string | null;
}

export interface TeacherSession {
  id: string;
  sessionId: string;
  status: 'pending' | 'active' | 'done';
  invitationSentAt: string | null;
  lastSeenAt: string | null;
  slotsSelected: number;
  sessionName: string;
  academicYear: string;
  sessionStatus: string;
  deadline: string | null;
  schoolName: string;
  magicToken: string | null;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan: string;
  isActive: boolean;
}

export type SessionStatus = 'draft' | 'open' | 'closed' | 'published';

export interface Session {
  id: string;
  name: string;
  academicYear: string;
  status: SessionStatus;
  deadline: string | null;
  schoolId: string;
  totalSlots?: number;
  takenSlots?: number;
  validatedSlots?: number;
  totalTeachers?: number;
  respondedTeachers?: number;
  rules?: SessionRule;
}

export interface SessionRule {
  minSlotsPerTeacher: number;
  maxSlotsPerTeacher: number;
  allowContactRequest: boolean;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export type SlotStatus = 'free' | 'taken' | 'validated';

export interface TimeSlot {
  id: string;
  sessionId: string;
  subjectId?: string;
  subjectName?: string;
  subjectColor?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
  status: SlotStatus;
  teacherName?: string;
  selectedByTeacherId?: string;
  validatedAt?: string;
}

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  status: 'pending' | 'active' | 'done';
  invitationSentAt?: string;
  lastSeenAt?: string;
  slotsSelected?: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AuthResponse {
  token: string;
  user: User;
}
