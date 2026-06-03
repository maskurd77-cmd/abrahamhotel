import { Timestamp } from "firebase/firestore";

export interface Settings {
  id?: string;
  restaurant_name: string;
  phone: string;
  address: string;
  receipt_footer: string;
  logo_url?: string;
}

export interface User {
  user_id?: string;
  username: string;
  email: string;
  phone_number: string;
  role: 'admin' | 'cashier' | 'customer';
  permissions?: string[];
}

export interface Room {
  id?: string;
  room_number: string;
  type?: 'room' | 'table';
  status: 'occupied' | 'empty';
  current_otp: string | null;
  activated_at: Timestamp | null;
}

export interface Product {
  id?: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  image_url?: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  note: string;
}

export interface Order {
  id?: string;
  room_id: string; // Document ID of the room, or 'local'
  room_number: string;
  otp_used: string | null;
  items: OrderItem[];
  total_price: number;
  order_status: 'pending' | 'preparing' | 'ready' | 'completed';
  payment_status?: 'unpaid' | 'paid';
  created_at: Timestamp;
}
