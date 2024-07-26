
export async function getStatus(...args) {
    // https://git-scm.com/docs/git-status#_short_format
    // https://stackoverflow.com/questions/28222633/git-status-not-showing-contents-of-newly-added-folder
    const status = await repo.callGit('status', '--porcelain', '-z', '--untracked-files=all', ...args);
    const tokens = status.split('\0');
    // https://stackoverflow.com/questions/6245570/how-do-i-get-the-current-branch-name-in-git/#49418399
    const branch = args.includes('--branch') ? tokens.shift().split(' ')[1].split('...')[0] : undefined;

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
        // The special state of unresolved conflicts makes things complicated to handle,
        // and annoying from the user perspective, as many standard Git commands refuse to work as expected.
        // For this reason, we automatically reset the files.
        // This still leaves the conflict markers to be manually resolved,
        // but brings the repository back to a normal state.
        alert("Conflict:\n" + conflict_files.map(file => `${file.path} (${file.x}${file.y})`).join('\n'));
        await repo.callGit('reset', '--', ..._.map(conflict_files, 'path'));
        // Additionally handle the "deleted by them" conflict, so that it doesn't go unnoticed.
        for (const file of _.filter(conflict_files, { x: 'U', y: 'D' })) {
            await repo.deleteFile(file.path);
        }
        return await getStatus(...args);
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
        branch,
    };
}
