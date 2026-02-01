
export enum Role {
  SUPER_ADMIN = 'super_admin',
  BRANCH_ADMIN = 'branch_admin',
  OFFICER = 'officer'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  branch_id: string;
}

export interface Branch {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
}

export interface Attendance {
  id: string;
  user_id: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'on-field';
  date: string;
}

export interface MovementLog {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface AppState {
  currentUser: User | null;
  isTracking: boolean;
  currentLocation: { lat: number, lng: number } | null;
}
