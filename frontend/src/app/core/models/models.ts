export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'DEPARTMENT_OWNER';
  department_id?: number;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description?: string;
  owner_user_id?: number;
  owner_name?: string;
  classification_rules?: {
    keywords: string[];
    default_priority: string;
  };
  is_active: boolean;
  ticket_count?: number;
}

export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  phone_number: string;
  department_id?: number;
  department_name?: string;
  designation?: string;
  is_active: boolean;
  created_at: string;
}

export interface TicketHistory {
  id: number;
  ticket_id: number;
  changed_by_user_id?: number;
  changed_by_name?: string;
  action: string;
  old_status?: string;
  new_status?: string;
  comment?: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_number: string;
  issue_title: string;
  description: string;
  category: string;
  department_id?: number;
  department_name?: string;
  department_code?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  asset?: string;
  location?: string;
  employee_phone: string;
  source_platform: string;
  reported_by_employee_id?: number;
  reported_by_name?: string;
  reported_by_code?: string;
  assigned_to_user_id?: number;
  assigned_to_name?: string;
  status: 'Open' | 'Acknowledged' | 'In Progress' | 'On Hold' | 'Resolved' | 'Closed';
  resolution_notes?: string;
  confidence_score: number;
  needs_review: boolean;
  original_message_id?: number;
  original_message_text?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  history?: TicketHistory[];
}

export interface TicketListResponse {
  items: Ticket[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

export interface TicketUpdatePayload {
  issue_title?: string;
  description?: string;
  category?: string;
  department_id?: number;
  priority?: string;
  asset?: string;
  location?: string;
  assigned_to_user_id?: number;
  status?: string;
  resolution_notes?: string;
  internal_comment?: string;
}

export interface KPIData {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  acknowledged_tickets: number;
  on_hold_tickets: number;
  resolved_tickets: number;
  critical_tickets: number;
  needs_review_tickets: number;
  avg_resolution_hours: number;
  resolution_rate_percent: number;
}

export interface DepartmentStat {
  department_id: number;
  department_code: string;
  department_name: string;
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
}

export interface PriorityStat {
  priority: string;
  count: number;
}

export interface StatusStat {
  status: string;
  count: number;
}

export interface TrendStat {
  date: string;
  tickets: number;
}

export interface NotificationRecord {
  id: number;
  ticket_id: number;
  recipient_phone: string;
  channel: string;
  template_name?: string;
  message_content: string;
  status: string;
  error_message?: string;
  sent_at: string;
}
