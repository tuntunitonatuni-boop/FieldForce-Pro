
import { Branch } from './types';

export const BRANCHES: Branch[] = [
  { id: 'b1', name: 'Downtown Branch', lat: 23.8103, lng: 90.4125, radius: 250 },
  { id: 'b2', name: 'Uptown Branch', lat: 23.7940, lng: 90.4043, radius: 250 },
  { id: 'b3', name: 'Westside Hub', lat: 23.7511, lng: 90.3934, radius: 500 },
];

export const GEOFENCE_RADIUS = 250; // Default radius in meters
