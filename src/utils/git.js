
export async function getStatus(repo, ...args) {
    // https://git-scm.com/docs/git-status#_short_format
    // https://stackoverflow.com/questions/28222633/git-status-not-showing-contents-of-newly-added-folder
    const status = await repo.callGit('status', '--porcelain', '-z', '--untracked-files=all', ...args);
    const tokens = status.split('\0');

    const files = [];

    for (let i = 0; i < tokens.length - 1; ++i) {
        const token = tokens[i];
        const file = {
            x: token[0],
            y: token[1],
            path: token.slice(3),
        };
        // https://stackoverflow.com/questions/73954214/is-it-possible-to-rename-a-file-in-work-tree-without-staging
        if (['R', 'C'].includes(file.x)) {
            file.old_path = tokens[++i];
        }
        files.push(file);
    }
    const conflict_files = files.filter(file => _.some([
        [file.x, file.y].includes('U'),
        file.x === file.y && ['A', 'D'].includes(file.x),
    ]));
    if (conflict_files.length > 0) {
        await repo.callGit('reset', '--', ..._.map(conflict_files, 'path'));
        // Additionally handle the "deleted by them" conflict, so that it doesn't go unnoticed.
        for (const file of _.filter(conflict_files, { x: 'U', y: 'D' })) {
            await repo.deleteFile(file.path);
        }
        return await getStatus(repo, ...args);
    }
    const processFiles = files => _.sortBy(_.reject(files, { status: ' ' }), 'path');

    return {
        unstaged: processFiles(files.map(file => ({
            status: file.y === '?' ? 'A' : file.y,
            path: file.path,
            old_path: file.old_path,
            area: 'unstaged',
        }))),
        staged: processFiles(files.map(file => ({
            status: file.x === '?' ? ' ' : file.x,
            path: file.path,
            old_path: file.old_path,
            area: 'staged',
        }))),
    };
}

export async function getEmptyRootHash(repo) {
    // https://stackoverflow.com/questions/40883798/how-to-get-git-diff-of-the-first-commit
    return (await repo.callGit('hash-object', '-t', 'tree', '/dev/null')).trim();
}

export function isFileBinary(buffer) {
    // https://stackoverflow.com/questions/6119956/how-to-determine-if-git-handles-a-file-as-binary-or-as-text
    const n = Math.min(buffer.length, 8000);
    for (let i = 0; i < n; ++i) {
        if (buffer[i] === 0) {
            return true;
        }
    }
    return false;
}
