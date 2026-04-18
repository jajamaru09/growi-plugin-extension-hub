import { useState, useEffect, useCallback, useRef } from 'react';
import type { GrowiPluginHub, PluginState } from '../hub/types';

interface Props {
  hub: GrowiPluginHub;
  cssClass: string;
  onOpenSettings: () => void;
}

export function HubButton({ hub, cssClass, onOpenSettings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pluginStates, setPluginStates] = useState<PluginState[]>(() => hub._getPluginStates());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = hub._onRegistryUpdate(() => {
      setPluginStates(hub._getPluginStates());
    });
    setPluginStates(hub._getPluginStates());
    return unsubscribe;
  }, [hub]);

  // 外部クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // ホバーで開き、マウスが離れたら閉じる
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setIsOpen(false), 200);
  }, []);

  const activeMenuItems = pluginStates.filter(
    (p) => p.status === 'active' && p.registration.menuItem !== false && p.registration.onAction,
  );

  const sortedItems = [...activeMenuItems].sort(
    (a, b) => (a.registration.order ?? 100) - (b.registration.order ?? 100),
  );

  const badgeItem = sortedItems.find(
    (p) => p.registration.badge != null && p.registration.badge > 0,
  );

  const handleAction = useCallback((pluginId: string, pageId: string) => {
    const state = pluginStates.find((p) => p.registration.id === pluginId);
    if (state?.registration.onAction) {
      setIsOpen(false);
      state.registration.onAction(pageId);
    }
  }, [pluginStates]);

  const currentPageId = location.pathname;

  return (
    <div className="d-flex position-relative" ref={menuRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        className={`btn btn-outline-neutral-secondary ${cssClass} rounded-pill py-1 px-lg-3`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="grw-icon d-flex me-lg-2">
          <span className="material-symbols-outlined">extension</span>
        </span>
        <span className="grw-labels d-none d-lg-flex">拡張機能</span>
        {badgeItem && badgeItem.registration.badge != null && badgeItem.registration.badge > 0 && (
          <span className="grw-count-badge px-2 badge bg-body-tertiary text-body-tertiary">
            {badgeItem.registration.badge}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="dropdown-menu show"
          style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1050, minWidth: '180px' }}
        >
          {sortedItems.map((p) => (
            <button
              key={p.registration.id}
              type="button"
              className="dropdown-item d-flex align-items-center gap-2"
              onClick={() => handleAction(p.registration.id, currentPageId)}
            >
              {p.registration.icon && (
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {p.registration.icon}
                </span>
              )}
              <span>{p.registration.label}</span>
              {p.registration.badge != null && p.registration.badge > 0 && (
                <span className="grw-count-badge px-2 badge bg-body-tertiary text-body-tertiary ms-auto">
                  {p.registration.badge}
                </span>
              )}
            </button>
          ))}
          {sortedItems.length > 0 && <div className="dropdown-divider" />}
          <button
            type="button"
            className="dropdown-item d-flex align-items-center gap-2"
            onClick={() => { setIsOpen(false); onOpenSettings(); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
            <span>設定</span>
          </button>
        </div>
      )}
    </div>
  );
}
