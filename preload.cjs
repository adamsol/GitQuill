
const { contextBridge, ipcRenderer } = require('electron');
const Store = require('electron-store');

const store = new Store();

contextBridge.exposeInMainWorld('electron', {
    setEnv: async (...args) => await ipcRenderer.invoke('set-env', ...args),
    callGit: async (...args) => JSON.parse(await ipcRenderer.invoke('call-git', ...args)),
    exists: async (...args) => await ipcRenderer.invoke('exists', ...args),
    readFile: async (...args) => await ipcRenderer.invoke('read-file', ...args),
    writeFile: async (...args) => await ipcRenderer.invoke('write-file', ...args),
    addListener: (event_name, callback) => {
        ipcRenderer.addListener(event_name, callback);
        return () => ipcRenderer.removeListener(event_name, callback);
    },
    store: {
        get: (...args) => store.get(...args),
        set: (...args) => store.set(...args),
    },
});
