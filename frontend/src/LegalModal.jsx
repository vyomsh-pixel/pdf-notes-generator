import React, { useEffect } from 'react';

export default function LegalModal({ activeDoc = 'privacy', onSwitchDoc, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isPrivacy = activeDoc === 'privacy';

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <span className="eyebrow-badge">Governance &amp; Transparency</span>
            <h2 id="legal-modal-title">
              {isPrivacy ? 'Privacy Policy & Data Handling' : 'Terms of Service & Academic Use'}
            </h2>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close legal document modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-tabs" role="tablist" aria-label="Legal documents">
          <button
            type="button"
            role="tab"
            aria-selected={isPrivacy}
            className={`modal-tab ${isPrivacy ? 'active' : ''}`}
            onClick={() => onSwitchDoc('privacy')}
          >
            Privacy Policy (/privacy)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isPrivacy}
            className={`modal-tab ${!isPrivacy ? 'active' : ''}`}
            onClick={() => onSwitchDoc('terms')}
          >
            Terms of Service (/terms)
          </button>
        </div>

        <div className="modal-body">
          <div className="legal-todo-banner" role="note">
            <strong>TODO(LEGAL): Supply official organization legal copy</strong>
            <p>
              The sections below describe the technical data flow of PDF Notes Generator and provide
              structured placeholders where counsel-reviewed organizational legal copy must be inserted
              prior to commercial deployment.
            </p>
          </div>

          {isPrivacy ? (
            <div className="legal-section-list">
              <section>
                <h3>1. Document Text Extraction &amp; Ephemeral Processing</h3>
                <p>
                  When you upload a PDF document or paste study text, PDF Notes Generator extracts
                  plain text in memory using <code>pdfplumber</code> to split pages into semantic chunks
                  (up to 12,000 characters per section). Raw binary PDF files are processed in memory
                  and are not permanently stored on disk.
                </p>
              </section>
              <section>
                <h3>2. Third-Party AI Model Transmission (OpenRouter)</h3>
                <p>
                  When an OpenRouter API key is configured, extracted text chunks are transmitted over
                  HTTPS to OpenRouter (<code>https://openrouter.ai/api/v1/chat/completions</code>) using
                  the <code>nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free</code> model to synthesize
                  study notes or exam questions. Do not upload confidential, proprietary, or personally
                  identifiable information (PII).
                </p>
              </section>
              <section>
                <h3>3. Session History &amp; Account Data Rights</h3>
                <p>
                  Authenticated accounts store PBKDF2-HMAC-SHA256 password hashes, consent timestamps,
                  and generated study outputs in the application database. You may exercise your right
                  to data portability via <strong>Export My Data (JSON)</strong> (<code>GET /api/account/export</code>)
                  or permanently erase your account and all generated history via{' '}
                  <strong>Delete Account &amp; Data</strong> (<code>DELETE /api/account</code>) at any time
                  from the top navigation bar.
                </p>
              </section>
              <section>
                <h3>4. Organization Privacy Clauses Placeholder</h3>
                <p className="legal-placeholder-copy">
                  [TODO(LEGAL): Supply official organization legal copy — Insert Data Controller
                  identity, DPO contact email, jurisdiction-specific GDPR/CCPA retention schedules,
                  and sub-processor disclosures here.]
                </p>
              </section>
            </div>
          ) : (
            <div className="legal-section-list">
              <section>
                <h3>1. Educational Aid &amp; Academic Integrity Disclaimer</h3>
                <p>
                  PDF Notes Generator is an educational revision workbench designed to summarize course
                  readings and generate practice questions. All AI-generated study notes, definitions,
                  and exam questions are automated study aids that may contain omissions or
                  inaccuracies. Users must verify all facts, formulas, and definitions against primary
                  course syllabi and textbooks.
                </p>
              </section>
              <section>
                <h3>2. Acceptable Document Uploads</h3>
                <p>
                  You confirm that you have the lawful right to upload and process any PDF documents
                  submitted to the workspace, and that uploaded files do not exceed the 15 MB size limit
                  or contain malicious payloads.
                </p>
              </section>
              <section>
                <h3>3. API Key Usage &amp; Rate Limits</h3>
                <p>
                  Users may optionally supply a personal OpenRouter API key in the workspace sidebar.
                  Keys provided in the client are sent only with generation requests and are never
                  logged into persistent history records.
                </p>
              </section>
              <section>
                <h3>4. Organization Terms Clauses Placeholder</h3>
                <p className="legal-placeholder-copy">
                  [TODO(LEGAL): Supply official organization legal copy — Insert governing law,
                  limitation of liability, warranty disclaimers, and institutional licensing terms
                  here.]
                </p>
              </section>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Acknowledge &amp; Return to Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
