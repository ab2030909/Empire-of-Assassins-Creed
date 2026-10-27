import { Modal } from '../App';
import { useSettings } from './settings';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [s, set] = useSettings();
  const row = (key: 'sound' | 'music' | 'reduceMotion', label: string, hint: string) => (
    <label className="hp-toggle">
      <span><b>{label}</b><small>{hint}</small></span>
      <input type="checkbox" role="switch" checked={s[key]} onChange={(e) => set({ [key]: e.target.checked })} />
      <i aria-hidden="true" />
    </label>
  );
  return (
    <Modal title="Settings" onClose={onClose}>
      {row('sound', 'Sound effects', 'Interface clicks')}
      {row('music', 'Ambient music', 'Generated atmospheric drone')}
      {row('reduceMotion', 'Reduce animations', 'Disables parallax and motion effects')}
      <p className="small muted">Settings are saved on this device.</p>
    </Modal>
  );
}
