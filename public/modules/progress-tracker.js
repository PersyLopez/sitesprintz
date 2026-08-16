/**
 * Progress Tracker Component
 * 
 * Order/repair/appointment status tracking with real-time updates.
 * Used for: Tech Repair (mail-in tracking), Home Services (job tracking), Medical (appointment status)
 * 
 * Features:
 * - Status timeline visualization
 * - Real-time updates
 * - Technician ETA display
 * - SMS/email notification hooks
 * - Estimated completion time
 */

class ProgressTracker {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'progress-tracker-container',
      orderId: config.orderId || null,
      status: config.status || 'pending',
      statuses: config.statuses || [
        { id: 'pending', label: 'Pending', description: 'Your request has been received' },
        { id: 'confirmed', label: 'Confirmed', description: 'We\'ve confirmed your request' },
        { id: 'in-progress', label: 'In Progress', description: 'Work has begun' },
        { id: 'completed', label: 'Completed', description: 'All done!' }
      ],
      currentStatus: config.currentStatus || 'pending',
      estimatedCompletion: config.estimatedCompletion || null,
      technicianETA: config.technicianETA || null,
      updates: config.updates || [],
      onStatusChange: config.onStatusChange || null,
      pollInterval: config.pollInterval || 30000, // 30 seconds
      ...config
    };
    
    this.container = null;
    this.pollTimer = null;
  }

  /**
   * Initialize and render the tracker
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`ProgressTracker: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.startPolling();
  }

  /**
   * Render the tracker
   */
  render() {
    const timelineHTML = this.buildTimelineHTML();
    const updatesHTML = this.buildUpdatesHTML();
    const etaHTML = this.buildETAHTML();
    
    this.container.innerHTML = `
      <div class="progress-tracker">
        <h3 class="tracker-title">${this.config.title || 'Track Your Order'}</h3>
        ${this.config.orderId ? `<div class="order-id">Order #${this.config.orderId}</div>` : ''}
        
        ${timelineHTML}
        ${etaHTML}
        ${updatesHTML}
      </div>
      <style>
        .progress-tracker {
          max-width: 800px;
          margin: 0 auto;
        }
        .tracker-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .order-id {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
          margin-bottom: 24px;
        }
        .status-timeline {
          position: relative;
          padding: 24px 0;
        }
        .timeline-line {
          position: absolute;
          left: 20px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--color-border, #e5e7eb);
        }
        .timeline-line.active {
          background: var(--color-primary, #2563eb);
        }
        .timeline-items {
          position: relative;
          z-index: 1;
        }
        .timeline-item {
          display: flex;
          align-items: start;
          margin-bottom: 32px;
          position: relative;
        }
        .timeline-marker {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--color-surface, #f8f9fa);
          border: 3px solid var(--color-border, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }
        .timeline-marker.completed {
          background: var(--color-primary, #2563eb);
          border-color: var(--color-primary, #2563eb);
          color: white;
        }
        .timeline-marker.current {
          background: var(--color-primary-light, #eff6ff);
          border-color: var(--color-primary, #2563eb);
          color: var(--color-primary, #2563eb);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .timeline-content {
          flex: 1;
          margin-left: 16px;
          padding-top: 8px;
        }
        .timeline-label {
          font-weight: 600;
          font-size: 1.1rem;
          margin-bottom: 4px;
        }
        .timeline-description {
          color: var(--color-muted, #666);
          font-size: 0.9rem;
        }
        .timeline-date {
          font-size: 0.85rem;
          color: var(--color-muted, #666);
          margin-top: 4px;
        }
        .eta-display {
          padding: 20px;
          background: var(--color-primary-light, #eff6ff);
          border-left: 4px solid var(--color-primary, #2563eb);
          border-radius: 8px;
          margin: 24px 0;
        }
        .eta-label {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
          margin-bottom: 8px;
        }
        .eta-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-primary, #2563eb);
        }
        .updates-section {
          margin-top: 32px;
        }
        .updates-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .update-item {
          padding: 16px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .update-time {
          font-size: 0.85rem;
          color: var(--color-muted, #666);
          margin-bottom: 4px;
        }
        .update-message {
          color: var(--color-text, #333);
        }
        @media (max-width: 768px) {
          .timeline-item {
            flex-direction: column;
          }
          .timeline-content {
            margin-left: 0;
            margin-top: 12px;
          }
        }
      </style>
    `;
  }

  /**
   * Build timeline HTML
   */
  buildTimelineHTML() {
    const currentIndex = this.config.statuses.findIndex(s => s.id === this.config.currentStatus);
    
    return `
      <div class="status-timeline">
        <div class="timeline-line ${currentIndex >= 0 ? 'active' : ''}" 
             style="height: ${(this.config.statuses.length - 1) * 80}px;"></div>
        <div class="timeline-items">
          ${this.config.statuses.map((status, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const statusUpdate = this.config.updates.find(u => u.status === status.id);
            
            return `
              <div class="timeline-item">
                <div class="timeline-marker ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                  ${isCompleted ? '✓' : index + 1}
                </div>
                <div class="timeline-content">
                  <div class="timeline-label">${status.label}</div>
                  <div class="timeline-description">${status.description}</div>
                  ${statusUpdate ? `
                    <div class="timeline-date">
                      ${this.formatDate(statusUpdate.timestamp)}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Build ETA HTML
   */
  buildETAHTML() {
    if (!this.config.technicianETA && !this.config.estimatedCompletion) {
      return '';
    }

    const eta = this.config.technicianETA || this.config.estimatedCompletion;
    const label = this.config.technicianETA ? 'Technician ETA' : 'Estimated Completion';

    return `
      <div class="eta-display">
        <div class="eta-label">${label}</div>
        <div class="eta-value">${this.formatETA(eta)}</div>
      </div>
    `;
  }

  /**
   * Build updates HTML
   */
  buildUpdatesHTML() {
    if (this.config.updates.length === 0) {
      return '';
    }

    return `
      <div class="updates-section">
        <div class="updates-title">Recent Updates</div>
        ${this.config.updates.slice().reverse().map(update => `
          <div class="update-item">
            <div class="update-time">${this.formatDateTime(update.timestamp)}</div>
            <div class="update-message">${update.message}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Start polling for status updates
   */
  startPolling() {
    if (!this.config.orderId || !this.config.pollInterval) return;

    this.pollTimer = setInterval(() => {
      this.checkStatus();
    }, this.config.pollInterval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Check status (to be implemented with API call)
   */
  async checkStatus() {
    // This would typically make an API call to check status
    // For now, it's a placeholder
    if (this.config.onStatusChange) {
      // Simulate status check
      // In real implementation, this would be:
      // const response = await fetch(`/api/orders/${this.config.orderId}/status`);
      // const data = await response.json();
      // this.updateStatus(data.status, data.updates, data.eta);
    }
  }

  /**
   * Update status
   */
  updateStatus(newStatus, updates, eta) {
    this.config.currentStatus = newStatus;
    if (updates) {
      this.config.updates = updates;
    }
    if (eta) {
      this.config.technicianETA = eta;
    }
    this.render();
  }

  /**
   * Format date
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Format date and time
   */
  formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  /**
   * Format ETA
   */
  formatETA(eta) {
    if (!eta) return 'N/A';
    
    if (typeof eta === 'string') {
      const date = new Date(eta);
      const now = new Date();
      const diff = date - now;
      
      if (diff < 0) return 'Arrived';
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }
    
    return eta;
  }

  /**
   * Destroy component
   */
  destroy() {
    this.stopPolling();
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressTracker;
}

// Make available globally
window.ProgressTracker = ProgressTracker;

