import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { NotificationRecord } from '../../core/models/models';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container-fluid py-4 px-4">
      <!-- Title Header -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div class="d-flex align-items-center gap-2">
            <h4 class="fw-bold mb-0 text-dark">WhatsApp Integration Sandbox</h4>
            <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
              <i class="bi bi-shield-check me-1"></i> SIMULATION MODE
            </span>
          </div>
          <p class="text-secondary small mb-0 mt-1">
            Test shop-floor employee messages, live Gemini AI classification, automatic ticket creation, and WhatsApp notifications without Meta credentials.
          </p>
        </div>
      </div>

      <div class="row g-4">
        <!-- Message Dispatcher Column -->
        <div class="col-12 col-lg-6">
          <div class="card shadow-sm border h-100">
            <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <span class="fw-bold text-dark"><i class="bi bi-chat-left-dots-fill text-success me-2"></i> Employee Message Dispatcher</span>
              <small class="text-muted">Simulate Webhook</small>
            </div>
            <div class="card-body p-4">
              <!-- Preset Prompts -->
              <label class="form-label small fw-semibold text-secondary">Quick Industrial Test Prompts:</label>
              <div class="d-flex flex-wrap gap-2 mb-3">
                <button
                  *ngFor="let p of samplePrompts"
                  type="button"
                  (click)="selectPrompt(p)"
                  class="btn btn-sm btn-outline-secondary text-start"
                  style="font-size: 0.78rem;"
                >
                  {{ p.title }}
                </button>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Employee WhatsApp Number</label>
                <div class="input-group input-group-sm">
                  <span class="input-group-text bg-light"><i class="bi bi-telephone-fill text-muted"></i></span>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="+919876543210"
                    [(ngModel)]="senderPhone"
                  />
                </div>
                <small class="text-muted" style="font-size: 0.72rem;">Mapped to employee database directory</small>
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Employee Name (Optional)</label>
                <input
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="e.g. Rajesh Kumar"
                  [(ngModel)]="employeeName"
                />
              </div>

              <div class="mb-3">
                <label class="form-label small fw-semibold">Operational Issue Message (Shop Floor)</label>
                <textarea
                  class="form-control"
                  rows="3"
                  placeholder="Type an employee problem message..."
                  [(ngModel)]="messageText"
                ></textarea>
              </div>

              <button
                (click)="sendMessage()"
                class="btn btn-success w-100 py-2 fw-semibold d-flex align-items-center justify-content-center"
                [disabled]="sending || !messageText.trim()"
              >
                <span *ngIf="sending" class="spinner-border spinner-border-sm me-2"></span>
                <i *ngIf="!sending" class="bi bi-send-fill me-2"></i>
                {{ sending ? 'AI Processing & Ticket Generating...' : 'Send Simulated WhatsApp Message' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Phone Screen Mockup Column -->
        <div class="col-12 col-lg-6">
          <div class="card shadow-sm border h-100">
            <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <span class="fw-bold text-dark"><i class="bi bi-phone-fill text-primary me-2"></i> Employee Phone WhatsApp Preview</span>
              <span class="badge bg-light text-muted border">End-to-End View</span>
            </div>
            <div class="card-body p-4 bg-light d-flex flex-column justify-content-between">
              <!-- Chat Container -->
              <div class="chat-container bg-white rounded border p-3 shadow-sm mb-3" style="min-height: 280px;">
                <!-- Outgoing Employee Message -->
                <div *ngIf="lastSentMessage" class="d-flex justify-content-end mb-3">
                  <div class="p-2 px-3 rounded text-white shadow-sm" style="background-color: #075e54; max-width: 80%; font-size: 0.85rem;">
                    <div>{{ lastSentMessage }}</div>
                    <div class="text-end text-white-50 mt-1" style="font-size: 0.65rem;">Just now <i class="bi bi-check2-all text-info"></i></div>
                  </div>
                </div>

                <!-- Incoming WhatsApp Bot Confirmation -->
                <div *ngIf="lastResponse" class="d-flex justify-content-start mb-3">
                  <div class="p-3 rounded bg-light border shadow-sm" style="max-width: 85%; font-size: 0.82rem; white-space: pre-line; line-height: 1.4;">
                    <div class="fw-bold text-success mb-1"><i class="bi bi-robot me-1"></i> LKM SmartDesk Bot</div>
                    {{ lastResponse.simulated_whatsapp_response }}
                    <div class="text-end text-muted mt-2" style="font-size: 0.65rem;">Delivered <i class="bi bi-check2 text-muted"></i></div>
                  </div>
                </div>

                <div *ngIf="!lastSentMessage && !lastResponse" class="text-center text-muted py-5">
                  <i class="bi bi-chat-dots fs-1 d-block mb-2 text-secondary"></i>
                  Send a simulated message on the left to preview the automated WhatsApp interaction here.
                </div>
              </div>

              <!-- AI Output Metrics Card if Ticket Created -->
              <div *ngIf="lastResponse?.ticket" class="card border shadow-sm p-3 bg-white">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="badge bg-primary fw-semibold">{{ lastResponse.ticket.ticket_number }}</span>
                  <a [routerLink]="['/tickets']" [queryParams]="{ id: lastResponse.ticket.id }" class="small fw-semibold text-decoration-none">
                    Open in Tickets &rarr;
                  </a>
                </div>
                <div class="row g-2 small">
                  <div class="col-6">
                    <span class="text-muted d-block">Department:</span>
                    <strong>{{ lastResponse.ticket.department_name }}</strong>
                  </div>
                  <div class="col-6">
                    <span class="text-muted d-block">Priority:</span>
                    <strong class="text-danger">{{ lastResponse.ticket.priority }}</strong>
                  </div>
                  <div class="col-6">
                    <span class="text-muted d-block">Confidence:</span>
                    <strong>{{ (lastResponse.ticket.confidence_score * 100).toFixed(0) }}%</strong>
                  </div>
                  <div class="col-6">
                    <span class="text-muted d-block">Needs Review:</span>
                    <strong>{{ lastResponse.ticket.needs_review ? 'YES' : 'No' }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Simulated Notifications Delivery Audit Log -->
      <div class="card shadow-sm border mt-4">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <span class="fw-bold text-dark"><i class="bi bi-journal-text text-secondary me-2"></i> WhatsApp Dispatch Audit Log</span>
          <button (click)="loadNotifications()" class="btn btn-sm btn-outline-secondary">
            <i class="bi bi-arrow-clockwise me-1"></i> Refresh Log
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Recipient Phone</th>
                <th>Template</th>
                <th>Message Content</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let n of notifications">
                <td><strong class="text-dark">{{ n.recipient_phone }}</strong></td>
                <td><span class="badge bg-light text-dark border">{{ n.template_name || 'custom' }}</span></td>
                <td class="text-truncate" style="max-width: 320px;" title="{{ n.message_content }}">
                  {{ n.message_content }}
                </td>
                <td><span class="badge bg-success-subtle text-success">{{ n.channel }}</span></td>
                <td>
                  <span class="badge bg-success text-white">{{ n.status }}</span>
                </td>
                <td><small class="text-muted">{{ n.sent_at | date:'mediumTime' }}</small></td>
              </tr>
              <tr *ngIf="notifications.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">No notifications dispatched yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class SimulatorComponent implements OnInit {
  api = inject(ApiService);

  senderPhone = '+919876543210';
  employeeName = 'Rajesh Kumar';
  messageText = 'Machine 04 stopped working on the production floor.';
  sending = false;

  lastSentMessage = '';
  lastResponse: any = null;
  notifications: NotificationRecord[] = [];

  samplePrompts = [
    {
      title: 'Machine 04 Breakdown (Maintenance)',
      phone: '+919876543210',
      name: 'Rajesh Kumar',
      text: 'Machine 04 stopped working on the production floor.'
    },
    {
      title: 'Raw Material Shortage (Purchase)',
      phone: '+919876543213',
      name: 'Amit Verma',
      text: "Raw materials have not arrived for today's production."
    },
    {
      title: 'Quality Batch Rejection (Quality)',
      phone: '+919876543212',
      name: 'Priya Sharma',
      text: 'Quality inspection rejected the latest batch.'
    },
    {
      title: 'Tool Shortage (Stores)',
      phone: '+919876543213',
      name: 'Amit Verma',
      text: 'There is a shortage of tools in the maintenance department.'
    },
    {
      title: 'Equipment Failure Delay (Production)',
      phone: '+919876543210',
      name: 'Rajesh Kumar',
      text: 'Production is delayed because of equipment failure.'
    },
    {
      title: 'Office Network Down (IT)',
      phone: '+919876543214',
      name: 'Sneha Reddy',
      text: 'The office network is not working.'
    },
    {
      title: 'Night Shift Staffing (HR)',
      phone: '+919876543214',
      name: 'Sneha Reddy',
      text: 'We need additional workers for the night shift.'
    },
    {
      title: 'Ambiguous Issue (Review Flag)',
      phone: '+919876543210',
      name: 'Rajesh Kumar',
      text: 'Something seems odd.'
    }
  ];

  ngOnInit(): void {
    this.loadNotifications();
  }

  selectPrompt(p: any): void {
    this.senderPhone = p.phone;
    this.employeeName = p.name;
    this.messageText = p.text;
  }

  sendMessage(): void {
    if (!this.messageText.trim()) return;
    this.sending = true;
    this.lastSentMessage = this.messageText;

    this.api.simulateIncomingMessage({
      sender_phone: this.senderPhone,
      message_text: this.messageText,
      employee_name: this.employeeName
    }).subscribe({
      next: (res) => {
        this.lastResponse = res;
        this.sending = false;
        this.loadNotifications();
      },
      error: (err) => {
        alert(`Error simulating message: ${err.error?.detail || err.message}`);
        this.sending = false;
      }
    });
  }

  loadNotifications(): void {
    this.api.getSimulatedNotifications().subscribe({
      next: (data) => this.notifications = data,
      error: (e) => console.error(e)
    });
  }
}
