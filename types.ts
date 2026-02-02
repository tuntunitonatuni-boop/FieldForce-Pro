
export enum Role {
  SUPER_ADMIN = 'super_admin',
  BRANCH_ADMIN = 'branch_admin',
  OFFICER = 'officer'
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: Role;
  branch_id: string;
  staff_pin?: string;
  phone_number?: string;
  avatar_url?: string;
  bio?: string;
  join_date?: string;
  target_daily?: number;
  target_weekly?: number;
  target_monthly?: number;
}

export interface Branch {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  target_amount?: number;
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
