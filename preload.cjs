
const { contextBridge, ipcRenderer } = require('electron');
const Store = require('electron-store');

const store = new Store();

contextBridge.exposeInMainWorld('electron', {
    callGit: async (...args) => JSON.parse(await ipcRenderer.invoke('call-git', ...args)),
    addListener: (event_name, callback) => {
        ipcRenderer.addListener(event_name, callback);
        return () => ipcRenderer.removeListener(event_name, callback);
    },
    store: {
        get: (...args) => store.get(...args),
        set: (...args) => store.set(...args),
    },
});
