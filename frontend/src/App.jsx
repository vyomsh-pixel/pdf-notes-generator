import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';

const LegalModal = lazy(() => import('./LegalModal.jsx'));

const STORAGE_KEYS = {
  TOKEN: 'pdfnotes_auth_token',
  USER: 'pdfnotes_auth_user',
  CONSENT: 'pdfnotes_consent_v2',
  LOCAL_HISTORY: 'pdfnotes_local_history_v2',
  API_KEY: 'pdfnotes_openrouter_key',
};

const SAMPLE_STUDY_TEXT = `Chapter 4: Distributed Consensus & Fault-Tolerant State Machines

Distributed consensus is defined as the fundamental coordination protocol by which a cluster of independent nodes agrees on a single data value or deterministic sequence of state machine transitions despite partial network partitions and node failures.

Raft Consensus Algorithm: A leader-based crash-fault-tolerant consensus protocol that decomposes state machine replication into three distinct subproblems: Leader Election, Log Replication, and Safety.
Linearizability: A strong consistency model guaranteeing that every operation appears to execute atomically at a single point in time between its invocation and completion.
Split-Brain Hazard: A failure condition in which two isolated sub-networks simultaneously elect separate leaders, risking divergent log commits unless prevented by strict quorum intersection.
Quorum Intersection: The mathematical invariant that any two majority subsets of a cluster of N nodes must share at least one overlapping member containing the latest committed log entry.
Log Compaction & Snapshotting: The periodic replacement of committed log prefixes with a serialized point-in-time state machine image to bound disk storage and accelerate node recovery.

In Raft, time is divided into arbitrary-length terms numbered with consecutive integers. Each term begins with an election in which one or more candidates attempt to gather votes from a strict majority of cluster servers. Once a leader is elected, it manages all client write requests by appending entries to its local Write-Ahead Log (WAL) and replicating them in parallel via AppendEntries RPCs.`;

