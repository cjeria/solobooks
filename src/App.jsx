import { useState, useEffect, useCallback, useRef } from 'react';
import { mockTransactions, CATEGORIES, ACCOUNTS } from './data/transactions';
import './App.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAmount(amount) {
  const abs = Math.abs(amount).toFixed(2);
  const parts = abs.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (amount < 0 ? '-$' : '+$') + parts.join('.');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function mapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function merchantHue(name) {
  return (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
}

function groupByMerchant(transactions) {
  const map = {};
  transactions.forEach((tx) => {
    if (!map[tx.merchant]) {
      map[tx.merchant] = {
        merchant: tx.merchant, ids: [], totalAmount: 0, dates: [],
        ai_category: tx.ai_category, ai_confidence: tx.ai_confidence,
        ai_reasoning: tx.ai_reasoning, transaction_type: tx.transaction_type,
        logo_domain: tx.logo_domain, hero_image: tx.hero_image, location: tx.location,
      };
    }
    map[tx.merchant].ids.push(tx.id);
    map[tx.merchant].totalAmount += tx.amount;
    map[tx.merchant].dates.push(tx.date);
  });
  return Object.values(map).map((g) => ({
    ...g,
    dateRange: g.dates.length === 1
      ? formatDate(g.dates[0])
      : `${formatDate(g.dates[0])} – ${formatDate(g.dates[g.dates.length - 1])}`,
    count: g.ids.length,
  }));
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconCard() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconList() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 1h10v14l-2-1.5L9 15l-2-1.5L5 15l-2-1.5V1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 5h4M6 8h4M6 11h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconPencil() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 13V4a1 1 0 0 1 1-1h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Hero Image ───────────────────────────────────────────────────────────────

function HeroImage({ src, name, className }) {
  const [failed, setFailed] = useState(false);
  const hue = merchantHue(name);
  return failed || !src ? (
    <div
      className={`hero-fallback${className ? ' ' + className : ''}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue},55%,40%), hsl(${(hue+45)%360},65%,58%))` }}
    />
  ) : (
    <img
      className={`hero-img${className ? ' ' + className : ''}`}
      src={src} alt={name}
      onError={() => setFailed(true)}
    />
  );
}

// ─── Merchant Logo ────────────────────────────────────────────────────────────

function MerchantLogo({ domain, name, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const hue = merchantHue(name);
  return failed || !domain ? (
    <div
      className="merchant-logo-fallback"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue},58%,52%)` }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  ) : (
    <img
      className="merchant-logo"
      src={`https://logo.clearbit.com/${domain}?size=96`}
      width={size} height={size} alt={name}
      onError={() => setFailed(true)}
    />
  );
}

// ─── Account Chip ─────────────────────────────────────────────────────────────

function AccountChip({ transactionType }) {
  const isIncome = transactionType === 'income';
  const acct = isIncome ? ACCOUNTS.checking : ACCOUNTS.credit;
  return (
    <span className={`account-chip ${isIncome ? 'checking' : 'credit'}`}>
      {isIncome ? '🏦' : '💳'} {acct.name} ···· {acct.last4}
    </span>
  );
}

// ─── Confidence Badge ────────────────────────────────────────────────────────

function ConfidenceBadge({ level }) {
  const colors = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' };
  return (
    <span className="confidence-badge">
      <span className="confidence-dot" style={{ background: colors[level] }} />
      <span className="confidence-text">{level} confidence</span>
    </span>
  );
}

// ─── Receipt section (on card) ───────────────────────────────────────────────

