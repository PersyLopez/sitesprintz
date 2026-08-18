import React, { useState, useMemo } from 'react';
import './FAQWidget.css';

const FAQ_DATA = [
  {
    id: 'publishing',
    question: 'Why isn\'t my site publishing?',
    answer: 'Make sure you\'ve selected a template, added your business name, and completed all required fields. Check that your internet connection is stable and try again.',
    category: 'Publishing'
  },
  {
    id: 'domain',
    question: 'How do I connect my domain?',
    answer: 'Go to Settings > Domain, then follow the instructions to add DNS records. Your domain provider will need to point to our servers.',
    category: 'Domain'
  },
  {
    id: 'plans',
    question: 'What\'s included in each plan?',
    answer: 'Starter: your website, hours, menu, and contact. Growth: booking, checkout, order management, and a custom domain.',
    category: 'Plans'
  },
  {
    id: 'templates',
    question: 'Can I change my template after publishing?',
    answer: 'Yes! You can switch templates anytime from the editor. Your content will be preserved where possible.',
    category: 'Templates'
  },
  {
    id: 'images',
    question: 'What image formats are supported?',
    answer: 'We support JPG, PNG, and WebP formats. For best performance, use WebP or optimized JPG images under 500KB.',
    category: 'Images'
  },
  {
    id: 'customization',
    question: 'How much can I customize my site?',
    answer: 'You can customize colors, fonts, content, images, and layout. Growth plans also allow a custom domain.',
    category: 'Customization'
  }
];

function FAQWidget({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filteredFAQs = useMemo(() => {
    if (!searchQuery) return FAQ_DATA;
    const query = searchQuery.toLowerCase();
    return FAQ_DATA.filter(faq => 
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleFAQ = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="faq-widget">
      <div className="faq-header">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-search">
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="faq-search-input"
          />
        </div>
      </div>

      <div className="faq-list">
        {filteredFAQs.length === 0 ? (
          <div className="faq-empty">
            <p>No FAQs found matching "{searchQuery}"</p>
          </div>
        ) : (
          filteredFAQs.map(faq => (
            <div key={faq.id} className="faq-item">
              <button
                className="faq-question"
                onClick={() => toggleFAQ(faq.id)}
                aria-expanded={expandedId === faq.id}
              >
                <span>{faq.question}</span>
                <span className="faq-icon">{expandedId === faq.id ? '−' : '+'}</span>
              </button>
              {expandedId === faq.id && (
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                  <span className="faq-category">{faq.category}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default FAQWidget;



