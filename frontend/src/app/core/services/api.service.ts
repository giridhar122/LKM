import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import {
  Department,
  Employee,
  KPIData,
  DepartmentStat,
  PriorityStat,
  StatusStat,
  TrendStat,
  Ticket,
  TicketListResponse,
  TicketUpdatePayload,
  NotificationRecord
} from '../models/models';

const MOCK_DEPARTMENTS: Department[] = [
  { id: 1, code: 'PROD', name: 'Production', description: 'Manufacturing & assembly lines', is_active: true, ticket_count: 5, classification_rules: { keywords: ['production', 'assembly', 'shift', 'line stopped'], default_priority: 'High' } },
  { id: 2, code: 'MAINT', name: 'Maintenance', description: 'Machinery repair & spare parts', is_active: true, ticket_count: 8, owner_name: 'Venkatesh Rao', classification_rules: { keywords: ['machine', 'breakdown', 'motor', 'leakage', 'compressor'], default_priority: 'Critical' } },
  { id: 3, code: 'QUAL', name: 'Quality', description: 'Inspections & batch quality control', is_active: true, ticket_count: 3, owner_name: 'Ananya Sen', classification_rules: { keywords: ['quality', 'inspection', 'rejected', 'batch', 'tolerance'], default_priority: 'High' } },
  { id: 4, code: 'PURCH', name: 'Purchase', description: 'Raw material procurement & orders', is_active: true, ticket_count: 4, classification_rules: { keywords: ['raw material', 'purchase order', 'supplier', 'vendor'], default_priority: 'High' } },
  { id: 5, code: 'STORES', name: 'Stores', description: 'Inventory & tool crib', is_active: true, ticket_count: 2, classification_rules: { keywords: ['stores', 'tool shortage', 'inventory', 'stock'], default_priority: 'Medium' } },
  { id: 6, code: 'HR', name: 'HR', description: 'Shift scheduling & workforce allocation', is_active: true, ticket_count: 2, classification_rules: { keywords: ['worker', 'staff', 'manpower', 'night shift'], default_priority: 'Medium' } },
  { id: 7, code: 'ACCT', name: 'Accounts', description: 'Billing & contractor invoices', is_active: true, ticket_count: 1, classification_rules: { keywords: ['bill', 'invoice', 'payment'], default_priority: 'Low' } },
  { id: 8, code: 'IT', name: 'IT', description: 'ERP systems & office network', is_active: true, ticket_count: 2, classification_rules: { keywords: ['network', 'wifi', 'computer', 'printer', 'erp'], default_priority: 'Medium' } }
];

