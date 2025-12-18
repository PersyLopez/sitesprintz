import React, { useState, useMemo } from 'react';
import TemplatePreviewModal from './TemplatePreviewModal';
import { OptimizedImage } from '../common/OptimizedImage';
import './TemplateGrid.css';

function TemplateGrid({ templates, selectedTemplate, onSelect }) {
  const [groupBy, setGroupBy] = useState('category'); // 'tier', 'category', 'all'
  const [filterTier, setFilterTier] = useState('all'); // 'all', 'Pro', 'Premium', 'Starter'
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Filter and group templates
  const { groupedTemplates, categories, tiers } = useMemo(() => {
    // Filter by search query
    let filtered = templates.filter(template => {
      const searchLower = searchQuery.toLowerCase();
      const name = (template.name || template.businessName || '').toLowerCase();
      const description = (template.description || '').toLowerCase();
      const type = (template.type || '').toLowerCase();
      const category = (template.category || '').toLowerCase();

      return name.includes(searchLower) ||
        description.includes(searchLower) ||
        type.includes(searchLower) ||
        category.includes(searchLower);
    });

    // Filter by tier if not 'all'
    if (filterTier !== 'all') {
      filtered = filtered.filter(t => (t.tier || t.plan || 'Starter') === filterTier);
    }

    // Get unique categories and tiers
    const cats = [...new Set(filtered.map(t => t.category || 'Other'))].sort();
    const tiersSet = [...new Set(filtered.map(t => t.tier || t.plan || 'Starter'))];

    // Group templates
    let grouped = {};

    if (groupBy === 'tier') {
      // Group by tier (Pro, Premium, Starter)
      grouped = filtered.reduce((acc, template) => {
        const tier = template.tier || template.plan || 'Starter';
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(template);
        return acc;
      }, {});
    } else if (groupBy === 'category') {
      // Group by business category
      grouped = filtered.reduce((acc, template) => {
        const category = template.category || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(template);
        return acc;
      }, {});
    } else {
      // Show all in one group
      grouped = { 'All Templates': filtered };
    }

    return { groupedTemplates: grouped, categories: cats, tiers: tiersSet };
  }, [templates, groupBy, filterTier, searchQuery]);

  // Get group order based on groupBy type
  const getGroupOrder = () => {
    if (groupBy === 'tier') {
      return ['Pro', 'Premium', 'Starter'];
    } else if (groupBy === 'category') {
      return Object.keys(groupedTemplates).sort();
    } else {
      return ['All Templates'];
    }
  };

  const groupOrder = getGroupOrder();
  const totalTemplates = templates.length;
  const filteredCount = Object.values(groupedTemplates).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="template-grid-container">
      {/* Controls Section */}
      <div className="template-controls">
        {/* Search Bar */}
        <div className="template-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Group By Selector */}
        <div className="template-group-selector">
          <label>Group by:</label>
          <div className="btn-group">
            <button
              className={`btn-group-item ${groupBy === 'category' ? 'active' : ''}`}
              onClick={() => setGroupBy('category')}
              aria-label="Group templates by category"
              aria-pressed={groupBy === 'category'}
            >
              <span aria-hidden="true">📁</span> Category
            </button>
            <button
              className={`btn-group-item ${groupBy === 'tier' ? 'active' : ''}`}
              onClick={() => setGroupBy('tier')}
              aria-label="Group templates by plan tier"
              aria-pressed={groupBy === 'tier'}
            >
              <span aria-hidden="true">⭐</span> Plan
            </button>
            <button
              className={`btn-group-item ${groupBy === 'all' ? 'active' : ''}`}
              onClick={() => setGroupBy('all')}
              aria-label="Show all templates without grouping"
              aria-pressed={groupBy === 'all'}
            >
              <span aria-hidden="true">📋</span> All
            </button>
          </div>
        </div>

        {/* Tier Filter */}
        <div className="template-tier-filter">
          <label>Filter by plan:</label>
          <div className="btn-group">
            <button
              className={`btn-group-item ${filterTier === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTier('all')}
              aria-label="Show all plan tiers"
              aria-pressed={filterTier === 'all'}
            >
              All
            </button>
            <button
              className={`btn-group-item tier-pro ${filterTier === 'Pro' ? 'active' : ''}`}
              onClick={() => setFilterTier('Pro')}
              aria-label="Filter to Pro plan templates"
              aria-pressed={filterTier === 'Pro'}
            >
              Pro
            </button>
            <button
              className={`btn-group-item tier-premium ${filterTier === 'Premium' ? 'active' : ''}`}
              onClick={() => setFilterTier('Premium')}
              aria-label="Filter to Premium plan templates"
              aria-pressed={filterTier === 'Premium'}
            >
              Premium
            </button>
            <button
              className={`btn-group-item tier-starter ${filterTier === 'Starter' ? 'active' : ''}`}
              onClick={() => setFilterTier('Starter')}
              aria-label="Filter to Starter plan templates"
              aria-pressed={filterTier === 'Starter'}
            >
              Starter
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="template-count">
          Showing {filteredCount} of {totalTemplates} templates
        </div>
      </div>

      {/* Templates Display */}
      {filteredCount === 0 ? (
        <div className="no-results">
          <span className="no-results-icon">🔍</span>
          <h3>No templates found</h3>
          <p>Try adjusting your search or filters</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSearchQuery('');
              setFilterTier('all');
            }}
            aria-label="Clear all search and filter settings"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        groupOrder.map(groupName => {
          const groupTemplates = groupedTemplates[groupName] || [];
          if (groupTemplates.length === 0) return null;

          // Get icon for category
          const getCategoryIcon = (category) => {
            const icons = {
              'Food & Dining': '🍽️',
              'Beauty & Wellness': '💇',
              'Fitness & Health': '💪',
              'Professional Services': '💼',
              'Home Services': '🏠',
              'Pet Services': '🐾',
              'Technology': '💻',
              'Retail': '🛍️',
              'Automotive': '🚗',
              'Healthcare': '🏥',
              'Legal': '⚖️',
              'Real Estate': '🏘️',
              'Basic': '🌐',
              'Other': '📄'
            };
            return icons[category] || '📄';
          };

          const groupIcon = groupBy === 'category' ? getCategoryIcon(groupName) : '';

          return (
            <div key={groupName} className="template-tier-section">
              <div className="tier-header">
                <h3>
                  {groupIcon && <span className="group-icon">{groupIcon}</span>}
                  {groupName}
                </h3>
                <span className="tier-badge">{groupTemplates.length}</span>
              </div>

              <div className="template-cards">
                {groupTemplates.map(template => {
                  const tier = template.tier || template.plan || 'Starter';
                  const category = template.category || 'Other';

                  return (
                    <div
                      key={template.id || template.template}
                      data-template={template.id || template.template}
                      className={`template-card ${selectedTemplate === (template.id || template.template) ? 'selected' : ''}`}
                      onClick={() => onSelect(template)}
                    >
                      {/* Template Preview Image */}
                      <div className="template-preview">
                        {template.preview || template.heroImage || template.hero?.image ? (
                          <OptimizedImage
                            src={template.preview || template.heroImage || template.hero?.image}
                            alt={`${template.name || template.businessName} template preview`}
                            width={400}
                            height={225}
                            aspectRatio="16/9"
                            priority={false}
                            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="preview-placeholder">
                            <span aria-hidden="true">{template.icon || getCategoryIcon(category)}</span>
                          </div>
                        )}

                        {/* Tier Badge on Image */}
                        <div className={`template-tier-badge tier-${tier.toLowerCase()}`}>
                          {tier}
                        </div>
                      </div>

                      {/* Template Info */}
                      <div className="template-info">
                        <h4>{template.name || template.businessName}</h4>
                        <p className="template-description">
                          {template.description || template.brand?.tagline || `${template.type || 'Business'} template`}
                        </p>

                        {/* Category Badge (when not grouping by category) */}
                        {groupBy !== 'category' && (
                          <div className="template-meta">
                            <span className="category-badge">
                              {getCategoryIcon(category)} {category}
                            </span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="template-actions">
                          <button
                            className="btn-preview"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTemplate(template);
                            }}
                            aria-label={`Preview ${template.name || template.businessName} template`}
                          >
                            <span aria-hidden="true">👁️</span> Preview
                          </button>
                          <button
                            className="btn-select"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(template);
                            }}
                            aria-label={`Use ${template.name || template.businessName} template`}
                          >
                            Use Template →
                          </button>
                        </div>
                      </div>

                      {/* Selected Indicator */}
                      {selectedTemplate === (template.id || template.template) && (
                        <div className="selected-indicator">
                          <span>✓</span> Selected
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

export default TemplateGrid;
