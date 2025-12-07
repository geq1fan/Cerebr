/**
 * DevTools entry script - creates the Cerebr Network panel
 */
console.log('[Cerebr DevTools] Initializing...');

chrome.devtools.panels.create(
  'Cerebr Network',              // Panel title
  'icons/icon16.png',            // Panel icon
  'devtools-panel.html',         // Panel HTML
  (panel) => {
    console.log('[Cerebr DevTools] Panel created');

    panel.onShown.addListener((panelWindow) => {
      console.log('[Cerebr DevTools] Panel shown');
      // Start network monitoring when panel becomes visible
      if (panelWindow && panelWindow.startMonitoring) {
        panelWindow.startMonitoring();
      }
    });

    panel.onHidden.addListener(() => {
      console.log('[Cerebr DevTools] Panel hidden');
    });
  }
);
