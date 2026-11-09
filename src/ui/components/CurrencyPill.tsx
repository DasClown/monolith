import { Icon, type IconName } from './Icons';

interface CurrencyPillProps {
  icon: IconName;
  value: string;
  label: string;
  variant: 'cash' | 'coins' | 'gems';
  onClick?: () => void;
}

export function CurrencyPill({ icon, value, label, variant, onClick }: CurrencyPillProps) {
  const content = (
    <>
      <span className="currency-icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="currency-value">{value}</span>
      <span className="visually-hidden">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`currency-pill currency-pill--${variant} currency-pill--action`}
        onClick={onClick}
        aria-label={`${label}: ${value}. Open the vault.`}
        title={`${label} · open vault`}
      >
        {content}
        <span className="currency-plus" aria-hidden="true">
          +
        </span>
      </button>
    );
  }

  return (
    <div className={`currency-pill currency-pill--${variant}`} aria-label={`${label}: ${value}`}>
      {content}
    </div>
  );
}
