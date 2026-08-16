import { useMemo } from 'react';
import { renderPageToHtml } from '../../../utils/sectionHtmlBridge';
import './TemplateEditor.css';

const DEVICE_STYLES = {
  desktop: { width: '100%', maxWidth: 'none', minHeight: '600px' },
  tablet: { width: '768px', maxWidth: '100%', minHeight: '800px' },
  mobile: { width: '375px', maxWidth: '100%', minHeight: '800px' },
};

export default function TemplatePreview({ template, selectedSectionId, deviceMode }) {
  const previewHtml = useMemo(() => {
    if (!template || !template.sections) return '';
    return renderPageToHtml({
      sections: template.sections,
      metadata: template.metadata,
      brand: template.metadata?._brand || {},
    });
  }, [template]);

  const deviceStyle = DEVICE_STYLES[deviceMode] || DEVICE_STYLES.desktop;

  return (
    <div className="editor-preview-frame-wrapper" data-testid="template-preview">
      <div 
        className="editor-preview-frame-container"
        style={{
          width: deviceStyle.width,
          maxWidth: deviceStyle.maxWidth,
          minHeight: deviceStyle.minHeight,
        }}
      >
        <iframe
          className="editor-preview-iframe"
          srcDoc={previewHtml}
          sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
          title="Template Preview"
        />
      </div>
      
      {selectedSectionId && (
        <div className="editor-preview-hint">
          Editing: Section <code>{selectedSectionId}</code>
        </div>
      )}
    </div>
  );
}