function ReceiptSection({ hasReceipt }) {
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);
  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFileName(f.name); setUploaded(true); }
  };
  if (hasReceipt) return (
    <div className="receipt-row receipt-imported"><IconReceipt /><span>Receipt auto-imported from email</span></div>
  );
  if (uploaded) return (
    <div className="receipt-row receipt-uploaded"><IconReceipt /><span>{fileName}</span></div>
  );
  return (
    <div className="receipt-row">
      <button className="receipt-upload-btn" onClick={() => inputRef.current?.click()}>
        <IconReceipt /> Upload receipt
      </button>
      <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

// ─── Receipt upload field (in edit form) ─────────────────────────────────────

function ReceiptUploadField({ initialHasReceipt, onChange }) {
  const [state, setState] = useState(initialHasReceipt ? 'imported' : 'empty'); // 'imported'|'file'|'empty'
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFileName(f.name); setState('file'); onChange(f); }
  };
  const remove = () => { setState('empty'); setFileName(null); onChange(null); };

  if (state === 'imported') return (
    <div className="receipt-field-state">
      <IconReceipt />
      <span>Imported from email</span>
      <button className="receipt-remove-btn" onClick={remove}>Remove</button>
    </div>
  );
  if (state === 'file') return (
    <div className="receipt-field-state uploaded">
      <IconReceipt />
      <span className="receipt-filename">{fileName}</span>
      <button className="receipt-remove-btn" onClick={remove}>Remove</button>
    </div>
  );
  return (
    <>
      <button className="receipt-upload-btn" onClick={() => inputRef.current?.click()}>
        <IconReceipt /> Upload receipt
      </button>
      <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />
    </>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, onUndo, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="toast">
      <span className="toast-message">{message}</span>
      {onUndo && <button className="toast-undo" onClick={onUndo}>Undo</button>}
    </div>
  );
}

// ─── Edit Bottom Sheet ───────────────────────────────────────────────────────

