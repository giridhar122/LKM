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

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 1, code: 'PROD', name: 'Production', description: 'Manufacturing & assembly lines', is_active: true, ticket_count: 5, classification_rules: { keywords: ['production', 'assembly', 'shift', 'line stopped'], default_priority: 'High' } },
  { id: 2, code: 'MAINT', name: 'Maintenance', description: 'Machinery repair & spare parts', is_active: true, ticket_count: 8, owner_name: 'Venkatesh Rao', classification_rules: { keywords: ['machine', 'breakdown', 'motor', 'leakage', 'compressor'], default_priority: 'Critical' } },
  { id: 3, code: 'QUAL', name: 'Quality', description: 'Inspections & batch quality control', is_active: true, ticket_count: 3, owner_name: 'Ananya Sen', classification_rules: { keywords: ['quality', 'inspection', 'rejected', 'batch', 'tolerance'], default_priority: 'High' } },
  { id: 4, code: 'PURCH', name: 'Purchase', description: 'Raw material procurement & orders', is_active: true, ticket_count: 4, classification_rules: { keywords: ['raw material', 'purchase order', 'supplier', 'vendor'], default_priority: 'High' } },
  { id: 5, code: 'STORES', name: 'Stores', description: 'Inventory & tool crib', is_active: true, ticket_count: 2, classification_rules: { keywords: ['stores', 'tool shortage', 'inventory', 'stock'], default_priority: 'Medium' } },
  { id: 6, code: 'HR', name: 'HR', description: 'Shift scheduling & workforce allocation', is_active: true, ticket_count: 2, classification_rules: { keywords: ['worker', 'staff', 'manpower', 'night shift'], default_priority: 'Medium' } },
  { id: 7, code: 'ACCT', name: 'Accounts', description: 'Billing & contractor invoices', is_active: true, ticket_count: 1, classification_rules: { keywords: ['bill', 'invoice', 'payment'], default_priority: 'Low' } },
  { id: 8, code: 'IT', name: 'IT', description: 'ERP systems & office network', is_active: true, ticket_count: 2, classification_rules: { keywords: ['network', 'wifi', 'computer', 'printer', 'erp'], default_priority: 'Medium' } }
];

const INITIAL_TICKETS: Ticket[] = [
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
    description: "Raw materials have not arrived for today's production line.",
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

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, employee_code: 'EMP-1001', full_name: 'Rajesh Kumar', phone_number: '+919876543210', department_id: 1, department_name: 'Production', designation: 'CNC Operator', is_active: true, created_at: new Date().toISOString() },
  { id: 2, employee_code: 'EMP-1002', full_name: 'Suresh Patel', phone_number: '+919876543211', department_id: 2, department_name: 'Maintenance', designation: 'Electro-Mechanical Tech', is_active: true, created_at: new Date().toISOString() },
  { id: 3, employee_code: 'EMP-1003', full_name: 'Priya Sharma', phone_number: '+919876543212', department_id: 3, department_name: 'Quality', designation: 'Quality Inspector', is_active: true, created_at: new Date().toISOString() },
  { id: 4, employee_code: 'EMP-1004', full_name: 'Amit Verma', phone_number: '+919876543213', department_id: 5, department_name: 'Stores', designation: 'Storekeeper', is_active: true, created_at: new Date().toISOString() },
  { id: 5, employee_code: 'EMP-1005', full_name: 'Sneha Reddy', phone_number: '+919876543214', department_id: 6, department_name: 'HR', designation: 'Shift Coordinator', is_active: true, created_at: new Date().toISOString() }
];

