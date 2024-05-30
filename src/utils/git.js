
export async function getStatus(file_path) {
    const args = [];
    if (file_path !== undefined) {
        args.push(file_path);
    }
    // https://git-scm.com/docs/git-status#_short_format
    const summary = await electron.callGit('status', args);
    const conflict_files = summary.files.filter(file => _.some([
        [file.index, file.working_dir].includes('U'),
        file.index === file.working_dir && ['A', 'D'].includes(file.index),
    ]));
    if (conflict_files.length > 0) {
        // The special state of unresolved conflicts makes things complicated to handle,
        // and annoying from the user perspective, as many standard Git commands refuse to work as expected.
        // For this reason, we automatically reset the files.
        // This still leaves the conflict markers to be manually resolved,
        // but brings the repository back to a normal state.
        alert("Conflict:\n" + conflict_files.map(file => `${file.path} (${file.index}${file.working_dir})`).join('\n'));
        await electron.callGit('reset', 'mixed', ['--', ..._.map(conflict_files, 'path')]);
        // Additionally handle the "deleted by them" conflict, so that it doesn't go unnoticed.
        for (const file of conflict_files.filter(file => file.index === 'U' && file.working_dir === 'D')) {
            await electron.deleteFile(file.path);
        }
        return await getStatus(file_path);
    }
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
