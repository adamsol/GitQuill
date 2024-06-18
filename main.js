
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import initContextMenu from 'electron-context-menu';
import Store from 'electron-store';

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
            return folder_path;
        } else {
            await dialog.showMessageBox(window, {
                message: "Not a Git repository!",
            });
            return await openRepo();
        }
    }
}

const app_menu_template = [
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

    async function log(repr, promise) {
        try {
            const t = performance.now();
            const result = await promise;
            console.info(`RUN (${Math.round(performance.now() - t)} ms): ${repr}`);
            return result;
        } catch (e) {
            console.error(`ERROR: ${repr}`);
            throw e;
        }
    }
    ipcMain.handle('open-repo', async () => {
        return await openRepo();
    });
    ipcMain.handle('call-git', async (event, repo_path, args) => {
        const run = async () => await log(
            `call-git [${repo_path}] ${JSON.stringify(args)}`,
            new Promise((resolve, reject) => {
                const stdout = [], stderr = [];
                const process = spawn('git', args, { cwd: repo_path });
                process.stdout.setEncoding('utf8');
                process.stdout.on('data', buffer => stdout.push(buffer));
                process.stderr.setEncoding('utf8');
                process.stderr.on('data', buffer => stderr.push(buffer));
                process.on('close', code => {
                    if (code === 0) {
                        resolve(stdout.join(''));
                    } else {
                        reject(new Error([...stdout, ...stderr].join('')));
                    }
                });
            }),
        );
        let retries = 3;
        let delay = 100;

        while (true) {
            try {
                return await run();
            } catch (e) {
                if (e.message.includes(`.git/index.lock': File exists`) && retries > 0) {
                    await new Promise(r => setTimeout(r, delay));
                    retries -= 1;
                    delay *= 2;
                    continue;
                }
                throw e;
            }
        }
    });
    ipcMain.handle('exists', async (event, file_path) => {
        if (Array.isArray(file_path)) {
            file_path = path.join(...file_path);
        }
        return await log(
            `exists ${file_path}`,
            new Promise(resolve => resolve(fs.existsSync(file_path))),
        );
    });
    ipcMain.handle('read-file', async (event, file_path) => {
        if (Array.isArray(file_path)) {
            file_path = path.join(...file_path);
        }
        return await log(
            `read-file ${file_path}`,
            fs.promises.readFile(file_path, { encoding: 'utf8' }),
        );
    });
    ipcMain.handle('write-file', async (event, file_path, content) => {
        if (Array.isArray(file_path)) {
            file_path = path.join(...file_path);
        }
        return await log(
            `write-file ${file_path}`,
            fs.promises.writeFile(file_path, content),
        );
    });
    ipcMain.handle('delete-file', async (event, file_path) => {
        if (Array.isArray(file_path)) {
            file_path = path.join(...file_path);
        }
        return await log(
            `delete-file ${file_path}`,
            fs.promises.unlink(file_path),
        );
    });
    window.on('focus', () => window.webContents.send('window-focus'));
    window.on('blur', () => window.webContents.send('window-blur'));

    // https://stackoverflow.com/questions/32402327/how-can-i-force-external-links-from-browser-window-to-open-in-a-default-browser
    window.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
    await window.loadFile('index.html');
});
