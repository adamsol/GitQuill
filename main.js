
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

import { exec, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import initContextMenu from 'electron-context-menu';
import logging from 'electron-log';
import Store from 'electron-store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let window;

async function openRepo() {
    const result = await dialog.showOpenDialog(window, {
        title: 'Open Repo',
        properties: ['openDirectory'],
    });
    const folder_path = result.filePaths[0];

    if (folder_path !== undefined) {
        const git_path = path.join(folder_path, '.git');

        if (fs.existsSync(git_path)) {
            return folder_path;
        } else {
            await dialog.showMessageBox(window, {
                message: 'Not a Git repository!',
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

initContextMenu({ showSelectAll: false });
Store.initRenderer();

app.whenReady().then(async () => {
    window = new BrowserWindow({
        webPreferences: {
            preload: path.join(app.getAppPath(), 'preload.cjs'),
            sandbox: false,  // https://github.com/sindresorhus/electron-store/issues/268#issuecomment-1809555869
        },
        icon: path.join(__dirname, 'img/logo.jpg'),
    });
    window.maximize();

    async function log(repo_path, repr, func) {
        const t = performance.now();
        if (!fs.existsSync(path.join(repo_path, '.git'))) {
            throw new Error('Not a Git repository!');
        }
        const file_path = path.join(repo_path, '.git/.quill/app.log');
        try {
            const result = await func();
            const ms = `${Math.round(performance.now() - t)}`.padStart(3, ' ');
            logging.transports.file.resolvePathFn = () => file_path;
            logging.info(`[${ms} ms] ${repr}`);
            return result;
        } catch (e) {
            const ms = `${Math.round(performance.now() - t)}`.padStart(3, ' ');
            logging.transports.file.resolvePathFn = () => file_path;
            logging.error(`[${ms} ms] ${repr}\n${e}`);
            throw e;
        }
    }
    ipcMain.handle('open-repo', async () => {
        return await openRepo();
    });
    ipcMain.handle('open-terminal', (event, repo_path) => {
        const platform = os.platform();
        let cmd;

        if (platform === 'win32') {
            cmd = 'start cmd';
        } else if (platform === 'linux') {
            cmd = 'gnome-terminal';
        } else if (platform === 'darwin') {
            cmd = 'open -a Terminal';
        }
        exec(cmd, { cwd: repo_path });
    });
    ipcMain.handle('call-git', async (event, repo_path, ...args) => {
        const run = async () => await log(
            repo_path,
            `call-git ${JSON.stringify(args)}`,
            () => new Promise((resolve, reject) => {
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
    ipcMain.handle('read-file', async (event, repo_path, file_path, { null_if_not_exists = false } = {}) => {
        return await log(
            repo_path,
            `read-file ${file_path}`,
            async () => {
                try {
                    return await fs.promises.readFile(path.join(repo_path, file_path), { encoding: 'utf8' });
                } catch (e) {
                    if (null_if_not_exists && e.code === 'ENOENT') {
                        return null;
                    }
                    throw e;
                }
            },
        );
    });
    ipcMain.handle('write-file', async (event, repo_path, file_path, content, { make_directory = false } = {}) => {
        return await log(
            repo_path,
            `write-file ${file_path}`,
            async () => {
                file_path = path.join(repo_path, file_path);
                if (make_directory) {
                    try {
                        await fs.promises.mkdir(path.dirname(file_path));
                    } catch (e) {
                        if (e.code !== 'EEXIST') {
                            throw e;
                        }
                    }
                }
                await fs.promises.writeFile(file_path, content);
            },
        );
    });
    ipcMain.handle('delete-file', async (event, repo_path, file_path) => {
        return await log(
            repo_path,
            `delete-file ${file_path}`,
            () => fs.promises.unlink(path.join(repo_path, file_path)),
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
