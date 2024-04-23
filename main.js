
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

import fs from 'fs';
import path from 'path';

import { simpleGit } from 'simple-git';

import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import initContextMenu from 'electron-context-menu';
import Store from 'electron-store';

const store = new Store();
let git = simpleGit(store.get('repo_path'));
let window;

async function openRepo() {
    const result = await dialog.showOpenDialog(window, {
        title: "Open Repo",
        properties: ['openDirectory'],
    });
    const folder_path = result.filePaths[0];

    if (folder_path !== undefined) {
        const git_path = path.join(folder_path, '.git');

        if (fs.existsSync(git_path) && fs.lstatSync(git_path).isDirectory()) {
            git = simpleGit(folder_path);
            store.set('repo_path', folder_path);
            await window.loadFile('index.html');
        } else {
            await dialog.showMessageBox(window, {
                message: "Not a Git repository!",
            });
            await openRepo();
        }
    }
}

const app_menu_template = [
    {
        label: 'Repo',
        submenu: [
            { label: "Open", click: openRepo, accelerator: 'CmdOrCtrl+O' },
        ],
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' }, { role: 'toggledevtools' },
            { type: 'separator' },
            { role: 'resetzoom' }, { role: 'zoomin' }, { role: 'zoomout' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
        ],
    },
];
Menu.setApplicationMenu(Menu.buildFromTemplate(app_menu_template));

initContextMenu();
Store.initRenderer();

app.whenReady().then(async () => {
    window = new BrowserWindow({
        webPreferences: {
            preload: path.join(app.getAppPath(), 'preload.cjs'),
            sandbox: false,  // https://github.com/sindresorhus/electron-store/issues/268#issuecomment-1809555869
        },
    });
    window.maximize();

    ipcMain.handle('call-git', async (event, cmd, ...args) => {
        const repr = `git ${cmd} ${JSON.stringify(args)}`;
        try {
            const t = performance.now();
            const result = await git[cmd](...args);
            console.info(`RUN (${Math.round(performance.now() - t)} ms): ${repr}`);
            return JSON.stringify(result);
        } catch (e) {
            console.error(`ERROR: ${repr}`);
            throw e;
        }
    });
    ipcMain.handle('read-file', async (event, file_path) => await fs.promises.readFile(path.join(git._executor.cwd, file_path), { encoding: 'utf8' }));
    ipcMain.handle('write-file', async (event, file_path, content) => await fs.promises.writeFile(path.join(git._executor.cwd, file_path), content));
    window.on('focus', () => window.webContents.send('window-focus'));
    window.on('blur', () => window.webContents.send('window-blur'));

    await window.loadFile('index.html');
});
