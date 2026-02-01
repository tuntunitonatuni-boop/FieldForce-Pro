
import { Role, Branch, User } from './types';

export const BRANCHES: Branch[] = [
  { id: 'b1', name: 'Downtown Branch', lat: 40.7128, lng: -74.0060, radius: 250 },
  { id: 'b2', name: 'Uptown Branch', lat: 40.7831, lng: -73.9712, radius: 250 },
  { id: 'b3', name: 'Westside Hub', lat: 40.7589, lng: -73.9851, radius: 500 },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', email: 'super@fieldforce.com', name: 'John Super', role: Role.SUPER_ADMIN, branch_id: 'b1' },
  { id: 'u2', email: 'branch1@fieldforce.com', name: 'Sarah Admin', role: Role.BRANCH_ADMIN, branch_id: 'b1' },
  { id: 'u3', email: 'officer1@fieldforce.com', name: 'Mike Officer', role: Role.OFFICER, branch_id: 'b1' },
  { id: 'u4', email: 'officer2@fieldforce.com', name: 'Linda Officer', role: Role.OFFICER, branch_id: 'b2' },
];

export const GEOFENCE_RADIUS = 250; // Default radius in meters
