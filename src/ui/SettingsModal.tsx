import { useState, useEffect } from 'react';
import type { GrowiPluginHub, PluginState, HubSettings } from '../hub/types';

interface Props {
  hub: GrowiPluginHub;
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ hub, isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<HubSettings>(() => hub._getSettings());
  const [pluginStates, setPluginStates] = useState<PluginState[]>(() => hub._getPluginStates());

  useEffect(() => {
    if (!isOpen) return;
    setSettings(hub._getSettings());
    setPluginStates(hub._getPluginStates());
    const unsubscribe = hub._onRegistryUpdate(() => {
      setPluginStates(hub._getPluginStates());
    });
    return unsubscribe;
  }, [hub, isOpen]);

  if (!isOpen) return null;

  const sorted = [...pluginStates].sort(
    (a, b) => (a.registration.order ?? 100) - (b.registration.order ?? 100),
  );

  function togglePlugin(pluginId: string): void {
    const newDisabled = settings.disabledPlugins.includes(pluginId)
      ? settings.disabledPlugins.filter((id) => id !== pluginId)
      : [...settings.disabledPlugins, pluginId];
    const newSettings: HubSettings = { ...settings, disabledPlugins: newDisabled };
    setSettings(newSettings);
    hub._updateSettings(newSettings);
  }

  function toggleDebug(): void {
    const newSettings: HubSettings = { ...settings, debug: !settings.debug };
    setSettings(newSettings);
    hub._updateSettings(newSettings);
    hub.debug = newSettings.debug;
  }

  function toggleDebugPlugin(pluginId: string): void {
    // debugPlugins is a blacklist: listed plugins have logging disabled
    const newDebugPlugins = settings.debugPlugins.includes(pluginId)
      ? settings.debugPlugins.filter((id) => id !== pluginId)  // remove from blacklist = enable
      : [...settings.debugPlugins, pluginId];                   // add to blacklist = disable

    const newSettings: HubSettings = { ...settings, debugPlugins: newDebugPlugins };
    setSettings(newSettings);
    hub._updateSettings(newSettings);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div
        className="card shadow"
        style={{ position: 'relative', width: '480px', maxHeight: '80vh', overflow: 'auto' }}
      >
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">拡張機能の設定</h5>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>
        <div className="card-body">
          {/* Plugin List */}
          <h6 className="text-muted mb-2">プラグイン一覧</h6>
          <div className="list-group mb-3">
            {sorted.map((p) => {
              const isDisabled = settings.disabledPlugins.includes(p.registration.id);
              const isRequired = p.registration.required === true;
              return (
                <div
                  key={p.registration.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div className="d-flex align-items-center gap-2">
                    {p.registration.icon && (
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {p.registration.icon}
                      </span>
                    )}
                    <span>{p.registration.label}</span>
                    {isRequired && (
                      <span className="material-symbols-outlined text-muted" style={{ fontSize: '16px' }} title="必須プラグイン">
                        lock
                      </span>
                    )}
                  </div>
                  <div className="form-check form-switch mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={isRequired || !isDisabled}
                      disabled={isRequired}
                      onChange={() => togglePlugin(p.registration.id)}
                    />
                  </div>
                </div>
              );
            })}
            {sorted.length === 0 && (
              <div className="list-group-item text-muted">登録されたプラグインはありません</div>
            )}
          </div>

          {/* Developer Section */}
          <h6 className="text-muted mb-2">開発者向け</h6>
          <div className="list-group mb-3">
            <div className="list-group-item d-flex justify-content-between align-items-center">
              <span>デバッグログ</span>
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.debug}
                  onChange={toggleDebug}
                />
              </div>
            </div>
            {settings.debug && sorted.length > 0 && (
              <>
                <div className="list-group-item py-1">
                  <small className="text-muted">
                    {settings.debugPlugins.length === 0
                      ? '全プラグインのログを表示中'
                      : `${settings.debugPlugins.length}個のプラグインを非表示中`}
                  </small>
                </div>
                {sorted.map((p) => (
                  <div
                    key={`debug-${p.registration.id}`}
                    className="list-group-item d-flex justify-content-between align-items-center py-1"
                    style={{ paddingLeft: '2rem' }}
                  >
                    <small>{p.registration.label}</small>
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={!settings.debugPlugins.includes(p.registration.id)}
                        onChange={() => toggleDebugPlugin(p.registration.id)}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Status Section */}
          <h6 className="text-muted mb-2">ステータス</h6>
          <div className="list-group">
            {sorted.map((p) => (
              <div
                key={p.registration.id}
                className="list-group-item d-flex justify-content-between align-items-center py-1"
                style={{ fontSize: '0.85em' }}
              >
                <code>{p.registration.id}</code>
                <span>
                  {p.status === 'active' && <span className="text-success">active ✔</span>}
                  {p.status === 'disabled' && <span className="text-muted">disabled ─</span>}
                  {p.status === 'error' && <span className="text-danger">error ✘</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
