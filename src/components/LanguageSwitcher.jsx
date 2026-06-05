import { useI18n } from '../lib/i18n.jsx';

// Language picker. Auto-detected on first load (browser language), always
// overridable here; the choice persists to localStorage + the signed-in profile.
// Native <select> for reliability + accessibility; restyle via className.
export default function LanguageSwitcher({ className = '' }) {
  const { locale, setLocale, supported } = useI18n();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      aria-label="Language"
      className={`ring-lux cursor-pointer rounded-lg border border-mist bg-cloud px-2.5 py-1.5 text-xs font-semibold text-ink outline-none transition-colors focus:border-ink ${className}`}
    >
      {supported.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
