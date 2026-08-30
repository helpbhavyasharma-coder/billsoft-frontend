import { AlertCircle, Loader2, Search, X } from 'lucide-react';

export function PageHeader({ title, subtitle, actions, meta }) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {meta && <div className="mt-2">{meta}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className = '', noPadding = false }) {
  return <div className={`panel ${noPadding ? 'panel-flush' : ''} ${className}`}>{children}</div>;
}

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...props }) {
  return (
    <button className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function IconButton({ label, variant = 'ghost', className = '', children, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`icon-btn icon-btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SearchField({ value, onChange, placeholder = 'Search...', className = '', onClear }) {
  const canClear = value && String(value).length > 0;
  return (
    <div className={`search-field ${className}`}>
      <Search className="search-field-icon" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="search-field-input"
        type="search"
      />
      {canClear && (
        <button
          type="button"
          className="search-field-clear"
          aria-label="Clear search"
          title="Clear search"
          onClick={onClear || (() => onChange({ target: { value: '' } }))}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status, children }) {
  const normalized = String(status || '').toLowerCase();
  return <span className={`status-badge status-${normalized || 'neutral'}`}>{children || status || 'Status'}</span>;
}

export function Money({ value, className = '' }) {
  const amount = parseFloat(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return <span className={`money ${className}`}>₹{amount}</span>;
}

export function LoadingState({ label = 'Loading data...' }) {
  return (
    <div className="state-box">
      <Loader2 className="state-icon animate-spin" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = AlertCircle, title = 'No records found', description, action }) {
  return (
    <div className="state-box">
      <Icon className="state-icon" />
      <p className="state-title">{title}</p>
      {description && <p className="state-description">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description = 'Please try again.', action }) {
  return (
    <div className="state-box state-error">
      <AlertCircle className="state-icon" />
      <p className="state-title">{title}</p>
      <p className="state-description">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, tone = 'neutral', icon: Icon, helper }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <div className="stat-card-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {helper && <p className="stat-helper">{helper}</p>}
      </div>
      {Icon && (
        <div className="stat-icon">
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

