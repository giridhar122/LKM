import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

    return this.http.get<TicketListResponse>(`${this.baseUrl}/tickets`, { params });
  }

  getTicket(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/tickets/${id}`);
  }

  updateTicket(id: number, payload: TicketUpdatePayload): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.baseUrl}/tickets/${id}`, payload);
  }

  createTicket(payload: any): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.baseUrl}/tickets`, payload);
  }

  // --- Departments ---
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.baseUrl}/departments`);
  }

  createDepartment(dept: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(`${this.baseUrl}/departments`, dept);
  }

  updateDepartment(id: number, dept: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.baseUrl}/departments/${id}`, dept);
  }

  // --- Employees ---
  getEmployees(search?: string, departmentId?: number): Observable<Employee[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<Employee[]>(`${this.baseUrl}/employees`, { params });
  }

  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(`${this.baseUrl}/employees`, employee);
  }

  updateEmployee(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/employees/${id}`, employee);
  }

  // --- Reports & MIS ---
  getKPIs(departmentId?: number): Observable<KPIData> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<KPIData>(`${this.baseUrl}/reports/kpis`, { params });
  }

  getDepartmentStats(): Observable<DepartmentStat[]> {
    return this.http.get<DepartmentStat[]>(`${this.baseUrl}/reports/department-stats`);
  }

  getPriorityStats(departmentId?: number): Observable<PriorityStat[]> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<PriorityStat[]>(`${this.baseUrl}/reports/priority-stats`, { params });
  }

  getStatusDistribution(departmentId?: number): Observable<StatusStat[]> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get<StatusStat[]>(`${this.baseUrl}/reports/status-distribution`, { params });
  }

  getTrends(days: number = 7): Observable<TrendStat[]> {
    return this.http.get<TrendStat[]>(`${this.baseUrl}/reports/trends`, {
      params: { days: days.toString() }
    });
  }

  // --- WhatsApp Simulator ---
  simulateIncomingMessage(data: {
    sender_phone: string;
    message_text: string;
    employee_name?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/simulator/send`, data);
  }

  getSimulatedNotifications(): Observable<NotificationRecord[]> {
    return this.http.get<NotificationRecord[]>(`${this.baseUrl}/simulator/notifications`);
  }

  // --- Export Methods with Bearer Token ---
  exportCsv(departmentId?: number): Observable<Blob> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get(`${this.baseUrl}/reports/export/csv`, {
      params,
      responseType: 'blob'
    });
  }

  exportExcel(departmentId?: number): Observable<Blob> {
    let params = new HttpParams();
    if (departmentId) params = params.set('department_id', departmentId.toString());
    return this.http.get(`${this.baseUrl}/reports/export/excel`, {
      params,
      responseType: 'blob'
    });
  }

  // Export URLs
  getExportCsvUrl(): string {
    return `${this.baseUrl}/reports/export/csv`;
  }

  getExportExcelUrl(): string {
    return `${this.baseUrl}/reports/export/excel`;
  }
}
