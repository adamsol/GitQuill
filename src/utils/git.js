
export async function getStatus(file_path) {
    const args = [];
    if (file_path !== undefined) {
        args.push('--', file_path);
    }
    // https://git-scm.com/docs/git-status#_short_format
    // https://stackoverflow.com/questions/28222633/git-status-not-showing-contents-of-newly-added-folder
    const summary = await electron.callGit('status', '--porcelain', '--untracked-files=all', ...args);
    const files = summary.split('\n').slice(0, -1).map(row => ({
        x: row[0],
        y: row[1],
        path: row.slice(3),
    }));
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
        await electron.callGit('reset', '--', ..._.map(conflict_files, 'path'));
        // Additionally handle the "deleted by them" conflict, so that it doesn't go unnoticed.
        for (const file of conflict_files.filter(file => file.x === 'U' && file.y === 'D')) {
            await electron.deleteFile(file.path);
        }
        return await getStatus(file_path);
    }
    const processFiles = files => _.sortBy(files.filter(file => file.status !== ' '), 'path');

    return {
        unstaged: processFiles(files.map(file => ({
            status: file.y === '?' ? 'A' : file.y,
            path: file.path,
            area: 'unstaged',
        }))),
        staged: processFiles(files.map(file => ({
            status: file.x === '?' ? ' ' : file.x,
            path: file.path,
            area: 'staged',
        }))),
    };
}
