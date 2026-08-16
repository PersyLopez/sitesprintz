/**
 * DiagnosticQuiz Component Unit Tests
 * 
 * Tests for the diagnostic quiz component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('DiagnosticQuiz', () => {
  let DiagnosticQuiz;
  let dom;
  let document;
  let container;

  beforeEach(async () => {
    // Setup JSDOM
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="quiz-container"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });
    
    global.document = dom.window.document;
    global.window = dom.window;
    document = dom.window.document;
    
    container = document.getElementById('quiz-container');

    // Import the module
    const module = await import('../../../public/modules/diagnostic-quiz.js');
    DiagnosticQuiz = module.default || window.DiagnosticQuiz;
  });

  afterEach(() => {
    if (container) {
      container.innerHTML = '';
    }
    delete global.document;
    delete global.window;
  });

  describe('Constructor', () => {
    it('should create a DiagnosticQuiz instance', () => {
      const questions = [
        {
          question: 'What is your issue?',
          type: 'radio',
          options: [
            { value: 'option1', label: 'Option 1' }
          ]
        }
      ];

      const quiz = new DiagnosticQuiz({
        containerId: 'quiz-container',
        questions: questions,
        onComplete: vi.fn()
      });

      expect(quiz).toBeDefined();
      expect(quiz.config.questions).toEqual(questions);
      expect(quiz.currentQuestionIndex).toBe(0);
    });

    it('should initialize with empty answers', () => {
      const quiz = new DiagnosticQuiz({
        containerId: 'quiz-container',
        questions: [],
        onComplete: vi.fn()
      });

      expect(quiz.answers).toEqual({});
    });
  });

  describe('init()', () => {
    it('should render quiz UI when container exists', () => {
      const quiz = new DiagnosticQuiz({
        containerId: 'quiz-container',
        questions: [],
        onComplete: vi.fn()
      });

      quiz.init();

      expect(container.innerHTML).not.toBe('');
      expect(container.querySelector('.diagnostic-quiz')).toBeTruthy();
    });
  });

  describe('nextQuestion()', () => {
    it('should advance to next question when answer is provided', () => {
      const questions = [
        {
          question: 'Question 1?',
          type: 'radio',
          options: [
            { value: 'a', label: 'Answer A' }
          ]
        },
        {
          question: 'Question 2?',
          type: 'radio',
          options: [
            { value: 'b', label: 'Answer B' }
          ]
        }
      ];

      const quiz = new DiagnosticQuiz({
        containerId: 'quiz-container',
        questions: questions,
        onComplete: vi.fn()
      });

      quiz.init();
      quiz.answers['Question 1?'] = 'a';
      quiz.nextQuestion();

      expect(quiz.currentQuestionIndex).toBe(1);
    });

    it('should not advance if answer is not provided', () => {
      const questions = [
        {
          question: 'Question 1?',
          type: 'radio',
          options: [
            { value: 'a', label: 'Answer A' }
          ]
        }
      ];

      const quiz = new DiagnosticQuiz({
        containerId: 'quiz-container',
        questions: questions,
        onComplete: vi.fn()
      });

      quiz.init();
      const initialIndex = quiz.currentQuestionIndex;
      quiz.nextQuestion();

      expect(quiz.currentQuestionIndex).toBe(initialIndex);
    });
  });

  describe('renderResults()', () => {
    it('should call onComplete callback with answers', () => {
      const onComplete = vi.fn();
      const questions = [
        {
          question: 'Question 1?',
          type: 'radio',
          options: [
            { value: 'a', label: 'Answer A' }
          ]
        }
      ];

      const quiz = new DiagnosticQuiz({
        containerId: 'quiz-container',
        questions: questions,
        onComplete: onComplete
      });

      quiz.init();
      quiz.answers = { 'Question 1?': 'a' };
      quiz.currentQuestionIndex = questions.length;
      quiz.render();

      expect(onComplete).toHaveBeenCalledWith({ 'Question 1?': 'a' });
    });
  });
});

