export type User = {
  id: string;
  name: string;
  phone: string;
  password?: string;
  passwordHash?: string;
  role: 'admin' | 'user';
  authStatus: '0' | '1';
  createdAt: string;
  deletedAt?: string;
  isDeleted?: '0' | '1';
};

export type Meal = {
  id: string;
  date: string;
  month: string;
  year: string;
  phone: string;
  name: string;
  lunch: string;   // numeric string: 0, 1, 2... for guest meals
  dinner: string;  // numeric string: 0, 1, 2... for guest meals
  updatedAt: string;
};

export type Bazar = {
  id: string;
  date: string;
  month: string;
  year: string;
  phone: string;
  name: string;
  amount: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  verifiedAt: string;
  verifiedBy: string;
};

export type Bills = {
  month: string;
  year: string;
  seatRent: number;
  utilityBill: number;
  wifiBill: number;
  cookBill: number;
  electricityBill: number;
  updatedAt?: string;
};
