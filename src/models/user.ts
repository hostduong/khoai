export interface User {
  id: string;
  status: "live"|"lock";
  role: "user"|"admin";
  verified_email: "true"|"false";
  email: string;
  salt: string;
  pass: string;
  fullname: string;
  phone: string;
  pin: string;
  open_pin: "true"|"false";
  ip_whitelist: string[];
  open_ip: "true"|"false";
  ip_logged: string[];
  ua_logged: string[];
  country: string;
  language: string;
  coin: number;
  total: number;
  mail_total_save: number;
  time: number;
  token: string;
  // ...các trường khác nếu cần
}
