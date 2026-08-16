/**
 * Class Scheduler Component
 * 
 * Weekly/monthly calendar view for classes with booking integration.
 * Used for: Gym classes, Salon appointments with stylist selection
 * 
 * Features:
 * - Weekly/monthly calendar view
 * - Class type filtering
 * - Instructor selection
 * - Capacity/spots remaining
 * - Integration with booking widget
 * - Time slot selection
 */

class ClassScheduler {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'class-scheduler-container',
      view: config.view || 'week', // 'week' or 'month'
      classes: config.classes || [],
      instructors: config.instructors || [],
      startDate: config.startDate ? new Date(config.startDate) : new Date(),
      onClassSelect: config.onClassSelect || null,
      bookingWidget: config.bookingWidget || null, // BookingWidget instance
      ...config
    };
    
    this.container = null;
    this.currentDate = new Date(this.config.startDate);
    this.selectedClass = null;
    this.selectedInstructor = null;
    this.selectedClassType = 'all';
  }

  /**
   * Initialize and render the scheduler
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`ClassScheduler: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the scheduler
   */
  render() {
    const filtersHTML = this.buildFiltersHTML();
    const calendarHTML = this.buildCalendarHTML();
    
    this.container.innerHTML = `
      <div class="class-scheduler">
        ${filtersHTML}
        ${calendarHTML}
      </div>
      <style>
        .class-scheduler {
          max-width: 1200px;
          margin: 0 auto;
        }
        .scheduler-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 8px;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .filter-group label {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .filter-select {
          padding: 8px 12px;
          border: 1px solid var(--color-border, #ddd);
          border-radius: 6px;
          font-size: 0.9rem;
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .calendar-nav {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .nav-btn {
          padding: 8px 16px;
          border: 1px solid var(--color-border, #ddd);
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .nav-btn:hover {
          background: var(--color-surface-hover, #f5f5f5);
        }
        .current-date {
          font-size: 1.25rem;
          font-weight: 700;
        }
        .view-toggle {
          display: flex;
          gap: 8px;
        }
        .view-btn {
          padding: 8px 16px;
          border: 1px solid var(--color-border, #ddd);
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .view-btn.active {
          background: var(--color-primary, #2563eb);
          color: white;
          border-color: var(--color-primary, #2563eb);
        }
        .calendar-grid {
          display: grid;
          gap: 16px;
        }
        .calendar-week {
          grid-template-columns: repeat(7, 1fr);
        }
        .calendar-month {
          grid-template-columns: repeat(7, 1fr);
        }
        .day-header {
          font-weight: 600;
          text-align: center;
          padding: 12px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 6px;
        }
        .day-cell {
          min-height: 120px;
          padding: 12px;
          background: white;
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 6px;
        }
        .day-number {
          font-weight: 600;
          margin-bottom: 8px;
        }
        .day-number.today {
          color: var(--color-primary, #2563eb);
        }
        .day-number.other-month {
          color: var(--color-muted, #999);
        }
        .class-item {
          padding: 8px;
          margin-bottom: 8px;
          background: var(--color-primary-light, #eff6ff);
          border-left: 3px solid var(--color-primary, #2563eb);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .class-item:hover {
          background: var(--color-primary, #2563eb);
          color: white;
        }
        .class-time {
          font-size: 0.85rem;
          font-weight: 600;
        }
        .class-name {
          font-size: 0.9rem;
          margin-top: 4px;
        }
        .class-instructor {
          font-size: 0.8rem;
          color: var(--color-muted, #666);
          margin-top: 4px;
        }
        .class-item:hover .class-instructor {
          color: rgba(255,255,255,0.9);
        }
        .class-spots {
          font-size: 0.75rem;
          margin-top: 4px;
        }
        .class-spots.low {
          color: var(--color-error, #ef4444);
        }
        .no-classes {
          text-align: center;
          color: var(--color-muted, #666);
          padding: 24px;
        }
        @media (max-width: 768px) {
          .calendar-week,
          .calendar-month {
            grid-template-columns: 1fr;
          }
          .day-header {
            display: none;
          }
        }
      </style>
    `;
  }

  /**
   * Build filters HTML
   */
  buildFiltersHTML() {
    const classTypes = [...new Set(this.config.classes.map(c => c.type).filter(Boolean))];
    
    return `
      <div class="scheduler-filters">
        <div class="filter-group">
          <label>Class Type:</label>
          <select class="filter-select" data-filter="classType">
            <option value="all">All Classes</option>
            ${classTypes.map(type => `
              <option value="${type}" ${this.selectedClassType === type ? 'selected' : ''}>
                ${type}
              </option>
            `).join('')}
          </select>
        </div>
        ${this.config.instructors.length > 0 ? `
          <div class="filter-group">
            <label>Instructor:</label>
            <select class="filter-select" data-filter="instructor">
              <option value="all">All Instructors</option>
              ${this.config.instructors.map(inst => `
                <option value="${inst.id}" ${this.selectedInstructor === inst.id ? 'selected' : ''}>
                  ${inst.name}
                </option>
              `).join('')}
            </select>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Build calendar HTML
   */
  buildCalendarHTML() {
    const isWeekView = this.config.view === 'week';
    const days = isWeekView ? this.getWeekDays() : this.getMonthDays();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return `
      <div class="calendar-header">
        <div class="calendar-nav">
          <button class="nav-btn" data-action="prev">← Previous</button>
          <div class="current-date">${this.getCurrentDateLabel()}</div>
          <button class="nav-btn" data-action="next">Next →</button>
        </div>
        <div class="view-toggle">
          <button class="view-btn ${this.config.view === 'week' ? 'active' : ''}" data-view="week">
            Week
          </button>
          <button class="view-btn ${this.config.view === 'month' ? 'active' : ''}" data-view="month">
            Month
          </button>
        </div>
      </div>
      <div class="calendar-grid ${isWeekView ? 'calendar-week' : 'calendar-month'}">
        ${dayNames.map(name => `
          <div class="day-header">${name}</div>
        `).join('')}
        ${days.map(day => this.buildDayCell(day)).join('')}
      </div>
    `;
  }

  /**
   * Build day cell HTML
   */
  buildDayCell(day) {
    const isToday = this.isToday(day);
    const isOtherMonth = day.getMonth() !== this.currentDate.getMonth();
    const classes = this.getClassesForDay(day);
    
    return `
      <div class="day-cell">
        <div class="day-number ${isToday ? 'today' : ''} ${isOtherMonth ? 'other-month' : ''}">
          ${day.getDate()}
        </div>
        ${classes.length > 0 ? classes.map(cls => this.buildClassItemHTML(cls, day)).join('') : ''}
      </div>
    `;
  }

  /**
   * Build class item HTML
   */
  buildClassItemHTML(cls, day) {
    const spotsRemaining = cls.capacity ? cls.capacity - (cls.booked || 0) : null;
    const isLowSpots = spotsRemaining !== null && spotsRemaining <= 3;
    
    return `
      <div class="class-item" 
           data-class-id="${cls.id}"
           data-date="${this.formatDate(day)}"
           data-time="${cls.time}">
        <div class="class-time">${cls.time}</div>
        <div class="class-name">${cls.name}</div>
        ${cls.instructor ? `
          <div class="class-instructor">${cls.instructor}</div>
        ` : ''}
        ${spotsRemaining !== null ? `
          <div class="class-spots ${isLowSpots ? 'low' : ''}">
            ${spotsRemaining} ${spotsRemaining === 1 ? 'spot' : 'spots'} left
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Get week days
   */
  getWeekDays() {
    const start = new Date(this.currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day); // Start of week (Sunday)
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }
    return days;
  }

  /**
   * Get month days
   */
  getMonthDays() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start on Sunday
    
    const days = [];
    const current = new Date(startDate);
    
    // 6 weeks * 7 days = 42 days
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  /**
   * Get classes for a specific day
   */
  getClassesForDay(day) {
    const dayStr = this.formatDate(day);
    
    return this.config.classes.filter(cls => {
      // Filter by class type
      if (this.selectedClassType !== 'all' && cls.type !== this.selectedClassType) {
        return false;
      }
      
      // Filter by instructor
      if (this.selectedInstructor && this.selectedInstructor !== 'all') {
        const instructor = this.config.instructors.find(i => i.id === this.selectedInstructor);
        if (instructor && cls.instructor !== instructor.name) {
          return false;
        }
      }
      
      // Check if class occurs on this day
      if (cls.daysOfWeek) {
        const dayOfWeek = day.getDay();
        return cls.daysOfWeek.includes(dayOfWeek);
      }
      
      if (cls.dates) {
        return cls.dates.includes(dayStr);
      }
      
      // Default: show if no specific day restriction
      return true;
    }).sort((a, b) => {
      // Sort by time
      return (a.time || '').localeCompare(b.time || '');
    });
  }

  /**
   * Check if date is today
   */
  isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get current date label
   */
  getCurrentDateLabel() {
    if (this.config.view === 'week') {
      const weekDays = this.getWeekDays();
      const start = weekDays[0];
      const end = weekDays[6];
      return `${this.formatDateShort(start)} - ${this.formatDateShort(end)}`;
    } else {
      return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  /**
   * Format date short
   */
  formatDateShort(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Navigation buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        if (action === 'prev') {
          this.previousPeriod();
        } else if (action === 'next') {
          this.nextPeriod();
        }
      });
    });

    // View toggle
    this.container.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.getAttribute('data-view');
        this.config.view = view;
        this.render();
        this.attachEventListeners();
      });
    });

    // Filters
    this.container.querySelectorAll('[data-filter]').forEach(select => {
      select.addEventListener('change', (e) => {
        const filterType = select.getAttribute('data-filter');
        const value = select.value;
        
        if (filterType === 'classType') {
          this.selectedClassType = value;
        } else if (filterType === 'instructor') {
          this.selectedInstructor = value;
        }
        
        this.render();
        this.attachEventListeners();
      });
    });

    // Class selection
    this.container.querySelectorAll('.class-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const classId = item.getAttribute('data-class-id');
        const date = item.getAttribute('data-date');
        const time = item.getAttribute('data-time');
        
        this.selectClass(classId, date, time);
      });
    });
  }

  /**
   * Navigate to previous period
   */
  previousPeriod() {
    if (this.config.view === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
    } else {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    }
    this.render();
    this.attachEventListeners();
  }

  /**
   * Navigate to next period
   */
  nextPeriod() {
    if (this.config.view === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
    } else {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    }
    this.render();
    this.attachEventListeners();
  }

  /**
   * Select a class
   */
  selectClass(classId, date, time) {
    const cls = this.config.classes.find(c => c.id === classId);
    if (!cls) return;

    this.selectedClass = {
      ...cls,
      selectedDate: date,
      selectedTime: time
    };

    if (this.config.onClassSelect) {
      this.config.onClassSelect(this.selectedClass);
    }

    // If booking widget is configured, trigger booking
    if (this.config.bookingWidget) {
      this.triggerBooking();
    }
  }

  /**
   * Trigger booking widget
   */
  triggerBooking() {
    if (this.config.bookingWidget && this.selectedClass) {
      // Pass class info to booking widget
      const bookingData = {
        class: this.selectedClass.name,
        date: this.selectedClass.selectedDate,
        time: this.selectedClass.selectedTime,
        instructor: this.selectedClass.instructor
      };
      
      // Initialize booking widget if not already done
      if (typeof this.config.bookingWidget === 'object' && this.config.bookingWidget.init) {
        this.config.bookingWidget.init();
      }
    }
  }

  /**
   * Get selected class
   */
  getSelectedClass() {
    return this.selectedClass;
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClassScheduler;
}

// Make available globally
window.ClassScheduler = ClassScheduler;