function renderStudyMarkdown(markdownText) {
  if (!markdownText) return null;
  const lines = markdownText.split('\n');
  const elements = [];
  let listItems = [];
  let listKey = 0;

  const formatInline = (text) => {
    const parts = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIdx = 0;
    let match;
    let idx = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={`b-${idx++}`}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={`i-${idx++}`}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(<code key={`c-${idx++}`}>{token.slice(1, -1)}</code>);
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }
    return parts;
  };

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="study-bullet-list">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h1-${index}`} className="study-doc-h1">
          {formatInline(line.slice(2))}
        </h2>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h2-${index}`} className="study-doc-h2">
          {formatInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h3-${index}`} className="study-doc-h3">
          {formatInline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      listItems.push(
        <li key={`li-${index}`} className="study-bullet-item">
          {formatInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s+/.test(line)) {
      flushList();
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      elements.push(
        <div key={`q-${index}`} className="study-question-card">
          <span className="study-question-num">Q{numMatch[1]}</span>
          <div className="study-question-body">{formatInline(numMatch[2])}</div>
        </div>
      );
    } else if (line === '---') {
      flushList();
      elements.push(<hr key={`hr-${index}`} className="study-divider" />);
    } else {
      flushList();
      elements.push(
        <p key={`p-${index}`} className="study-paragraph">
          {formatInline(line)}
        </p>
      );
    }
  });

  flushList();
  return elements;
}

function ScholarlyLoadingScreen({ subtitle = 'Calibrating neural page scanner & indexing scholarly folio...' }) {
  return (
    <div className="scholarly-loader-overlay" role="status" aria-live="polite">
      <div className="scholarly-loader-card">
        <div className="scholarly-svg-stage" aria-hidden="true">
          <svg
            viewBox="0 0 220 140"
            className="scholarly-scanner-svg"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Editorial Folio */}
            <rect
              x="28"
              y="14"
              width="112"
              height="112"
              rx="8"
              fill="#111827"
              stroke="#4F46E5"
              strokeWidth="2"
            />
            {/* Document Lines */}
            <line x1="44" y1="34" x2="94" y2="34" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" />
            <line x1="44" y1="50" x2="122" y2="50" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="44" y1="64" x2="116" y2="64" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="44" y1="78" x2="124" y2="78" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="44" y1="92" x2="104" y2="92" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="44" y1="106" x2="88" y2="106" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />

            {/* Hardware-accelerated Laser Scan Beam */}
            <g className="svg-scan-beam">
              <line x1="22" y1="40" x2="146" y2="40" stroke="#818CF8" strokeWidth="2.5" />
              <rect x="28" y="40" width="112" height="14" fill="url(#scanGlow)" opacity="0.35" />
            </g>

            {/* Ink Crystallization Nodes */}
            <path
              d="M140 52 C158 52, 160 38, 176 38"
              stroke="#6366F1"
              strokeWidth="1.75"
              strokeDasharray="3 3"
            />
            <path
              d="M140 70 C158 70, 160 70, 176 70"
              stroke="#8B5CF6"
              strokeWidth="1.75"
              strokeDasharray="3 3"
            />
            <path
              d="M140 88 C158 88, 160 102, 176 102"
              stroke="#6366F1"
              strokeWidth="1.75"
              strokeDasharray="3 3"
            />

            <circle className="svg-crystal-node node-1" cx="184" cy="38" r="8" fill="#4F46E5" />
            <circle className="svg-crystal-node node-2" cx="184" cy="70" r="8" fill="#7C3AED" />
            <circle className="svg-crystal-node node-3" cx="184" cy="102" r="8" fill="#4F46E5" />

            <defs>
              <linearGradient id="scanGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <span className="eyebrow-badge">Scholarly Neural Page-Scan</span>
        <h2 className="loader-title">Initializing Revision Workbench</h2>
        <p className="loader-subtitle">{subtitle}</p>

        <div className="loader-progress-track" aria-hidden="true">
          <div className="loader-progress-fill" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // ── AUTH & CONSENT GATE STATE ────────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.TOKEN) || '');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [consentState, setConsentState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONSENT) || '{}');
      return {
        dataProcessing: Boolean(saved.dataProcessing),
        aiDisclaimer: Boolean(saved.aiDisclaimer),
      };
    } catch {
      return { dataProcessing: false, aiDisclaimer: false };
    }
  });

  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [isTransitionLoading, setIsTransitionLoading] = useState(false);

  // ── LEGAL MODAL STATE (/privacy & /terms) ────────────────────────────────
  const [legalDoc, setLegalDoc] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path === '/privacy' || hash === '#privacy') return 'privacy';
    if (path === '/terms' || hash === '#terms') return 'terms';
    return null;
  });

  // ── WORKSPACE INPUT STATE ────────────────────────────────────────────────
  const [inputSource, setInputSource] = useState('pdf'); // 'pdf' | 'text'
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBase64, setPdfBase64] = useState('');
  const [rawText, setRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [mode, setMode] = useState('Notes'); // 'Notes' | 'Generate Questions'
  const [marks, setMarks] = useState(5);
  const [numQuestions, setNumQuestions] = useState(5);
  const [usePageRange, setUsePageRange] = useState(false);
  const [pageStart, setPageStart] = useState(1);
  const [pageEnd, setPageEnd] = useState(5);

  const [manualApiKey, setManualApiKey] = useState(
    () => sessionStorage.getItem(STORAGE_KEYS.API_KEY) || ''
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [workspaceConsent, setWorkspaceConsent] = useState(true);

  // ── GENERATION & HISTORY STATE ───────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [viewRawMarkdown, setViewRawMarkdown] = useState(false);
  const [copiedFlag, setCopiedFlag] = useState(false);
  const [historyItems, setHistoryItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCAL_HISTORY) || '[]');
    } catch {
      return [];
    }
  });

  const fileInputRef = useRef(null);
  const bothConsentsChecked = consentState.dataProcessing && consentState.aiDisclaimer;
  const isAuthenticated = Boolean(user && bothConsentsChecked);

  // Verify token on startup and load history
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && data.user) {
          setUser(data.user);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
        }
      })
      .catch(() => {
        // Keep cached user if backend is temporarily unreachable
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const fetchHistory = async (activeToken = token) => {
    try {
      const headers = {};
      if (activeToken && !activeToken.startsWith('guest-')) {
        headers.Authorization = `Bearer ${activeToken}`;
      }
      const res = await fetch('/api/history', { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.history) ? data.history : [];
        setHistoryItems(list);
        localStorage.setItem(STORAGE_KEYS.LOCAL_HISTORY, JSON.stringify(list.slice(0, 25)));
      }
    } catch {
      // Fallback to localStorage history silently
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isTransitionLoading) {
      fetchHistory(token);
    }
  }, [isAuthenticated, isTransitionLoading, token]);

  const triggerLoadingTransition = (nextUser, nextToken) => {
    const newConsent = { dataProcessing: true, aiDisclaimer: true };
    setConsentState(newConsent);
    localStorage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(newConsent));
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(nextUser));
    if (nextToken) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, nextToken);
      setToken(nextToken);
    }
    setUser(nextUser);
    setIsTransitionLoading(true);
    setTimeout(() => {
      setIsTransitionLoading(false);
    }, 1050);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!bothConsentsChecked) {
      setAuthError(
        'Please accept both the PDF Data Processing Consent and the Educational AI Disclaimer to continue.'
      );
      return;
    }
    if (!username.trim() || !password) {
      setAuthError('Please enter both a username and password.');
      return;
    }

    setAuthSubmitting(true);
    const endpoint = authTab === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload =
      authTab === 'register'
        ? {
            username: username.trim(),
            password,
            display_name: displayName.trim() || username.trim(),
            consent_accepted: true,
          }
        : {
            username: username.trim(),
            password,
          };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.detail || 'Authentication failed. Check your credentials.');
        setAuthSubmitting(false);
        return;
      }
      setAuthSubmitting(false);
      triggerLoadingTransition(data.user, data.token);
    } catch {
      setAuthSubmitting(false);
      // Graceful offline fallback if backend server isn't reachable yet
      const fallbackUser = {
        id: 0,
        username: username.trim().toLowerCase(),
        display_name: displayName.trim() || username.trim(),
        consent_accepted: true,
        guest: true,
      };
      triggerLoadingTransition(fallbackUser, 'guest-local-session');
    }
  };

  const handleGuestDemoLogin = () => {
    setAuthError('');
    if (!bothConsentsChecked) {
      setAuthError(
        'Please check both mandatory Consent & Educational AI Disclaimer boxes before entering the workspace.'
      );
      return;
    }
    const guestUser = {
      id: 0,
      username: 'scholar_guest',
      display_name: 'Visiting Scholar (Guest)',
      consent_accepted: true,
      guest: true,
    };
    triggerLoadingTransition(guestUser, 'guest-local-session');
  };

  const handleSignOut = () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setToken('');
    setUser(null);
    setPassword('');
    setStatusMessage('');
    setErrorBanner('');
  };

  const handleOpenLegal = (docType) => {
    setLegalDoc(docType);
    window.history.replaceState(null, '', `#${docType}`);
  };

  const handleCloseLegal = () => {
    setLegalDoc(null);
    if (window.location.hash === '#privacy' || window.location.hash === '#terms') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // ── FILE UPLOAD & BASE64ENCODING ─────────────────────────────────────────
  const processSelectedPdf = (file) => {
    setErrorBanner('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorBanner('Please select a valid PDF document (.pdf).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorBanner('PDF file exceeds the 15 MB maximum size limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = String(reader.result || '');
      const base64Clean = resultStr.includes(',') ? resultStr.split(',', 2)[1] : resultStr;
      setPdfFile(file);
      setPdfBase64(base64Clean);
      setInputSource('pdf');
      setStatusMessage(`Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB) ready for analysis.`);
    };
    reader.onerror = () => {
      setErrorBanner('Failed to read the selected PDF file from disk.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      processSelectedPdf(droppedFile);
    }
  };

  const handleLoadSample = () => {
    setInputSource('text');
    setRawText(SAMPLE_STUDY_TEXT);
    setPdfFile(null);
    setPdfBase64('');
    setErrorBanner('');
    setStatusMessage('Loaded sample Distributed Systems lecture excerpt.');
  };

  // ── GENERATE NOTES OR EXAM QUESTIONS ─────────────────────────────────────
  const handleGenerate = async (e) => {
    e.preventDefault();
    setErrorBanner('');
    setStatusMessage('');

    if (!workspaceConsent) {
      setErrorBanner('You must confirm the data processing & AI accuracy disclaimer before generating.');
      return;
    }

    if (inputSource === 'pdf' && !pdfBase64) {
      setErrorBanner('Please upload a PDF file first, or switch to "Paste Study Text" mode.');
      return;
    }
    if (inputSource === 'text' && !rawText.trim()) {
      setErrorBanner('Please paste or load study text to analyze.');
      return;
    }

    let startPageVal = null;
    let endPageVal = null;
    if (usePageRange) {
      startPageVal = Number(pageStart);
      endPageVal = Number(pageEnd);
      if (
        !Number.isInteger(startPageVal) ||
        !Number.isInteger(endPageVal) ||
        startPageVal < 1 ||
        endPageVal < startPageVal
      ) {
        setErrorBanner('Invalid page range: Start Page must be >= 1 and End Page must be >= Start Page.');
        return;
      }
    }

    setIsGenerating(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token && !token.startsWith('guest-')) {
        headers.Authorization = `Bearer ${token}`;
      }

      const payload = {
        filename:
          inputSource === 'pdf' && pdfFile ? pdfFile.name : 'lecture_notes_excerpt.pdf',
        mode,
        marks: mode === 'Generate Questions' ? Number(marks) : undefined,
        num_questions: mode === 'Generate Questions' ? Number(numQuestions) : undefined,
        page_start: usePageRange ? startPageVal : undefined,
        page_end: usePageRange ? endPageVal : undefined,
        api_key: manualApiKey.trim() || undefined,
        consent_accepted: true,
      };

      if (inputSource === 'pdf') {
        payload.pdf_base64 = pdfBase64;
      } else {
        payload.text = rawText;
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorBanner(data.detail || 'Generation failed. Please check your PDF or API key.');
        setIsGenerating(false);
        return;
      }

      setCurrentResult(data);
      setViewRawMarkdown(false);
      setStatusMessage(
        `Synthesized ${data.mode === 'Notes' ? 'structured study notes' : `${data.num_questions} exam questions`} across ${data.pages_processed} page(s) (${data.chunks} section${data.chunks > 1 ? 's' : ''}).`
      );

      setHistoryItems((prev) => {
        const filtered = prev.filter((item) => item.id !== data.id);
        const updated = [data, ...filtered];
        localStorage.setItem(STORAGE_KEYS.LOCAL_HISTORY, JSON.stringify(updated.slice(0, 25)));
        return updated;
      });
    } catch {
      setErrorBanner('Network error communicating with the PDF processing backend.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── PERSISTENT DOWNLOADS & CLIPBOARD ─────────────────────────────────────
  const handleDownloadOutput = (extension) => {
    if (!currentResult || !currentResult.output) return;
    const stem =
      currentResult.file_stem ||
      (currentResult.filename || 'study_output').replace(/\.pdf$/i, '');
    const modeSlug = (currentResult.mode || 'notes').toLowerCase().replace(/\s+/g, '_');
    const filename = `${stem}_${modeSlug}.${extension}`;
    const mime = extension === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';

    const blob = new Blob([currentResult.output], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage(`Downloaded "${filename}" — your output remains open on screen.`);
  };

  const handleCopyOutput = async () => {
    if (!currentResult?.output) return;
    try {
      await navigator.clipboard.writeText(currentResult.output);
      setCopiedFlag(true);
      setTimeout(() => setCopiedFlag(false), 2000);
    } catch {
      setStatusMessage('Clipboard permission denied; use Download .md or .txt instead.');
    }
  };

  const handleDeleteHistoryItem = async (itemId, e) => {
    e.stopPropagation();
    setHistoryItems((prev) => {
      const next = prev.filter((item) => item.id !== itemId);
      localStorage.setItem(STORAGE_KEYS.LOCAL_HISTORY, JSON.stringify(next));
      return next;
    });
    if (currentResult?.id === itemId) {
      setCurrentResult(null);
    }
    try {
      const headers = {};
      if (token && !token.startsWith('guest-')) {
        headers.Authorization = `Bearer ${token}`;
      }
      await fetch(`/api/history/${itemId}`, { method: 'DELETE', headers });
    } catch {
      // Ignore network error after local optimistic removal
    }
  };

  // ── DATA RIGHTS: EXPORT JSON & DELETE ACCOUNT ────────────────────────────
  const handleExportAccountData = async () => {
    setErrorBanner('');
    try {
      if (token && !token.startsWith('guest-')) {
        const res = await fetch('/api/account/export', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const payload = await res.json();
          const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pdfnotes_data_export_${user?.username || 'user'}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setStatusMessage('Exported complete account & session history archive (JSON).');
          return;
        }
      }
      // Fallback export for Guest/Local session
      const guestExport = {
        user,
        consent: consentState,
        history: historyItems,
        exported_at: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(guestExport, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pdfnotes_guest_session_export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('Exported local session history archive (JSON).');
    } catch {
      setErrorBanner('Unable to export account data right now.');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Permanently delete your account and erase all saved study notes and question history? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      if (token && !token.startsWith('guest-')) {
        await fetch('/api/account', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Proceed with local erasure as well
    }

    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.CONSENT);
    localStorage.removeItem(STORAGE_KEYS.LOCAL_HISTORY);
    sessionStorage.removeItem(STORAGE_KEYS.API_KEY);

    setHistoryItems([]);
    setCurrentResult(null);
    setToken('');
    setUser(null);
    setConsentState({ dataProcessing: false, aiDisclaimer: false });
  };

  // ── RENDER 1: TRANSITION LOADING SCREEN ──────────────────────────────────
  if (isTransitionLoading) {
    return (
      <ScholarlyLoadingScreen subtitle="Verifying academic consent & preparing parallel PDF chunking engine..." />
    );
  }

  // ── RENDER 2: LOGIN / SIGNUP & CONSENT GATE ──────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="auth-gate-shell">
        <div className="auth-gate-container">
          <header className="auth-hero">
            <div className="brand-badge">
              <span className="brand-icon" aria-hidden="true">📄</span>
              <span>Scholarly AI Revision Workbench</span>
            </div>
            <h1>PDF Notes Generator</h1>
            <p className="auth-subtitle">
              Transform dense academic PDFs and lecture manuscripts into structured study notes and
              grounded exam questions in seconds.
            </p>
          </header>

          <div className="auth-card">
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'login'}
                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('login');
                  setAuthError('');
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authTab === 'register'}
                className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('register');
                  setAuthError('');
                }}
              >
                Create Scholar Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-form">
              <div className="form-field">
                <label htmlFor="auth-username">Academic Username</label>
                <input
                  id="auth-username"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. ada_lovelace"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {authTab === 'register' && (
                <div className="form-field">
                  <label htmlFor="auth-display-name">Display Name (Optional)</label>
                  <input
                    id="auth-display-name"
                    type="text"
                    placeholder="e.g. Dr. Ada Lovelace"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}

              <div className="form-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={authTab === 'register' ? 'new-password' : 'current-password'}
                  placeholder={authTab === 'register' ? 'Minimum 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="consent-box" role="group" aria-labelledby="consent-heading">
                <div id="consent-heading" className="consent-box-title">
                  Mandatory Data Processing &amp; Educational AI Disclosures
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={consentState.dataProcessing}
                    onChange={(e) =>
                      setConsentState((prev) => ({ ...prev, dataProcessing: e.target.checked }))
                    }
                  />
                  <span>
                    I consent to PDF Notes Generator extracting text from my uploaded PDF documents
                    and processing it via OpenRouter AI models.
                  </span>
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={consentState.aiDisclaimer}
                    onChange={(e) =>
                      setConsentState((prev) => ({ ...prev, aiDisclaimer: e.target.checked }))
                    }
                  />
                  <span>
                    I understand that AI-generated study notes and exam questions are educational
                    aids and should be verified against primary course materials.
                  </span>
                </label>
              </div>

              {authError && (
                <div className="alert-error" role="alert">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary btn-full"
                disabled={authSubmitting}
              >
                {authSubmitting
                  ? 'Authenticating...'
                  : authTab === 'register'
                  ? 'Register & Launch Workspace'
                  : 'Sign In & Launch Workspace'}
              </button>

              <div className="auth-divider">
                <span>or evaluate immediately</span>
              </div>

              <button
                type="button"
                className="btn-secondary btn-full"
                onClick={handleGuestDemoLogin}
              >
                Continue as Visiting Scholar (Guest Session)
              </button>
            </form>

            <footer className="auth-legal-links">
              <button
                type="button"
                className="link-btn"
                onClick={() => handleOpenLegal('privacy')}
              >
                Privacy Policy (/privacy)
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => handleOpenLegal('terms')}
              >
                Terms of Service (/terms)
              </button>
            </footer>
          </div>
        </div>

        {legalDoc && (
          <Suspense fallback={null}>
            <LegalModal
              activeDoc={legalDoc}
              onSwitchDoc={(doc) => handleOpenLegal(doc)}
              onClose={handleCloseLegal}
            />
          </Suspense>
        )}
      </div>
    );
  }

  // ── RENDER 3: MAIN SCHOLARLY WORKSPACE ───────────────────────────────────
  return (
    <div className="workspace-shell">
      {/* Top Navigation & Data Governance Bar */}
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-logo" aria-hidden="true">📄</span>
          <div>
            <div className="topbar-title">PDF Notes Generator</div>
            <div className="topbar-caption">
              Scholarly Revision Studio · Powered by OpenRouter &amp; Nemotron
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="user-pill" title={`Signed in as ${user?.username}`}>
            <span className="status-dot" aria-hidden="true" />
            {user?.display_name || user?.username}
          </span>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleExportAccountData}
            title="Download all your account metadata and saved study history as JSON"
          >
            Export My Data (JSON)
          </button>

          <button
            type="button"
            className="btn-danger-ghost btn-sm"
            onClick={handleDeleteAccount}
            title="Permanently delete your account and all saved history"
          >
            Delete Account &amp; Data
          </button>

          <button type="button" className="btn-secondary btn-sm" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        {/* ── SIDEBAR: API KEY + CLICKABLE SESSION HISTORY ── */}
        <aside className="sidebar" aria-label="Study Assistant & Session History">
          <div className="sidebar-section">
            <h2 className="sidebar-heading">🚀 Study Assistant</h2>
            <p className="sidebar-subtext">Your AI-powered revision weapon.</p>

            <div className="api-key-box">
              <label htmlFor="openrouter-key-input" className="sidebar-label">
                OpenRouter API Key (Optional Override)
              </label>
              <div className="api-key-input-row">
                <input
                  id="openrouter-key-input"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-or-v1-... (uses server/fallback if blank)"
                  value={manualApiKey}
                  onChange={(e) => {
                    setManualApiKey(e.target.value);
                    sessionStorage.setItem(STORAGE_KEYS.API_KEY, e.target.value);
                  }}
                />
                <button
                  type="button"
                  className="btn-icon-sm"
                  onClick={() => setShowApiKey((v) => !v)}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <span className="sidebar-hint">
                Model: <code>nemotron-3-nano-omni</code> · Automatic offline extraction fallback if no
                key is set.
              </span>
            </div>
          </div>

          <div className="sidebar-section history-section">
            <div className="history-header-row">
              <h3 className="sidebar-heading">📋 Session History</h3>
              <span className="history-count-badge">{historyItems.length}</span>
            </div>
            <p className="sidebar-subtext">
              Click any past generation to restore its full notes or questions immediately.
            </p>

            {historyItems.length === 0 ? (
              <div className="history-empty">
                No study sessions recorded yet. Upload a PDF or load the sample lecture to begin.
              </div>
            ) : (
              <ul className="history-list" aria-label="Saved study generations">
                {historyItems.map((item) => {
                  const isSelected = currentResult?.id === item.id;
                  const timeLabel = item.created_at
                    ? new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Saved';
                  return (
                    <li key={item.id} className="history-list-item">
                      <button
                        type="button"
                        className={`history-card-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentResult(item);
                          setViewRawMarkdown(false);
                          setErrorBanner('');
                          setStatusMessage(`Restored "${item.filename}" (${item.mode}) from history.`);
                        }}
                      >
                        <div className="history-card-top">
                          <span className="history-filename">{item.filename}</span>
                          <span
                            className={`mode-pill ${
                              item.mode === 'Notes' ? 'pill-notes' : 'pill-questions'
                            }`}
                          >
                            {item.mode === 'Notes' ? 'Notes' : `${item.marks || 5}M Qs`}
                          </span>
                        </div>
                        <div className="history-card-meta">
                          <span>{timeLabel}</span>
                          <span>·</span>
                          <span>{item.pages_processed || 1} pg</span>
                          <span>·</span>
                          <span>{item.chunks || 1} sec</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="history-delete-btn"
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        aria-label={`Delete ${item.filename} from history`}
                        title="Delete from history"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ── MAIN WORKBENCH PANEL ── */}
        <main className="main-panel">
          <section className="control-card" aria-labelledby="upload-section-title">
            <div className="card-header-row">
              <div>
                <h1 id="upload-section-title" className="panel-title">
                  Document Ingestion &amp; Synthesis Parameters
                </h1>
                <p className="panel-subtitle">
                  Upload a course PDF (up to 15 MB) or paste raw lecture text, choose your study
                  mode, and generate structured revision material.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleLoadSample}
              >
                ✨ Load Sample Lecture
              </button>
            </div>

            {/* Source Selector Tabs */}
            <div className="source-toggle-bar" role="tablist" aria-label="Document input method">
              <button
                type="button"
                role="tab"
                aria-selected={inputSource === 'pdf'}
                className={`source-tab ${inputSource === 'pdf' ? 'active' : ''}`}
                onClick={() => setInputSource('pdf')}
              >
                📄 Upload PDF File
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputSource === 'text'}
                className={`source-tab ${inputSource === 'text' ? 'active' : ''}`}
                onClick={() => setInputSource('text')}
              >
                📝 Paste Study Text
              </button>
            </div>

            <form onSubmit={handleGenerate} className="generation-form">
              {inputSource === 'pdf' ? (
                <div
                  className={`pdf-dropzone ${isDragging ? 'dragging' : ''} ${
                    pdfFile ? 'has-file' : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Upload PDF document by clicking or dragging and dropping"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => processSelectedPdf(e.target.files?.[0])}
                    style={{ display: 'none' }}
                  />
                  {pdfFile ? (
                    <div className="dropzone-loaded">
                      <span className="dropzone-icon">📘</span>
                      <div>
                        <div className="dropzone-title">{pdfFile.name}</div>
                        <div className="dropzone-caption">
                          {(pdfFile.size / 1024).toFixed(1)} KB · Click or drop another PDF to replace
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="dropzone-empty">
                      <span className="dropzone-icon">📥</span>
                      <div className="dropzone-title">
                        Drop your academic PDF here, or <span className="underline-accent">browse files</span>
                      </div>
                      <div className="dropzone-caption">
                        Supports text-based PDFs up to 15 MB · Automatic 12,000-character semantic
                        chunking
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-field">
                  <label htmlFor="raw-study-textarea">Paste Lecture Notes or Textbook Excerpt</label>
                  <textarea
                    id="raw-study-textarea"
                    rows={6}
                    placeholder="Paste technical definitions, syllabus chapters, or research paper sections here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                </div>
              )}

              {/* Mode + Question Parameters + Optional Page Range */}
              <div className="parameters-grid">
                <div className="form-field">
                  <label htmlFor="mode-select">Select Synthesis Mode</label>
                  <select
                    id="mode-select"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option value="Notes">Notes (Key Points &amp; Concept Definitions)</option>
                    <option value="Generate Questions">
                      Generate Questions (Exam-Oriented Practice)
                    </option>
                  </select>
                </div>

                {mode === 'Generate Questions' && (
                  <>
                    <div className="form-field">
                      <label htmlFor="marks-select">Marks per Question</label>
                      <select
                        id="marks-select"
                        value={marks}
                        onChange={(e) => setMarks(Number(e.target.value))}
                      >
                        <option value={3}>3 Marks (Concise Definition &amp; Properties)</option>
                        <option value={5}>5 Marks (Principles &amp; Practical Examples)</option>
                        <option value={10}>10 Marks (Comprehensive Architecture &amp; Analysis)</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="num-questions-input">Number of Questions (1–20)</label>
                      <input
                        id="num-questions-input"
                        type="number"
                        min={1}
                        max={20}
                        value={numQuestions}
                        onChange={(e) =>
                          setNumQuestions(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Optional Page Range Filter */}
              <div className="page-range-bar">
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={usePageRange}
                    onChange={(e) => setUsePageRange(e.target.checked)}
                  />
                  <span>Filter specific PDF page range</span>
                </label>

                {usePageRange && (
                  <div className="page-range-inputs">
                    <label>
                      <span>Start Page</span>
                      <input
                        type="number"
                        min={1}
                        value={pageStart}
                        onChange={(e) => setPageStart(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>End Page</span>
                      <input
                        type="number"
                        min={1}
                        value={pageEnd}
                        onChange={(e) => setPageEnd(e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Explicit Per-Run Consent Confirmation */}
              <div className="workspace-consent-strip">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={workspaceConsent}
                    onChange={(e) => setWorkspaceConsent(e.target.checked)}
                  />
                  <span>
                    I consent to sending extracted document text for AI synthesis and acknowledge that
                    generated study material should be verified against primary course sources.
                  </span>
                </label>
              </div>

              {errorBanner && (
                <div className="alert-error" role="alert">
                  ⚠️ {errorBanner}
                </div>
              )}

              {statusMessage && !errorBanner && (
                <div className="alert-info" role="status">
                  ✓ {statusMessage}
                </div>
              )}

              <button
                type="submit"
                className="btn-generate"
                disabled={isGenerating || !workspaceConsent}
              >
                {isGenerating
                  ? '⚡ Scanning Pages & Synthesizing Output...'
                  : mode === 'Notes'
                  ? 'GENERATE STRUCTURED STUDY NOTES'
                  : `GENERATE ${numQuestions} EXAM QUESTIONS (${marks} MARKS EACH)`}
              </button>
            </form>
          </section>

          {/* ── ACTIVE GENERATION SCANNER ANIMATION ── */}
          {isGenerating && (
            <section className="inline-scanner-card" aria-live="polite">
              <div className="inline-scanner-bar" />
              <div className="inline-scanner-content">
                <strong>Processing Document Sections in Parallel...</strong>
                <span>
                  Splitting extracted text into 12,000-character semantic chunks and deduplicating
                  key concepts.
                </span>
              </div>
            </section>
          )}

          {/* ── PERSISTENT OUTPUT VIEWER & NON-DESTRUCTIVE DOWNLOADS ── */}
          {currentResult && !isGenerating && (
            <section className="output-card" aria-labelledby="output-heading">
              <div className="output-header">
                <div>
                  <span className="eyebrow-badge">
                    {currentResult.offline_fallback
                      ? 'Deterministic Local Extraction Engine'
                      : 'OpenRouter Nemotron AI Synthesis'}
                  </span>
                  <h2 id="output-heading" className="output-title">
                    {currentResult.filename} — {currentResult.mode}
                  </h2>
                </div>

                <div className="output-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => setViewRawMarkdown((v) => !v)}
                  >
                    {viewRawMarkdown ? '📖 Formatted View' : '⌨️ Raw Markdown'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={handleCopyOutput}
                  >
                    {copiedFlag ? '✓ Copied!' : '📋 Copy Text'}
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => handleDownloadOutput('md')}
                  >
                    ⬇️ Download .MD
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    onClick={() => handleDownloadOutput('txt')}
                  >
                    ⬇️ Download .TXT
                  </button>
                </div>
              </div>

              {/* Metrics Ribbon (Parity with Streamlit Pages & Sections metrics) */}
              <div className="metrics-ribbon">
                <div className="metric-box">
                  <span className="metric-label">Pages Processed</span>
                  <span className="metric-value">{currentResult.pages_processed || 1}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Sections (Chunks)</span>
                  <span className="metric-value">{currentResult.chunks || 1}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Synthesis Mode</span>
                  <span className="metric-value">
                    {currentResult.mode === 'Generate Questions'
                      ? `${currentResult.num_questions || 5} Qs × ${currentResult.marks || 5}M`
                      : 'Study Notes'}
                  </span>
                </div>
              </div>

              {/* Rendered Study Output */}
              <div className="output-reader">
                {viewRawMarkdown ? (
                  <pre className="raw-markdown-pre">{currentResult.output}</pre>
                ) : (
                  <div className="formatted-study-content">
                    {renderStudyMarkdown(currentResult.output)}
                  </div>
                )}
              </div>

              <div className="output-disclaimer-footer">
                <strong>Educational Disclaimer:</strong>{' '}
                {currentResult.disclaimer ||
                  'AI-generated study material is for educational revision only and may contain inaccuracies. Always verify definitions and facts against your primary source material.'}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Persistent App Footer with Legal Links & Domain Disclaimer */}
      <footer className="app-footer">
        <div className="footer-disclaimer">
          <span>
            <strong>Academic &amp; AI Accuracy Notice:</strong> Generated study notes and practice
            questions are automated revision aids. Verify critical definitions, theorems, and citations
            against official course textbooks.
          </span>
        </div>
        <div className="footer-links">
          <button type="button" className="link-btn" onClick={() => handleOpenLegal('privacy')}>
            Privacy Policy
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" className="link-btn" onClick={() => handleOpenLegal('terms')}>
            Terms of Service
          </button>
        </div>
      </footer>

      {legalDoc && (
        <Suspense fallback={null}>
          <LegalModal
            activeDoc={legalDoc}
            onSwitchDoc={(doc) => handleOpenLegal(doc)}
            onClose={handleCloseLegal}
          />
        </Suspense>
      )}
    </div>
  );
}
