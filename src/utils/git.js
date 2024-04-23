
export async function getStatus(file_path) {
    const args = [];
    if (file_path !== undefined) {
        args.push(file_path);
    }
    const summary = await electron.callGit('status', args);
    const processFiles = files => _.sortBy(files.filter(file => file.status !== ' '), 'path');

    return {
        unstaged: processFiles(summary.files.map(file => ({
            status: file.working_dir === '?' ? 'A' : file.working_dir,
            path: file.path,
            area: 'unstaged',
        }))),
        staged: processFiles(summary.files.map(file => ({
            status: file.index === '?' ? ' ' : file.index,
            path: file.path,
            area: 'staged',
        }))),
    };
}
