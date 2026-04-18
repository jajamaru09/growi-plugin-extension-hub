import { createRoot, type Root } from 'react-dom/client';
import type { GrowiPluginHub } from '../hub/types';
import { HubButton } from './HubButton';
import { SettingsModal } from './SettingsModal';
import { useState } from 'react';

const HUB_MOUNT_ID = 'growi-plugin-hub-mount';

let root: Root | null = null;

function getContainer(): HTMLElement | null {
  const anchor =
    document.querySelector('[data-testid="pageListButton"]') ??
    document.querySelector('[data-testid="page-comment-button"]');
  return (anchor?.parentElement as HTMLElement) ?? null;
}

function getCssModuleClass(): string {
  const btn = document.querySelector<HTMLButtonElement>(
    '[data-testid="pageListButton"] button, [data-testid="page-comment-button"] button',
  );
  return (
    Array.from(btn?.classList ?? []).find((cls) =>
      cls.includes('btn-page-accessories'),
    ) ?? ''
  );
}

function waitForContainer(timeout = 3000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const container = getContainer();
    if (container) { resolve(container); return; }

    const observer = new MutationObserver(() => {
      const c = getContainer();
      if (c) { observer.disconnect(); resolve(c); }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      const c = getContainer();
      if (c) { resolve(c); }
      else { reject(new Error('[PluginHub] Sidebar container not found after timeout')); }
    }, timeout);
  });
}

function HubApp({ hub }: { hub: GrowiPluginHub }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <>
      <HubButton
        hub={hub}
        cssClass={getCssModuleClass()}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal
        hub={hub}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

let mountInProgress = false;

export async function mountHubUI(hub: GrowiPluginHub): Promise<void> {
  const existing = document.getElementById(HUB_MOUNT_ID);
  if (existing && document.body.contains(existing) && root) {
    return;
  }

  if (mountInProgress) return;
  mountInProgress = true;

  try {
    const container = await waitForContainer();
    root?.unmount();
    const el = document.createElement('div');
    el.id = HUB_MOUNT_ID;
    container.appendChild(el);
    root = createRoot(el);
    root.render(<HubApp hub={hub} />);
  } catch (e) {
    console.error(e);
  } finally {
    mountInProgress = false;
  }
}

export function unmountHubUI(): void {
  root?.unmount();
  root = null;
  document.getElementById(HUB_MOUNT_ID)?.remove();
}