function EditSheet({ transaction, isOpen, onClose, onSave }) {
  const initForm = (tx) => ({
    date: tx?.date ?? '',
    merchant: tx?.merchant ?? '',
    type: tx?.transaction_type === 'income' ? 'deposit' : 'withdrawal',
    account: tx?.transaction_type === 'income' ? 'checking' : 'credit',
    amount: tx ? Math.abs(tx.amount).toFixed(2) : '',
    category: tx?.ai_category ?? CATEGORIES[0],
    notes: tx?.notes ?? '',
    has_receipt: tx?.has_receipt ?? false,
    receipt_file: null,
  });

  const [form, setForm] = useState(() => initForm(transaction));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Sync form when transaction changes (new card opened)
  useEffect(() => {
    if (transaction) setForm(initForm(transaction));
  }, [transaction?.id]);

  // Sync type ↔ account automatically
  const setType = (t) => {
    set('type', t);
    set('account', t === 'deposit' ? 'checking' : 'credit');
  };

  const handleSave = () => {
    const isDeposit = form.type === 'deposit';
    const amt = parseFloat(form.amount) || 0;
    onSave({
      ...transaction,
      date: form.date,
      merchant: form.merchant,
      transaction_type: isDeposit ? 'income' : 'expense',
      amount: isDeposit ? amt : -amt,
      ai_category: form.category,
      notes: form.notes,
      has_receipt: form.has_receipt || !!form.receipt_file,
    });
    onClose();
  };

  if (!transaction) return null;

  return (
    <>
      <div className={`sheet-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`bottom-sheet ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3 className="sheet-title">Edit Transaction</h3>
          <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="sheet-body">

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date" className="form-input"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text" className="form-input"
              value={form.merchant}
              onChange={(e) => set('merchant', e.target.value)}
              placeholder="Merchant or description"
            />
          </div>

          {/* Type */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="seg-control">
              <button
                className={form.type === 'withdrawal' ? 'active' : ''}
                onClick={() => setType('withdrawal')}
              >
                Withdrawal
              </button>
              <button
                className={form.type === 'deposit' ? 'active' : ''}
                onClick={() => setType('deposit')}
              >
                Deposit
              </button>
            </div>
          </div>

          {/* Account */}
          <div className="form-group">
            <label className="form-label">Account</label>
            <div className="seg-control seg-control-col">
              <button
                className={form.account === 'credit' ? 'active' : ''}
                onClick={() => set('account', 'credit')}
              >
                💳 Business Credit Card ···· {ACCOUNTS.credit.last4}
              </button>
              <button
                className={form.account === 'checking' ? 'active' : ''}
                onClick={() => set('account', 'checking')}
              >
                🏦 Business Checking ···· {ACCOUNTS.checking.last4}
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Amount</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">$</span>
              <input
                type="number" className="form-input input-prefixed"
                value={form.amount}
                min="0" step="0.01"
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-input form-select"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">
              Notes <span className="label-optional">optional</span>
            </label>
            <textarea
              className="form-input form-textarea"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Add a note about this transaction…"
              rows={3}
            />
          </div>

          {/* Receipt */}
          <div className="form-group">
            <label className="form-label">Receipt</label>
            <ReceiptUploadField
              key={transaction.id}
              initialHasReceipt={form.has_receipt}
              onChange={(file) => {
                set('receipt_file', file);
                if (file) set('has_receipt', true);
              }}
            />
          </div>

        </div>

        <div className="sheet-footer">
          <button className="btn btn-primary btn-wide" onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>
    </>
  );
}

// ─── More Actions Sheet ───────────────────────────────────────────────────────

function MoreSheet({ transaction, isOpen, onClose, onCopy, onDelete }) {
  if (!transaction) return null;
  return (
    <>
      <div className={`sheet-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`bottom-sheet bottom-sheet-sm ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3 className="sheet-title">{transaction.merchant}</h3>
          <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="more-actions">
          <button className="more-action-row" onClick={onCopy}>
            <div className="more-action-icon-wrap more-icon-blue"><IconCopy /></div>
            <div className="more-action-text">
              <div className="more-action-title">Make a copy</div>
              <div className="more-action-sub">Duplicate this transaction in the queue</div>
            </div>
          </button>
          <div className="more-action-divider" />
          <button className="more-action-row danger" onClick={onDelete}>
            <div className="more-action-icon-wrap more-icon-red"><IconTrash /></div>
            <div className="more-action-text">
              <div className="more-action-title">Delete transaction</div>
              <div className="more-action-sub">Remove from reconciliation queue</div>
            </div>
          </button>
        </div>
        <div className="sheet-footer sheet-footer-sm">
          <button className="btn btn-ghost btn-wide" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </>
  );
}

// ─── Transaction Card ────────────────────────────────────────────────────────

function TransactionCard({
  transaction, isMerchantMode, onConfirm, onIgnore,
  onOpenEdit, onOpenMore, animState,
}) {
  const isIncome = isMerchantMode ? transaction.totalAmount > 0 : transaction.transaction_type === 'income';
  const amountDisplay = isMerchantMode ? formatAmount(transaction.totalAmount) : formatAmount(transaction.amount);

  const animClass =
    animState === 'exit-right' ? 'card-exit-right'
    : animState === 'exit-left'  ? 'card-exit-left'
    : animState === 'enter'      ? 'card-enter'
    : '';

  return (
    <div className="card-outer">
      <div className={`card-wrapper ${animClass}`}>
        <div className="card">

          {/* ── Hero ── */}
          <div className="card-hero">
            <HeroImage src={transaction.hero_image} name={transaction.merchant} />
            <div className="card-hero-scrim" />

            {/* Floating controls on hero */}
            <div className="hero-controls">
              {!isMerchantMode && (
                <button
                  className="hero-btn hero-btn-more"
                  onClick={(e) => { e.stopPropagation(); onOpenMore(transaction); }}
                  aria-label="More options"
                >
                  <span className="hero-dots">•••</span>
                </button>
              )}
              <button
                className="hero-btn hero-btn-edit"
                onClick={(e) => { e.stopPropagation(); onOpenEdit(transaction); }}
                aria-label="Edit"
              >
                <IconPencil /> Edit
              </button>
            </div>
          </div>

          {/* ── Logo + account ── */}
          <div className="card-logo-row">
            <div className="card-logo-wrap">
              <MerchantLogo domain={transaction.logo_domain} name={transaction.merchant} size={44} />
            </div>
            <AccountChip transactionType={transaction.transaction_type} />
          </div>

          {/* ── Identity ── */}
          <h2 className="card-merchant">{transaction.merchant}</h2>
          {isMerchantMode && (
            <div className="card-merchant-count">
              {transaction.count} transaction{transaction.count !== 1 ? 's' : ''}
            </div>
          )}

          {/* ── Amount ── */}
          <div className={`card-amount ${isIncome ? 'income' : 'expense'}`}>{amountDisplay}</div>

          {/* ── Meta ── */}
          <div className="card-meta">
            <span className="category-badge">{transaction.ai_category}</span>
            <ConfidenceBadge level={transaction.ai_confidence} />
          </div>

          {/* ── Location ── */}
          {transaction.location && (
            <a
              className="card-location"
              href={mapsUrl(transaction.location)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <IconPin /><span>{transaction.location}</span>
            </a>
          )}

          {/* ── Datetime ── */}
          <div className="card-datetime">
            {isMerchantMode
              ? transaction.dateRange
              : `${formatDate(transaction.date)} · ${transaction.timestamp}`}
          </div>

          {/* ── Reasoning ── */}
          <p className="card-reasoning">"{transaction.ai_reasoning}"</p>

          {/* ── Receipt ── */}
          {!isMerchantMode && <ReceiptSection hasReceipt={transaction.has_receipt} />}

          <div className="card-divider" />

          {/* ── Actions ── */}
          <div className="card-actions">
            <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onIgnore(transaction); }}>
              {isMerchantMode ? 'Ignore All' : 'Ignore'}
            </button>
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onConfirm(transaction, transaction.ai_category); }}>
              {isMerchantMode ? 'Confirm All' : '✓ Confirm'}
            </button>
          </div>

          {/* ── Keyboard hints (desktop) ── */}
          <div className="keyboard-hints">
            <span>→ / Space <b>Confirm</b></span>
            <span>← / Backspace <b>Ignore</b></span>
            <span>E <b>Edit</b></span>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function ListRow({ item, isMerchantMode, onConfirm, onIgnore, onOpenEdit, onOpenMore }) {
  const isIncome = isMerchantMode ? item.totalAmount > 0 : item.transaction_type === 'income';
  const amount = isMerchantMode ? formatAmount(item.totalAmount) : formatAmount(item.amount);
  const acct = isIncome ? ACCOUNTS.checking : ACCOUNTS.credit;
  const confColors = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' };

  return (
    <div className="list-row">
      <div className="list-thumb">
        <HeroImage src={item.hero_image} name={item.merchant} className="list-thumb-img" />
        <div className="list-thumb-logo">
          <MerchantLogo domain={item.logo_domain} name={item.merchant} size={22} />
        </div>
      </div>
      <div className="list-row-body">
        <div className="list-row-top">
          <span className="list-merchant">{item.merchant}</span>
          <span className={`list-amount ${isIncome ? 'income' : 'expense'}`}>{amount}</span>
        </div>
        <div className="list-row-mid">
          <span className="list-category">{item.ai_category}</span>
          <span className="list-conf-dot" style={{ background: confColors[item.ai_confidence] }} />
          <span className="list-date">
            {isMerchantMode ? item.dateRange : `${formatDate(item.date)} · ${item.timestamp}`}
          </span>
        </div>
        <div className="list-row-bottom">
          <span className="list-account">{isIncome ? '🏦' : '💳'} {acct.name} ···· {acct.last4}</span>
          <div className="list-actions">
            {!isMerchantMode && (
              <button className="list-btn-more" title="More" onClick={() => onOpenMore(item)}>•••</button>
            )}
            <button className="list-btn-edit" title="Edit" onClick={() => onOpenEdit(item)}>
              <IconPencil />
            </button>
            <button className="list-btn-ignore" title="Ignore" onClick={() => onIgnore(item)}>✕</button>
            <button className="list-btn-confirm" title="Confirm" onClick={() => onConfirm(item, item.ai_category)}>✓</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ items, isMerchantMode, onConfirm, onIgnore, onOpenEdit, onOpenMore }) {
  return (
    <div className="list-view">
      {items.map((item) => (
        <ListRow
          key={isMerchantMode ? item.merchant : item.id}
          item={item}
          isMerchantMode={isMerchantMode}
          onConfirm={onConfirm}
          onIgnore={onIgnore}
          onOpenEdit={onOpenEdit}
          onOpenMore={onOpenMore}
        />
      ))}
    </div>
  );
}

// ─── Completion Screen ───────────────────────────────────────────────────────

function CompletionScreen({ confirmed, ignored, onReset }) {
  return (
    <div className="completion">
      <div className="checkmark-wrap">
        <svg className="checkmark-svg" viewBox="0 0 52 52">
          <circle className="checkmark-circle-ring" cx="26" cy="26" r="23" />
          <path className="checkmark-check" fill="none" strokeLinecap="round" strokeLinejoin="round" d="M14 26 l8 8 l16-16" />
        </svg>
      </div>
      <h1 className="completion-title">You're all caught up!</h1>
      <p className="completion-sub">All transactions have been reviewed.</p>
      <div className="completion-stats">
        <div className="stat"><span className="stat-num">{confirmed}</span><span className="stat-label">Confirmed</span></div>
        <div className="stat-divider" />
        <div className="stat"><span className="stat-num">{ignored}</span><span className="stat-label">Ignored</span></div>
      </div>
      <button className="btn btn-primary btn-wide" onClick={onReset}>Start over</button>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode]         = useState('individual');
  const [viewMode, setViewMode] = useState('card');
  const [queue, setQueue]       = useState(() => mockTransactions.map((t) => ({ ...t })));
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [ignoredCount,   setIgnoredCount]   = useState(0);
  const [animState, setAnimState] = useState('idle');
  const [toast, setToast]   = useState(null);
  const [history, setHistory] = useState([]);
  const [done, setDone]     = useState(false);

  // Sheet state — null means closed
  const [editSheet, setEditSheet] = useState(null); // transaction | null
  const [moreSheet, setMoreSheet] = useState(null); // transaction | null

  const animatingRef = useRef(false);
  const viewModeRef  = useRef(viewMode);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);

  const total     = mockTransactions.length;
  const remaining = queue.length;
  const progress  = ((total - remaining) / total) * 100;

  const merchantQueue = groupByMerchant(queue);
  const currentItem   = mode === 'individual' ? queue[0] : merchantQueue[0];

  // ── Advance queue ────────────────────────────────────────────────────────────
  const advanceQueue = useCallback((direction, ids) => {
    if (viewModeRef.current === 'card') {
      if (animatingRef.current) return;
      animatingRef.current = true;
      setAnimState(direction === 'confirm' ? 'exit-right' : 'exit-left');
      setTimeout(() => {
        setQueue((prev) => {
          const next = prev.filter((t) => !ids.includes(t.id));
          if (next.length === 0) setDone(true);
          return next;
        });
        setAnimState('enter');
        setTimeout(() => { setAnimState('idle'); animatingRef.current = false; }, 220);
      }, 220);
    } else {
      setQueue((prev) => {
        const next = prev.filter((t) => !ids.includes(t.id));
        if (next.length === 0) setDone(true);
        return next;
      });
    }
  }, []);

  // ── Confirm ──────────────────────────────────────────────────────────────────
  const doConfirm = useCallback((item, category) => {
    if (viewModeRef.current === 'card' && animatingRef.current) return;
    const ids   = item.ids || [item.id];
    const count = ids.length;
    const label = item.ids
      ? `Confirmed ${count} ${item.merchant} transaction${count !== 1 ? 's' : ''}`
      : 'Confirmed';
    const restorable = item.ids
      ? queue.filter((t) => ids.includes(t.id))
      : [queue.find((t) => t.id === item.id)].filter(Boolean);
    setHistory((h) => [...h, { type: 'confirm', items: restorable, delta: count }]);
    setConfirmedCount((c) => c + count);
    setToast({ message: label, undoable: true });
    advanceQueue('confirm', ids);
  }, [queue, advanceQueue]);

  // ── Ignore ───────────────────────────────────────────────────────────────────
  const doIgnore = useCallback((item) => {
    if (viewModeRef.current === 'card' && animatingRef.current) return;
    const ids   = item.ids || [item.id];
    const count = ids.length;
    const label = item.ids
      ? `Ignored ${count} ${item.merchant} transaction${count !== 1 ? 's' : ''}`
      : 'Ignored';
    const restorable = item.ids
      ? queue.filter((t) => ids.includes(t.id))
      : [queue.find((t) => t.id === item.id)].filter(Boolean);
    setHistory((h) => [...h, { type: 'ignore', items: restorable, delta: count }]);
    setIgnoredCount((c) => c + count);
    setToast({ message: label, undoable: true });
    advanceQueue('ignore', ids);
  }, [queue, advanceQueue]);

  // ── Undo ─────────────────────────────────────────────────────────────────────
  const undoLast = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setQueue((prev) => {
        const restored = [...last.items, ...prev];
        restored.sort((a, b) =>
          mockTransactions.findIndex((t) => t.id === a.id) -
          mockTransactions.findIndex((t) => t.id === b.id)
        );
        return restored;
      });
      if (last.type === 'confirm') setConfirmedCount((c) => c - last.delta);
      else if (last.type === 'ignore') setIgnoredCount((c) => c - last.delta);
      // delete type: no count change
      setDone(false);
      setToast(null);
      return h.slice(0, -1);
    });
  }, []);

  // ── Edit / Save ───────────────────────────────────────────────────────────────
  const openEdit = useCallback((transaction) => {
    setMoreSheet(null);
    setEditSheet(transaction);
  }, []);

  const handleSave = useCallback((updated) => {
    setQueue((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    setEditSheet(null);
    setToast({ message: 'Changes saved', undoable: false });
  }, []);

  // ── Copy ─────────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    const tx = moreSheet;
    if (!tx) return;
    const copy = { ...tx, id: Date.now() };
    setQueue((prev) => [copy, ...prev]);
    setMoreSheet(null);
    setToast({ message: `Copied · ${tx.merchant}`, undoable: false });
  }, [moreSheet]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    const tx = moreSheet;
    if (!tx) return;
    setHistory((h) => [...h, { type: 'delete', items: [tx], delta: 0 }]);
    setQueue((prev) => {
      const next = prev.filter((t) => t.id !== tx.id);
      if (next.length === 0) setDone(true);
      return next;
    });
    setMoreSheet(null);
    setToast({ message: 'Transaction deleted', undoable: true });
  }, [moreSheet]);

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const reset = () => {
    setQueue(mockTransactions.map((t) => ({ ...t })));
    setConfirmedCount(0); setIgnoredCount(0);
    setHistory([]); setToast(null);
    setDone(false); setAnimState('idle');
    animatingRef.current = false;
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    if (done || !currentItem || viewMode !== 'card') return;
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (editSheet || moreSheet) return; // sheet is open
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault(); doConfirm(currentItem, currentItem.ai_category);
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault(); doIgnore(currentItem);
      } else if (e.key === 'e' || e.key === 'E') {
        openEdit(currentItem);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [done, currentItem, viewMode, editSheet, moreSheet, doConfirm, doIgnore, openEdit]);

  const isList        = viewMode === 'list';
  const displayItems  = mode === 'individual' ? queue : merchantQueue;
  const anySheetOpen  = !!(editSheet || moreSheet);

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <span className="app-logo">⚡</span>
            <span className="app-title">Reconcile</span>
          </div>
          <div className="header-controls">
            <button
              className="mode-toggle"
              onClick={() => setMode((m) => (m === 'individual' ? 'merchant' : 'individual'))}
            >
              {mode === 'individual' ? 'By Merchant' : 'By Transaction'}
            </button>
            <div className="view-toggle">
              <button className={`view-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} title="Card view"><IconCard /></button>
              <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view"><IconList /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="progress-area">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-label">
          {remaining > 0 ? `${remaining} of ${total} remaining` : 'All done!'}
        </div>
      </div>

      {/* Main */}
      <main className={`main-content ${isList ? 'list-mode' : ''}`}>
        {done ? (
          <CompletionScreen confirmed={confirmedCount} ignored={ignoredCount} onReset={reset} />
        ) : isList ? (
          displayItems.length > 0 ? (
            <ListView
              items={displayItems}
              isMerchantMode={mode === 'merchant'}
              onConfirm={doConfirm}
              onIgnore={doIgnore}
              onOpenEdit={openEdit}
              onOpenMore={(tx) => setMoreSheet(tx)}
            />
          ) : <div className="empty-state">No transactions to review.</div>
        ) : currentItem ? (
          <TransactionCard
            key={mode === 'individual' ? currentItem.id : currentItem.merchant}
            transaction={currentItem}
            isMerchantMode={mode === 'merchant'}
            onConfirm={doConfirm}
            onIgnore={doIgnore}
            onOpenEdit={openEdit}
            onOpenMore={(tx) => setMoreSheet(tx)}
            animState={animState}
          />
        ) : <div className="empty-state">No transactions to review.</div>}
      </main>

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.message + confirmedCount + ignoredCount}
          message={toast.message}
          onUndo={toast.undoable ? undoLast : null}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Edit sheet */}
      <EditSheet
        transaction={editSheet}
        isOpen={!!editSheet}
        onClose={() => setEditSheet(null)}
        onSave={handleSave}
      />

      {/* More sheet */}
      <MoreSheet
        transaction={moreSheet}
        isOpen={!!moreSheet}
        onClose={() => setMoreSheet(null)}
        onCopy={handleCopy}
        onDelete={handleDelete}
      />
    </div>
  );
}