const INITIAL_NOTIFICATIONS: NotificationRecord[] = [
  { id: 1, ticket_id: 1, recipient_phone: '+919876543210', channel: 'WHATSAPP', template_name: 'ticket_confirmation', message_content: 'Ticket ID: LKM-2026-00001 registered successfully.', status: 'SENT', sent_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 2, ticket_id: 2, recipient_phone: '+919876543213', channel: 'WHATSAPP', template_name: 'ticket_confirmation', message_content: 'Ticket ID: LKM-2026-00002 registered successfully.', status: 'SENT', sent_at: new Date(Date.now() - 3600000 * 8).toISOString() }
];

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://lkm-5q6u.onrender.com/api/v1';

  constructor(private http: HttpClient) {}

  private isStandalone(): boolean {
    // Cloud backend is active and live on Render
    return false;
  }

  // --- LocalStorage Store Handlers ---
  private getStoredTickets(): Ticket[] {
    const raw = localStorage.getItem('lkm_tickets');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback to initial
      }
    }
    this.saveTickets(INITIAL_TICKETS);
    return [...INITIAL_TICKETS];
  }

  private saveTickets(tickets: Ticket[]): void {
    localStorage.setItem('lkm_tickets', JSON.stringify(tickets));
  }

  private getStoredDepartments(): Department[] {
    const raw = localStorage.getItem('lkm_departments');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    this.saveDepartments(INITIAL_DEPARTMENTS);
    return [...INITIAL_DEPARTMENTS];
  }

  private saveDepartments(depts: Department[]): void {
    localStorage.setItem('lkm_departments', JSON.stringify(depts));
  }

  private getStoredEmployees(): Employee[] {
    const raw = localStorage.getItem('lkm_employees');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    localStorage.setItem('lkm_employees', JSON.stringify(INITIAL_EMPLOYEES));
    return [...INITIAL_EMPLOYEES];
  }

  private getStoredNotifications(): NotificationRecord[] {
    const raw = localStorage.getItem('lkm_notifications');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    this.saveNotifications(INITIAL_NOTIFICATIONS);
    return [...INITIAL_NOTIFICATIONS];
  }

  private saveNotifications(notifs: NotificationRecord[]): void {
    localStorage.setItem('lkm_notifications', JSON.stringify(notifs));
  }

  // --- Client-Side AI Classification Rule Engine ---
  private classifyMessageLocally(messageText: string): {
    departmentId: number;
    departmentName: string;
    departmentCode: string;
    category: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    asset?: string;
    confidence: number;
    needsReview: boolean;
  } {
    const text = messageText.toLowerCase();

    // Check Maintenance
    if (
      text.includes('machine') || text.includes('breakdown') || text.includes('motor') ||
      text.includes('leakage') || text.includes('hydraulic') || text.includes('compressor') ||
      text.includes('bearing') || text.includes('pump') || text.includes('smoke')
    ) {
      const assetMatch = messageText.match(/machine\s*\d+|cnc\s*\d+|pump\s*\d+|motor\s*\d+/i);
      return {
        departmentId: 2,
        departmentName: 'Maintenance',
        departmentCode: 'MAINT',
        category: 'Equipment Failure',
        priority: 'Critical',
        asset: assetMatch ? assetMatch[0] : 'Machine 04',
        confidence: 0.96,
        needsReview: false
      };
    }

    // Check Purchase / Materials
    if (
      text.includes('raw material') || text.includes('purchase') || text.includes('supplier') ||
      text.includes('vendor') || text.includes('procurement') || text.includes('delivery delayed') ||
      text.includes('order')
    ) {
      return {
        departmentId: 4,
        departmentName: 'Purchase',
        departmentCode: 'PURCH',
        category: 'Material Shortage',
        priority: 'High',
        confidence: 0.93,
        needsReview: false
      };
    }

    // Check Quality
    if (
      text.includes('quality') || text.includes('inspection') || text.includes('rejected') ||
      text.includes('batch') || text.includes('tolerance') || text.includes('defect') ||
      text.includes('variance')
    ) {
      const batchMatch = messageText.match(/batch\s*#?\d+/i);
      return {
        departmentId: 3,
        departmentName: 'Quality',
        departmentCode: 'QUAL',
        category: 'Quality Defect',
        priority: 'High',
        asset: batchMatch ? batchMatch[0] : 'Batch Inspection',
        confidence: 0.95,
        needsReview: false
      };
    }

    // Check Stores
    if (
      text.includes('tool') || text.includes('stores') || text.includes('crib') ||
      text.includes('inventory') || text.includes('stock') || text.includes('consumables')
    ) {
      return {
        departmentId: 5,
        departmentName: 'Stores',
        departmentCode: 'STORES',
        category: 'Inventory Shortage',
        priority: 'Medium',
        confidence: 0.91,
        needsReview: false
      };
    }

    // Check HR / Workforce
    if (
      text.includes('worker') || text.includes('staff') || text.includes('manpower') ||
      text.includes('night shift') || text.includes('absent') || text.includes('attendance')
    ) {
      return {
        departmentId: 6,
        departmentName: 'HR',
        departmentCode: 'HR',
        category: 'Shift Staffing',
        priority: 'Medium',
        confidence: 0.90,
        needsReview: false
      };
    }

    // Check IT
    if (
      text.includes('network') || text.includes('wifi') || text.includes('computer') ||
      text.includes('printer') || text.includes('erp') || text.includes('server') ||
      text.includes('internet')
    ) {
      return {
        departmentId: 8,
        departmentName: 'IT',
        departmentCode: 'IT',
        category: 'IT Support',
        priority: 'Medium',
        confidence: 0.94,
        needsReview: false
      };
    }

    // Check Production
    if (
      text.includes('line stopped') || text.includes('production') || text.includes('assembly') ||
      text.includes('bottleneck') || text.includes('delay')
    ) {
      return {
        departmentId: 1,
        departmentName: 'Production',
        departmentCode: 'PROD',
        category: 'Operational Delay',
        priority: 'High',
        confidence: 0.92,
        needsReview: false
      };
    }

    // Ambiguous / Needs Review fallback
    return {
      departmentId: 1,
      departmentName: 'Production',
      departmentCode: 'PROD',
      category: 'General',
      priority: 'Medium',
      confidence: 0.35,
      needsReview: true
    };
  }

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
    const page = filters.page || 1;
    const size = filters.size || 10;

    const filterLocal = (): TicketListResponse => {
      let items = this.getStoredTickets();
      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter(t =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.issue_title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.asset && t.asset.toLowerCase().includes(q)) ||
          (t.location && t.location.toLowerCase().includes(q)) ||
          (t.employee_phone && t.employee_phone.includes(q)) ||
          (t.reported_by_name && t.reported_by_name.toLowerCase().includes(q)) ||
          (t.department_name && t.department_name.toLowerCase().includes(q))
        );
      }
      if (filters.department_id) {
        items = items.filter(t => t.department_id === filters.department_id);
      }
      if (filters.priority) {
        items = items.filter(t => t.priority === filters.priority);
      }
      if (filters.status) {
        items = items.filter(t => t.status === filters.status);
      }
      if (filters.needs_review !== undefined && filters.needs_review !== null) {
        items = items.filter(t => t.needs_review === filters.needs_review);
      }

      const total = items.length;
      const start = (page - 1) * size;
      const paginated = items.slice(start, start + size);

      return {
        items: paginated,
        total,
        page,
        size,
        total_pages: Math.max(1, Math.ceil(total / size))
      };
    };

    if (this.isStandalone()) {
      return of(filterLocal());
    }

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
      catchError(() => of(filterLocal()))
    );
  }

  getTicket(id: number): Observable<Ticket> {
    const findLocal = (): Ticket => {
      const tickets = this.getStoredTickets();
      const match = tickets.find(t => t.id === id);
      return match || tickets[0] || INITIAL_TICKETS[0];
    };

    if (this.isStandalone()) {
      return of(findLocal());
    }

    return this.http.get<Ticket>(`${this.baseUrl}/tickets/${id}`).pipe(
      catchError(() => of(findLocal()))
    );
  }

  updateTicket(id: number, payload: TicketUpdatePayload): Observable<Ticket> {
    const updateLocal = (): Ticket => {
      const tickets = this.getStoredTickets();
      const idx = tickets.findIndex(t => t.id === id);
      if (idx !== -1) {
        const t = { ...tickets[idx] };
        const oldStatus = t.status;
        if (payload.status) t.status = payload.status as any;
        if (payload.priority) t.priority = payload.priority as any;
        if (payload.department_id) {
          t.department_id = payload.department_id;
          const depts = this.getStoredDepartments();
          const d = depts.find(x => x.id === payload.department_id);
          if (d) {
            t.department_name = d.name;
            t.department_code = d.code;
          }
        }
        if (payload.resolution_notes !== undefined) {
          t.resolution_notes = payload.resolution_notes;
          if (payload.status === 'Resolved' || payload.status === 'Closed') {
            t.resolved_at = new Date().toISOString();
          }
        }
        t.updated_at = new Date().toISOString();

        // History entry
        const actionText = payload.status && payload.status !== oldStatus 
          ? `STATUS: ${oldStatus} -> ${payload.status}` 
          : 'TRIAGE_UPDATED';
        const commentText = payload.internal_comment || payload.resolution_notes || 'Updated via Supervisor Portal';

        t.history = [
          {
            id: Date.now(),
            ticket_id: t.id,
            action: actionText,
            old_status: oldStatus,
            new_status: payload.status || oldStatus,
            comment: commentText,
            changed_by_name: 'Supervisor',
            created_at: new Date().toISOString()
          },
          ...(t.history || [])
        ];

        tickets[idx] = t;
        this.saveTickets(tickets);
        return t;
      }
      return tickets[0];
    };

    if (this.isStandalone()) {
      return of(updateLocal());
    }

    return this.http.patch<Ticket>(`${this.baseUrl}/tickets/${id}`, payload).pipe(
      catchError(() => of(updateLocal()))
    );
  }

  createTicket(payload: any): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.baseUrl}/tickets`, payload);
  }

  // --- Departments ---
  getDepartments(): Observable<Department[]> {
    const getLocal = (): Department[] => {
      const depts = this.getStoredDepartments();
      const tickets = this.getStoredTickets();
      // recalculate ticket_count
      return depts.map(d => ({
        ...d,
        ticket_count: tickets.filter(t => t.department_id === d.id).length
      }));
    };

    if (this.isStandalone()) {
      return of(getLocal());
    }

    return this.http.get<Department[]>(`${this.baseUrl}/departments`).pipe(
      catchError(() => of(getLocal()))
    );
  }

  createDepartment(dept: Partial<Department>): Observable<Department> {
    const depts = this.getStoredDepartments();
    const newDept: Department = {
      id: Date.now(),
      code: dept.code || 'DEPT',
      name: dept.name || 'New Department',
      description: dept.description || '',
      is_active: dept.is_active ?? true,
      classification_rules: dept.classification_rules || { keywords: [], default_priority: 'Medium' },
      ticket_count: 0
    };
    depts.push(newDept);
    this.saveDepartments(depts);

    if (this.isStandalone()) {
      return of(newDept);
    }
    return this.http.post<Department>(`${this.baseUrl}/departments`, dept).pipe(
      catchError(() => of(newDept))
    );
  }

  updateDepartment(id: number, dept: Partial<Department>): Observable<Department> {
    const depts = this.getStoredDepartments();
    const idx = depts.findIndex(d => d.id === id);
    if (idx !== -1) {
      depts[idx] = { ...depts[idx], ...dept };
      this.saveDepartments(depts);
      if (this.isStandalone()) {
        return of(depts[idx]);
      }
      return this.http.put<Department>(`${this.baseUrl}/departments/${id}`, dept).pipe(
        catchError(() => of(depts[idx]))
      );
    }
    return of({ ...INITIAL_DEPARTMENTS[0], ...dept, id } as Department);
  }

  // --- Employees ---
  getEmployees(search?: string, departmentId?: number): Observable<Employee[]> {
    const getLocal = (): Employee[] => {
      let emps = this.getStoredEmployees();
      if (search) {
        const q = search.toLowerCase();
        emps = emps.filter(e => e.full_name.toLowerCase().includes(q) || e.phone_number.includes(q) || e.employee_code.toLowerCase().includes(q));
      }
      if (departmentId) {
        emps = emps.filter(e => e.department_id === departmentId);
      }
      return emps;
    };

    if (this.isStandalone()) {
      return of(getLocal());
    }

    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<Employee[]>(`${this.baseUrl}/employees`, { params }).pipe(
      catchError(() => of(getLocal()))
    );
  }

  createEmployee(emp: Partial<Employee>): Observable<Employee> {
    const emps = this.getStoredEmployees();
    const newEmp: Employee = {
      id: Date.now(),
      employee_code: emp.employee_code || `EMP-${Date.now().toString().slice(-4)}`,
      full_name: emp.full_name || 'Staff Member',
      phone_number: emp.phone_number || '+910000000000',
      department_id: emp.department_id,
      department_name: emp.department_name,
      designation: emp.designation,
      is_active: emp.is_active ?? true,
      created_at: new Date().toISOString()
    };
    emps.push(newEmp);
    localStorage.setItem('lkm_employees', JSON.stringify(emps));

    if (this.isStandalone()) {
      return of(newEmp);
    }
    return this.http.post<Employee>(`${this.baseUrl}/employees`, emp).pipe(
      catchError(() => of(newEmp))
    );
  }

  updateEmployee(id: number, emp: Partial<Employee>): Observable<Employee> {
    const emps = this.getStoredEmployees();
    const idx = emps.findIndex(e => e.id === id);
    if (idx !== -1) {
      emps[idx] = { ...emps[idx], ...emp };
      localStorage.setItem('lkm_employees', JSON.stringify(emps));
      if (this.isStandalone()) {
        return of(emps[idx]);
      }
      return this.http.put<Employee>(`${this.baseUrl}/employees/${id}`, emp).pipe(
        catchError(() => of(emps[idx]))
      );
    }
    return of({ ...INITIAL_EMPLOYEES[0], ...emp, id } as Employee);
  }

  // --- Reports & Metrics (Dynamic from localStorage) ---
  getKPIs(departmentId?: number): Observable<KPIData> {
    return this.getKPIData(departmentId);
  }

  getKPIData(departmentId?: number): Observable<KPIData> {
    const calculateLocalKPI = (): KPIData => {
      let tickets = this.getStoredTickets();
      if (departmentId) {
        tickets = tickets.filter(t => t.department_id === departmentId);
      }
      const total = tickets.length;
      const open = tickets.filter(t => t.status === 'Open').length;
      const acknowledged = tickets.filter(t => t.status === 'Acknowledged').length;
      const inProg = tickets.filter(t => t.status === 'In Progress').length;
      const onHold = tickets.filter(t => t.status === 'On Hold').length;
      const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
      const critical = tickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved' && t.status !== 'Closed').length;
      const review = tickets.filter(t => t.needs_review).length;
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;

      return {
        total_tickets: total,
        open_tickets: open + acknowledged,
        acknowledged_tickets: acknowledged,
        in_progress_tickets: inProg,
        on_hold_tickets: onHold,
        resolved_tickets: resolved,
        critical_tickets: critical,
        needs_review_tickets: review,
        avg_resolution_hours: 3.4,
        resolution_rate_percent: rate
      };
    };

    if (this.isStandalone()) {
      return of(calculateLocalKPI());
    }

    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<KPIData>(`${this.baseUrl}/reports/kpis`, { params }).pipe(
      catchError(() => of(calculateLocalKPI()))
    );
  }

  getDepartmentStats(): Observable<DepartmentStat[]> {
    const calculateLocal = (): DepartmentStat[] => {
      const depts = this.getStoredDepartments();
      const tickets = this.getStoredTickets();
      return depts.map(d => {
        const dTickets = tickets.filter(t => t.department_id === d.id);
        return {
          department_id: d.id,
          department_code: d.code,
          department_name: d.name,
          total_tickets: dTickets.length,
          open_tickets: dTickets.filter(t => t.status === 'Open' || t.status === 'Acknowledged').length,
          in_progress_tickets: dTickets.filter(t => t.status === 'In Progress').length,
          resolved_tickets: dTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length
        };
      });
    };

    if (this.isStandalone()) {
      return of(calculateLocal());
    }

    return this.http.get<DepartmentStat[]>(`${this.baseUrl}/reports/department-stats`).pipe(
      catchError(() => of(calculateLocal()))
    );
  }

  getPriorityStats(departmentId?: number): Observable<PriorityStat[]> {
    const calculateLocal = (): PriorityStat[] => {
      let tickets = this.getStoredTickets();
      if (departmentId) tickets = tickets.filter(t => t.department_id === departmentId);
      return [
        { priority: 'Critical', count: tickets.filter(t => t.priority === 'Critical').length },
        { priority: 'High', count: tickets.filter(t => t.priority === 'High').length },
        { priority: 'Medium', count: tickets.filter(t => t.priority === 'Medium').length },
        { priority: 'Low', count: tickets.filter(t => t.priority === 'Low').length }
      ];
    };

    if (this.isStandalone()) {
      return of(calculateLocal());
    }

    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<PriorityStat[]>(`${this.baseUrl}/reports/priority-stats`, { params }).pipe(
      catchError(() => of(calculateLocal()))
    );
  }

  getStatusDistribution(departmentId?: number): Observable<StatusStat[]> {
    const calculateLocal = (): StatusStat[] => {
      let tickets = this.getStoredTickets();
      if (departmentId) tickets = tickets.filter(t => t.department_id === departmentId);
      return [
        { status: 'Open', count: tickets.filter(t => t.status === 'Open' || t.status === 'Acknowledged').length },
        { status: 'In Progress', count: tickets.filter(t => t.status === 'In Progress').length },
        { status: 'Resolved', count: tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length }
      ];
    };

    if (this.isStandalone()) {
      return of(calculateLocal());
    }

    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<StatusStat[]>(`${this.baseUrl}/reports/status-distribution`, { params }).pipe(
      catchError(() => of(calculateLocal()))
    );
  }

  getTrends(days: number = 7): Observable<TrendStat[]> {
    const calculateLocal = (): TrendStat[] => [
      { date: 'Nov 12', tickets: 2 },
      { date: 'Nov 13', tickets: 4 },
      { date: 'Nov 14', tickets: 1 },
      { date: 'Nov 15', tickets: 3 },
      { date: 'Nov 16', tickets: 5 },
      { date: 'Nov 17', tickets: 2 },
      { date: 'Nov 18', tickets: Math.max(4, this.getStoredTickets().length) }
    ];

    if (this.isStandalone()) {
      return of(calculateLocal());
    }

    return this.http.get<TrendStat[]>(`${this.baseUrl}/reports/trends`, {
      params: { days: days.toString() }
    }).pipe(
      catchError(() => of(calculateLocal()))
    );
  }

  // --- WhatsApp Simulator (Full Local Classification & Persistence Engine) ---
  simulateIncomingMessage(data: {
    sender_phone: string;
    message_text: string;
    employee_name?: string;
  }): Observable<any> {
    const executeSimulationLocally = () => {
      const classification = this.classifyMessageLocally(data.message_text);
      const tickets = this.getStoredTickets();

      // Sequential Ticket Number e.g. LKM-2026-00005
      const seq = tickets.length + 1;
      const ticketNum = `LKM-2026-${seq.toString().padStart(5, '0')}`;

      // Create new ticket object
      const newTicket: Ticket = {
        id: Date.now(),
        ticket_number: ticketNum,
        issue_title: classification.asset 
          ? `${classification.asset} Issue Reported` 
          : `${classification.category} Issue Reported`,
        description: data.message_text,
        category: classification.category,
        department_id: classification.departmentId,
        department_name: classification.departmentName,
        department_code: classification.departmentCode,
        priority: classification.priority,
        asset: classification.asset,
        location: 'Production Floor',
        employee_phone: data.sender_phone,
        reported_by_name: data.employee_name || 'Rajesh Kumar',
        source_platform: 'SIMULATED_WHATSAPP',
        status: 'Open',
        confidence_score: classification.confidence,
        needs_review: classification.needsReview,
        original_message_text: data.message_text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        history: [
          {
            id: Date.now(),
            ticket_id: Date.now(),
            action: 'CREATED',
            old_status: undefined,
            new_status: 'Open',
            comment: `Created automatically via SIMULATED WhatsApp message from ${data.sender_phone}`,
            changed_by_name: 'System/WhatsApp',
            created_at: new Date().toISOString()
          }
        ]
      };

      // PREPEND to tickets so it appears at top of /tickets and /dashboard!
      tickets.unshift(newTicket);
      this.saveTickets(tickets);

      // Confirmation notification message
      const botResponse = `Hello! Your issue has been successfully registered.\n\nTicket ID: ${ticketNum}\nIssue: ${newTicket.issue_title}\nDepartment: ${classification.departmentName}\nPriority: ${classification.priority}\nStatus: Open\n\nOur ${classification.departmentName.toLowerCase()} team has been notified.\n\nThank you for reporting this issue.`;

      // Save notification to audit log
      const notifs = this.getStoredNotifications();
      const newNotif: NotificationRecord = {
        id: Date.now(),
        ticket_id: newTicket.id,
        recipient_phone: data.sender_phone,
        channel: 'WHATSAPP',
        template_name: 'ticket_confirmation',
        message_content: botResponse,
        status: 'SENT',
        sent_at: new Date().toISOString()
      };
      notifs.unshift(newNotif);
      this.saveNotifications(notifs);

      return {
        success: true,
        mode: 'SIMULATION',
        is_duplicate: false,
        provider_message_id: 'sim_wamid_' + Date.now().toString(16),
        ticket: newTicket,
        simulated_whatsapp_response: botResponse
      };
    };

    if (this.isStandalone()) {
      return of(executeSimulationLocally());
    }

    return this.http.post<any>(`${this.baseUrl}/simulator/send`, data).pipe(
      catchError(() => of(executeSimulationLocally()))
    );
  }

  getSimulatedNotifications(): Observable<NotificationRecord[]> {
    if (this.isStandalone()) {
      return of(this.getStoredNotifications());
    }

    return this.http.get<NotificationRecord[]>(`${this.baseUrl}/simulator/notifications`).pipe(
      catchError(() => of(this.getStoredNotifications()))
    );
  }

  // --- Export Methods with Dynamic CSV/Excel Generation ---
  exportCsv(departmentId?: number): Observable<Blob> {
    const generateCsvBlob = (): Blob => {
      let tickets = this.getStoredTickets();
      if (departmentId) tickets = tickets.filter(t => t.department_id === departmentId);
      
      const headers = ['Ticket ID', 'Issue Title', 'Department', 'Priority', 'Status', 'Reported By', 'Phone', 'Created At'];
      const rows = tickets.map(t => [
        t.ticket_number,
        `"${t.issue_title.replace(/"/g, '""')}"`,
        t.department_name || '',
        t.priority,
        t.status,
        `"${(t.reported_by_name || '').replace(/"/g, '""')}"`,
        t.employee_phone || '',
        t.created_at
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    };

    if (this.isStandalone()) {
      return of(generateCsvBlob());
    }

    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get(`${this.baseUrl}/reports/export/csv`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(() => of(generateCsvBlob()))
    );
  }

  exportExcel(departmentId?: number): Observable<Blob> {
    // Return CSV-formatted spreadsheet blob
    return this.exportCsv(departmentId);
  }

  getExportCsvUrl(): string {
    return `${this.baseUrl}/reports/export/csv`;
  }

  getExportExcelUrl(): string {
    return `${this.baseUrl}/reports/export/excel`;
  }
}
