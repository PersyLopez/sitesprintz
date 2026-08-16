/**
 * Diagnostic Quiz Component
 * 
 * Interactive quiz for device/symptom/case evaluation with instant recommendations.
 * Used for: Tech Repair (device diagnostic), Medical (symptom checker), Legal (case evaluation)
 * 
 * Features:
 * - Multi-step question flow
 * - Conditional logic (show questions based on answers)
 * - Instant price/recommendation display
 * - Progress tracking
 * - Results summary
 */

class DiagnosticQuiz {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'diagnostic-quiz-container',
      questions: config.questions || [],
      recommendations: config.recommendations || {}, // Map answers to recommendations
      pricing: config.pricing || {}, // Map answers to prices
      onSubmit: config.onSubmit || null,
      showProgress: config.showProgress !== false,
      ...config
    };
    
    this.container = null;
    this.currentQuestionIndex = 0;
    this.answers = {};
    this.recommendation = null;
    this.price = null;
  }

  /**
   * Initialize and render the quiz
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`DiagnosticQuiz: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the quiz
   */
  render() {
    const question = this.getCurrentQuestion();
    
    if (!question) {
      // Show results
      this.renderResults();
      return;
    }

    const progressHTML = this.config.showProgress ? this.buildProgressHTML() : '';
    const questionHTML = this.buildQuestionHTML(question);
    
    this.container.innerHTML = `
      <div class="diagnostic-quiz">
        ${progressHTML}
        <div class="quiz-question">
          ${questionHTML}
        </div>
      </div>
      <style>
        .diagnostic-quiz {
          max-width: 700px;
          margin: 0 auto;
        }
        .quiz-progress {
          margin-bottom: 24px;
        }
        .progress-bar {
          height: 6px;
          background: var(--color-surface, #e5e7eb);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .progress-fill {
          height: 100%;
          background: var(--color-primary, #2563eb);
          transition: width 0.3s;
        }
        .progress-text {
          text-align: center;
          font-size: 0.9rem;
          color: var(--color-muted, #666);
        }
        .quiz-question {
          padding: 32px;
          background: var(--color-surface, #fff);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .question-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .question-description {
          color: var(--color-muted, #666);
          margin-bottom: 24px;
        }
        .question-image {
          width: 100%;
          max-width: 400px;
          margin: 0 auto 24px;
          border-radius: 8px;
        }
        .answer-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .answer-option {
          padding: 16px;
          background: var(--color-surface, #f8f9fa);
          border: 2px solid var(--color-border, #e5e7eb);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .answer-option:hover {
          border-color: var(--color-primary, #2563eb);
          background: var(--color-primary-light, #eff6ff);
        }
        .answer-option.selected {
          border-color: var(--color-primary, #2563eb);
          background: var(--color-primary-light, #eff6ff);
        }
        .answer-label {
          font-weight: 600;
          margin-bottom: 4px;
        }
        .answer-description {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
        }
        .quiz-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          gap: 12px;
        }
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: var(--color-primary, #2563eb);
          color: white;
        }
        .btn-primary:hover {
          background: var(--color-primary-dark, #1d4ed8);
        }
        .btn-secondary {
          background: var(--color-surface, #f8f9fa);
          color: var(--color-text, #333);
          border: 1px solid var(--color-border, #ddd);
        }
        .btn-secondary:hover {
          background: var(--color-surface-hover, #e5e7eb);
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .quiz-results {
          padding: 32px;
          background: var(--color-surface, #fff);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .results-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .recommendation-card {
          padding: 24px;
          background: var(--color-primary-light, #eff6ff);
          border-left: 4px solid var(--color-primary, #2563eb);
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .recommendation-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .recommendation-description {
          color: var(--color-text, #333);
          line-height: 1.6;
        }
        .price-display {
          padding: 20px;
          background: var(--color-surface, #f8f9fa);
          border-radius: 8px;
          text-align: center;
          margin-bottom: 24px;
        }
        .price-label {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
          margin-bottom: 8px;
        }
        .price-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-primary, #2563eb);
        }
        .results-actions {
          display: flex;
          gap: 12px;
        }
        .results-actions .btn {
          flex: 1;
        }
        @media (max-width: 768px) {
          .quiz-question,
          .quiz-results {
            padding: 24px;
          }
          .quiz-actions,
          .results-actions {
            flex-direction: column;
          }
          .btn {
            width: 100%;
          }
        }
      </style>
    `;
  }

  /**
   * Build progress indicator
   */
  buildProgressHTML() {
    const totalQuestions = this.getTotalQuestions();
    const progress = ((this.currentQuestionIndex + 1) / totalQuestions) * 100;

    return `
      <div class="quiz-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">
          Question ${this.currentQuestionIndex + 1} of ${totalQuestions}
        </div>
      </div>
    `;
  }

  /**
   * Build question HTML
   */
  buildQuestionHTML(question) {
    const optionsHTML = question.options.map((option, index) => `
      <div class="answer-option" 
           data-answer-value="${option.value}"
           data-question-id="${question.id}">
        <div class="answer-label">${option.label}</div>
        ${option.description ? `<div class="answer-description">${option.description}</div>` : ''}
      </div>
    `).join('');

    return `
      ${question.image ? `<img src="${question.image}" alt="${question.title}" class="question-image">` : ''}
      <div class="question-title">${question.title}</div>
      ${question.description ? `<div class="question-description">${question.description}</div>` : ''}
      <div class="answer-options">
        ${optionsHTML}
      </div>
      <div class="quiz-actions">
        ${this.currentQuestionIndex > 0 ? `
          <button class="btn btn-secondary" data-action="previous">Previous</button>
        ` : '<div></div>'}
        <button class="btn btn-primary" data-action="next" disabled>Next</button>
      </div>
    `;
  }

  /**
   * Render results
   */
  renderResults() {
    this.calculateResults();
    
    const recommendationHTML = this.recommendation ? `
      <div class="recommendation-card">
        <div class="recommendation-title">${this.recommendation.title || 'Recommendation'}</div>
        <div class="recommendation-description">
          ${this.recommendation.description || this.recommendation}
        </div>
      </div>
    ` : '';

    const priceHTML = this.price !== null ? `
      <div class="price-display">
        <div class="price-label">Estimated Price</div>
        <div class="price-value">${this.formatCurrency(this.price)}</div>
      </div>
    ` : '';

    this.container.innerHTML = `
      <div class="diagnostic-quiz">
        <div class="quiz-results">
          <div class="results-title">${this.config.resultsTitle || 'Your Results'}</div>
          ${recommendationHTML}
          ${priceHTML}
          <div class="results-actions">
            <button class="btn btn-secondary" data-action="restart">Start Over</button>
            <button class="btn btn-primary" data-action="submit">${this.config.submitButtonText || 'Get Started'}</button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Get current question
   */
  getCurrentQuestion() {
    // Filter questions based on conditional logic
    const availableQuestions = this.config.questions.filter(q => {
      if (!q.conditional) return true;
      return this.evaluateCondition(q.conditional);
    });

    return availableQuestions[this.currentQuestionIndex] || null;
  }

  /**
   * Get total questions (after filtering)
   */
  getTotalQuestions() {
    return this.config.questions.filter(q => {
      if (!q.conditional) return true;
      return this.evaluateCondition(q.conditional);
    }).length;
  }

  /**
   * Evaluate conditional logic
   */
  evaluateCondition(conditional) {
    const { questionId, operator, value } = conditional;
    const answer = this.answers[questionId];

    if (!answer) return false;

    switch (operator) {
      case 'equals':
        return answer === value;
      case 'notEquals':
        return answer !== value;
      case 'contains':
        return Array.isArray(answer) ? answer.includes(value) : answer?.includes(value);
      case 'in':
        return Array.isArray(value) ? value.includes(answer) : false;
      default:
        return true;
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Answer selection
    this.container.querySelectorAll('.answer-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const questionId = option.getAttribute('data-question-id');
        const answerValue = option.getAttribute('data-answer-value');
        
        // Remove previous selection for this question
        this.container.querySelectorAll(`[data-question-id="${questionId}"].selected`).forEach(opt => {
          opt.classList.remove('selected');
        });
        
        // Select this option
        option.classList.add('selected');
        this.answers[questionId] = answerValue;
        
        // Enable next button
        const nextBtn = this.container.querySelector('[data-action="next"]');
        if (nextBtn) {
          nextBtn.disabled = false;
        }
      });
    });

    // Navigation buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        if (action === 'next') {
          this.nextQuestion();
        } else if (action === 'previous') {
          this.previousQuestion();
        } else if (action === 'restart') {
          this.restart();
        } else if (action === 'submit') {
          this.handleSubmit();
        }
      });
    });
  }

  /**
   * Move to next question
   */
  nextQuestion() {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      this.renderResults();
      return;
    }

    // Check if we need to skip questions based on answer
    const answer = this.answers[currentQuestion.id];
    if (currentQuestion.skipLogic) {
      const skipRule = currentQuestion.skipLogic.find(rule => {
        return this.evaluateCondition({ questionId: currentQuestion.id, operator: 'equals', value: rule.if });
      });
      
      if (skipRule) {
        this.currentQuestionIndex += skipRule.skip;
      } else {
        this.currentQuestionIndex++;
      }
    } else {
      this.currentQuestionIndex++;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Move to previous question
   */
  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.render();
      this.attachEventListeners();
    }
  }

  /**
   * Calculate results based on answers
   */
  calculateResults() {
    // Find recommendation based on answers
    if (this.config.recommendations) {
      // Check each recommendation rule
      for (const [key, recommendation] of Object.entries(this.config.recommendations)) {
        if (this.matchesRecommendationRule(key)) {
          this.recommendation = recommendation;
          break;
        }
      }
    }

    // Calculate price based on answers
    if (this.config.pricing) {
      let totalPrice = 0;
      
      for (const [questionId, answer] of Object.entries(this.answers)) {
        const question = this.config.questions.find(q => q.id === questionId);
        if (question && question.pricing) {
          const option = question.options.find(opt => opt.value === answer);
          if (option && option.price) {
            totalPrice += option.price;
          }
        }
      }

      // Check for base pricing rules
      if (this.config.pricing.base) {
        totalPrice += this.config.pricing.base;
      }

      // Check for conditional pricing
      if (this.config.pricing.rules) {
        for (const rule of this.config.pricing.rules) {
          if (this.matchesPricingRule(rule)) {
            totalPrice = rule.price;
            break;
          }
        }
      }

      this.price = totalPrice;
    }
  }

  /**
   * Check if answers match recommendation rule
   */
  matchesRecommendationRule(ruleKey) {
    // Simple rule format: "questionId:answerValue"
    if (ruleKey.includes(':')) {
      const [questionId, answerValue] = ruleKey.split(':');
      return this.answers[questionId] === answerValue;
    }
    
    // Complex rule format (JSON string)
    try {
      const rule = JSON.parse(ruleKey);
      return rule.conditions.every(condition => {
        return this.evaluateCondition(condition);
      });
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if answers match pricing rule
   */
  matchesPricingRule(rule) {
    if (!rule.conditions) return false;
    
    return rule.conditions.every(condition => {
      return this.evaluateCondition(condition);
    });
  }

  /**
   * Handle form submission
   */
  handleSubmit() {
    const results = {
      answers: { ...this.answers },
      recommendation: this.recommendation,
      price: this.price
    };

    if (this.config.onSubmit) {
      this.config.onSubmit(results);
    } else {
      console.log('Quiz results:', results);
    }
  }

  /**
   * Restart quiz
   */
  restart() {
    this.currentQuestionIndex = 0;
    this.answers = {};
    this.recommendation = null;
    this.price = null;
    this.render();
    this.attachEventListeners();
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Get quiz results
   */
  getResults() {
    return {
      answers: { ...this.answers },
      recommendation: this.recommendation,
      price: this.price
    };
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagnosticQuiz;
}

// Make available globally
window.DiagnosticQuiz = DiagnosticQuiz;

