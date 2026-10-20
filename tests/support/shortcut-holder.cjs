// Isolated native hotkey contender for the P0 lifecycle regression test.
const { app, globalShortcut } = require('electron');
app.whenReady().then(() => {
  if (!globalShortcut.register('Control+Alt+D', () => {})) throw new Error('Test hotkey already occupied');
});
app.on('will-quit', () => globalShortcut.unregisterAll());
