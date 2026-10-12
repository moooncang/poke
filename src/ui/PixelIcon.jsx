import { icon } from './assets.js';

/** Decorative by default: adjacent text keeps the accessible name. */
export function PixelIcon({ name, size = 16, label, className = '' }) {
  return <img className={`pixel-icon ${className}`} src={icon(name, size)} width={size} height={size} alt={label || ''} aria-hidden={label ? undefined : true}/>;
}

export const conditionIcon = condition => condition.startsWith('복역') ? 'status-prison'
  : condition === '수배 중' ? 'status-wanted' : condition.startsWith('빚') ? 'status-debt' : 'status-outlaw';
