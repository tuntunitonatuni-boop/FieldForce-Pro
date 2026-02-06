
export enum Role {
  SUPER_ADMIN = 'super_admin',
  BRANCH_ADMIN = 'branch_admin',
  OFFICER = 'officer',
  DRIVER = 'driver'
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

export interface Vehicle {
  id: string;
  name: string; // e.g., "Premio 18-0086"
  type: 'car' | 'motorcycle' | 'other';
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

export interface Expense {
  id: string;
  user_id: string;
  vehicle_id?: string; // Link to specific car
  type: 'fuel' | 'maintenance' | 'toll' | 'motorcycle_bill' | 'cooking_gas' | 'other';
  fuel_type?: 'lpg' | 'petrol' | 'octane' | 'diesel' | '99' | null;
  amount: number;
  quantity?: number; // measurement (litres/kg)
  odometer?: number;
  voucher_url?: string;
  description?: string;
  date: string;
  created_at: string;
}