const MOCK_TICKETS: Ticket[] = [
  {
    id: 1,
    ticket_number: 'LKM-2026-00001',
    issue_title: 'Machine 04 Hydraulic Stoppage',
    description: 'Machine 04 stopped working on the production floor. Hydraulic pressure drop detected.',
    category: 'Equipment Failure',
    department_id: 2,
    department_name: 'Maintenance',
    department_code: 'MAINT',
    priority: 'Critical',
    asset: 'Machine 04',
    location: 'Production Floor',
    employee_phone: '+919876543210',
    reported_by_name: 'Rajesh Kumar',
    source_platform: 'WHATSAPP',
    status: 'In Progress',
    confidence_score: 0.96,
    needs_review: false,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
    history: [
      { id: 1, ticket_id: 1, action: 'STATUS: Open -> In Progress', comment: 'Assigned technician to inspect pump seals', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 2, ticket_id: 1, action: 'CREATED', comment: 'Created automatically via WhatsApp message from +919876543210', created_at: new Date(Date.now() - 3600000 * 4).toISOString() }
    ]
  },
  {
    id: 2,
    ticket_number: 'LKM-2026-00002',
    issue_title: 'Raw Material Delivery Delayed',
    description: 'Raw materials have not arrived for today\'s production line.',
    category: 'Material Shortage',
    department_id: 4,
    department_name: 'Purchase',
    department_code: 'PURCH',
    priority: 'High',
    employee_phone: '+919876543213',
    reported_by_name: 'Amit Verma',
    source_platform: 'WHATSAPP',
    status: 'Open',
    confidence_score: 0.92,
    needs_review: false,
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date().toISOString(),
    history: [
      { id: 3, ticket_id: 2, action: 'CREATED', comment: 'Reported via WhatsApp', created_at: new Date(Date.now() - 3600000 * 8).toISOString() }
    ]
  },
  {
    id: 3,
    ticket_number: 'LKM-2026-00003',
    issue_title: 'Batch #9812 Rejection Notice',
    description: 'Quality inspection rejected the latest batch due to surface tolerance variances.',
    category: 'Quality Defect',
    department_id: 3,
    department_name: 'Quality',
    department_code: 'QUAL',
    priority: 'High',
    asset: 'Batch #9812',
    location: 'Inspection Bay 2',
    employee_phone: '+919876543212',
    reported_by_name: 'Priya Sharma',
    source_platform: 'WHATSAPP',
    status: 'Resolved',
    resolution_notes: 'Rework completed with recalibrated tooling. Re-inspection passed.',
    confidence_score: 0.95,
    needs_review: false,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date().toISOString(),
    resolved_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    history: [
      { id: 4, ticket_id: 3, action: 'STATUS: In Progress -> Resolved', comment: 'Rework verified', created_at: new Date(Date.now() - 3600000 * 6).toISOString() },
      { id: 5, ticket_id: 3, action: 'CREATED', comment: 'Reported via WhatsApp', created_at: new Date(Date.now() - 3600000 * 24).toISOString() }
    ]
  },
  {
    id: 4,
    ticket_number: 'LKM-2026-00004',
    issue_title: 'Vague Operator Message',
    description: 'Something seems odd on line 2.',
    category: 'General',
    department_id: 1,
    department_name: 'Production',
    department_code: 'PROD',
    priority: 'Medium',
    employee_phone: '+919876543210',
    reported_by_name: 'Rajesh Kumar',
    source_platform: 'WHATSAPP',
    status: 'Open',
    confidence_score: 0.35,
    needs_review: true,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    history: [
      { id: 6, ticket_id: 4, action: 'CREATED', comment: 'Reported via WhatsApp (Flagged for AI review)', created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
    ]
  }
];

const MOCK_EMPLOYEES: Employee[] = [
  { id: 1, employee_code: 'EMP-1001', full_name: 'Rajesh Kumar', phone_number: '+919876543210', department_id: 1, department_name: 'Production', designation: 'CNC Operator', is_active: true, created_at: new Date().toISOString() },
  { id: 2, employee_code: 'EMP-1002', full_name: 'Suresh Patel', phone_number: '+919876543211', department_id: 2, department_name: 'Maintenance', designation: 'Electro-Mechanical Tech', is_active: true, created_at: new Date().toISOString() },
  { id: 3, employee_code: 'EMP-1003', full_name: 'Priya Sharma', phone_number: '+919876543212', department_id: 3, department_name: 'Quality', designation: 'Quality Inspector', is_active: true, created_at: new Date().toISOString() },
  { id: 4, employee_code: 'EMP-1004', full_name: 'Amit Verma', phone_number: '+919876543213', department_id: 5, department_name: 'Stores', designation: 'Storekeeper', is_active: true, created_at: new Date().toISOString() },
  { id: 5, employee_code: 'EMP-1005', full_name: 'Sneha Reddy', phone_number: '+919876543214', department_id: 6, department_name: 'HR', designation: 'Shift Coordinator', is_active: true, created_at: new Date().toISOString() }
];

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  // --- Tickets ---
  getTickets(filters: {
    search?: string;
    department_id?: number;
    priority?: string;
    status?: string;
    needs_review?: boolean;
    page?: number;
    size?: number;
    sort_by?: string;
    sort_desc?: boolean;
  } = {}): Observable<TicketListResponse> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.department_id) params = params.set('department_id', filters.department_id.toString());
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.needs_review !== undefined && filters.needs_review !== null) {
      params = params.set('needs_review', filters.needs_review.toString());
    }
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.size) params = params.set('size', filters.size.toString());
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);
    if (filters.sort_desc !== undefined) params = params.set('sort_desc', filters.sort_desc.toString());

    return this.http.get<TicketListResponse>(`${this.baseUrl}/tickets`, { params }).pipe(
      catchError(() => {
        let items = [...MOCK_TICKETS];
        if (filters.department_id) items = items.filter(t => t.department_id === filters.department_id);
        if (filters.priority) items = items.filter(t => t.priority === filters.priority);
        if (filters.status) items = items.filter(t => t.status === filters.status);
        if (filters.needs_review !== undefined) items = items.filter(t => t.needs_review === filters.needs_review);
        return of({
          items,
          total: items.length,
          page: 1,
          size: 10,
          total_pages: 1
        });
      })
    );
  }

  getTicket(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/tickets/${id}`).pipe(
      catchError(() => {
        const t = MOCK_TICKETS.find(x => x.id === id) || MOCK_TICKETS[0];
        return of(t);
      })
    );
  }

  updateTicket(id: number, payload: TicketUpdatePayload): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.baseUrl}/tickets/${id}`, payload).pipe(
      catchError(() => {
        const t = MOCK_TICKETS.find(x => x.id === id) || MOCK_TICKETS[0];
        if (payload.status) t.status = payload.status as any;
        if (payload.priority) t.priority = payload.priority as any;
        if (payload.resolution_notes) t.resolution_notes = payload.resolution_notes;
        return of({ ...t });
      })
    );
  }

  createTicket(payload: any): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.baseUrl}/tickets`, payload);
  }

  // --- Departments ---
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/departments`).pipe(
      catchError(() => of(MOCK_DEPARTMENTS))
    );
  }

  createDepartment(dept: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(`${this.baseUrl}/departments`, dept).pipe(
      catchError(() => of({ ...MOCK_DEPARTMENTS[0], ...dept, id: Date.now() } as Department))
    );
  }

  updateDepartment(id: number, dept: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.baseUrl}/departments/${id}`, dept).pipe(
      catchError(() => of({ ...MOCK_DEPARTMENTS[0], ...dept, id } as Department))
    );
  }

  // --- Employees ---
  getEmployees(search?: string, departmentId?: number): Observable<Employee[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<Employee[]>(`${this.baseUrl}/employees`, { params }).pipe(
      catchError(() => of(MOCK_EMPLOYEES))
    );
  }

  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(`${this.baseUrl}/employees`, employee).pipe(
      catchError(() => of({ ...MOCK_EMPLOYEES[0], ...employee, id: Date.now() } as Employee))
    );
  }

  updateEmployee(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/employees/${id}`, employee).pipe(
      catchError(() => of({ ...MOCK_EMPLOYEES[0], ...employee, id } as Employee))
    );
  }

  // --- Reports & MIS ---
  getKPIs(departmentId?: number): Observable<KPIData> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<KPIData>(`${this.baseUrl}/reports/kpis`, { params }).pipe(
      catchError(() => of({
        total_tickets: 14,
        open_tickets: 4,
        in_progress_tickets: 3,
        acknowledged_tickets: 2,
        on_hold_tickets: 1,
        resolved_tickets: 7,
        critical_tickets: 2,
        needs_review_tickets: 1,
        avg_resolution_hours: 2.4,
        resolution_rate_percent: 50.0
      }))
    );
  }

  getDepartmentStats(): Observable<DepartmentStat[]> {
    return this.http.get<DepartmentStat[]>(`${this.baseUrl}/reports/department-stats`).pipe(
      catchError(() => of([
        { department_id: 1, department_code: 'PROD', department_name: 'Production', total_tickets: 5, open_tickets: 1, in_progress_tickets: 1, resolved_tickets: 3 },
        { department_id: 2, department_code: 'MAINT', department_name: 'Maintenance', total_tickets: 8, open_tickets: 2, in_progress_tickets: 2, resolved_tickets: 4 },
        { department_id: 3, department_code: 'QUAL', department_name: 'Quality', total_tickets: 3, open_tickets: 1, in_progress_tickets: 0, resolved_tickets: 2 },
        { department_id: 4, department_code: 'PURCH', department_name: 'Purchase', total_tickets: 4, open_tickets: 1, in_progress_tickets: 1, resolved_tickets: 2 },
        { department_id: 5, department_code: 'STORES', department_name: 'Stores', total_tickets: 2, open_tickets: 0, in_progress_tickets: 1, resolved_tickets: 1 }
      ]))
    );
  }

  getPriorityStats(departmentId?: number): Observable<PriorityStat[]> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<PriorityStat[]>(`${this.baseUrl}/reports/priority-stats`, { params }).pipe(
      catchError(() => of([
        { priority: 'Critical', count: 2 },
        { priority: 'High', count: 5 },
        { priority: 'Medium', count: 5 },
        { priority: 'Low', count: 2 }
      ]))
    );
  }

  getStatusDistribution(departmentId?: number): Observable<StatusStat[]> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<StatusStat[]>(`${this.baseUrl}/reports/status-distribution`, { params }).pipe(
      catchError(() => of([
        { status: 'Open', count: 4 },
        { status: 'In Progress', count: 3 },
        { status: 'Resolved', count: 7 }
      ]))
    );
  }

  getTrends(days: number = 7): Observable<TrendStat[]> {
    return this.http.get<TrendStat[]>(`${this.baseUrl}/reports/trends`, {
      params: { days: days.toString() }
    }).pipe(
      catchError(() => of([
        { date: 'Nov 12', tickets: 2 },
        { date: 'Nov 13', tickets: 4 },
        { date: 'Nov 14', tickets: 1 },
        { date: 'Nov 15', tickets: 3 },
        { date: 'Nov 16', tickets: 5 },
        { date: 'Nov 17', tickets: 2 },
        { date: 'Nov 18', tickets: 4 }
      ]))
    );
  }

  // --- WhatsApp Simulator ---
  simulateIncomingMessage(data: {
    sender_phone: string;
    message_text: string;
    employee_name?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/simulator/send`, data).pipe(
      catchError(() => {
        const isMaintenance = data.message_text.toLowerCase().includes('machine') || data.message_text.toLowerCase().includes('breakdown');
        const dept = isMaintenance ? 'Maintenance' : 'Production';
        const priority = isMaintenance ? 'Critical' : 'High';
        const ticketNum = `LKM-2026-${Math.floor(10000 + Math.random() * 90000)}`;
        return of({
          success: true,
          mode: 'SIMULATION',
          is_duplicate: false,
          ticket: {
            id: 99,
            ticket_number: ticketNum,
            issue_title: isMaintenance ? 'Machine 04 Breakdown' : 'Shop Floor Operational Issue',
            description: data.message_text,
            category: isMaintenance ? 'Equipment Failure' : 'General',
            department_name: dept,
            priority: priority,
            asset: isMaintenance ? 'Machine 04' : undefined,
            location: 'Production Floor',
            confidence_score: 0.95,
            needs_review: false
          },
          simulated_whatsapp_response: `Hello! Your issue has been successfully registered.\n\nTicket ID: ${ticketNum}\nIssue: ${isMaintenance ? 'Machine 04 Breakdown' : 'Operational Issue'}\nDepartment: ${dept}\nPriority: ${priority}\nStatus: Open\n\nOur ${dept.toLowerCase()} team has been notified.\n\nThank you for reporting this issue.`
        });
      })
    );
  }

  getSimulatedNotifications(): Observable<NotificationRecord[]> {
    return this.http.get<NotificationRecord[]>(`${this.baseUrl}/simulator/notifications`).pipe(
      catchError(() => of([
        { id: 1, ticket_id: 1, recipient_phone: '+919876543210', channel: 'WHATSAPP', template_name: 'ticket_confirmation', message_content: 'Ticket ID: LKM-2026-00001 registered successfully.', status: 'SENT', sent_at: new Date().toISOString() }
      ]))
    );
  }

  // --- Export Methods with Bearer Token ---
  exportCsv(departmentId?: number): Observable<Blob> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get(`${this.baseUrl}/reports/export/csv`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(() => {
        const dummyCsv = 'Ticket ID,Issue,Department,Priority,Status\nLKM-2026-00001,Machine 04 Breakdown,Maintenance,Critical,Open\nLKM-2026-00002,Raw Material Delay,Purchase,High,Open\n';
        return of(new Blob([dummyCsv], { type: 'text/csv' }));
      })
    );
  }

  exportExcel(departmentId?: number): Observable<Blob> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get(`${this.baseUrl}/reports/export/excel`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(() => {
        const dummyCsv = 'Ticket ID,Issue,Department,Priority,Status\nLKM-2026-00001,Machine 04 Breakdown,Maintenance,Critical,Open\nLKM-2026-00002,Raw Material Delay,Purchase,High,Open\n';
        return of(new Blob([dummyCsv], { type: 'text/csv' }));
      })
    );
  }

  getExportCsvUrl(): string {
    return `${this.baseUrl}/reports/export/csv`;
  }

  getExportExcelUrl(): string {
    return `${this.baseUrl}/reports/export/excel`;
  }
}
