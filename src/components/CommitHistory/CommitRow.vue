
<template>
    <div
        class="row clickable whitespace-nowrap"
        :class="active ? 'active' : '[&:not(:first-child)]:*:text-gray'"
        @click="select"
    >
        <div v-if="commit.hash === 'WORKING_TREE'" class="italic">
            <template v-if="current_operation_label !== undefined">
                [{{ current_operation_label }}]
            </template>
            <template v-if="uncommitted_changes_count === 0">
                Working tree clean
            </template>
            <template v-else>
                Uncommitted changes
                ({{ uncommitted_changes_count }})
            </template>
        </div>
        <template v-else>
            <div class="grow ellipsis" :title="commit.subject">
                {{ commit.subject }}
            </div>
            <div>
                {{ commit.author_name }}
            </div>
            <div>
                {{ commit.committer_date }}
            </div>
            <div class="font-mono">
                {{ commit.hash_abbr }}
            </div>
        </template>
    </div>
</template>

<script>
    export default {
        inject: [
            'commits', 'commit_by_hash', 'selected_commits', 'selected_commit_hashes',
            'uncommitted_changes_count', 'current_operation_label', 'selected_file',
            'setSelectedCommits',
        ],
        props: {
            commit: { type: Object, default: null },
        },
        computed: {
            active() {
                return this.selected_commit_hashes.has(this.commit.hash);
            },
        },
        methods: {
            select(event) {
                if (event.shiftKey && this.selected_commits.length > 0) {
                    let source = _.last(this.selected_commits);
                    let target = this.commit;
                    if (target.index < source.index) {
                        [source, target] = [target, source];
                    }
                    const visited = [];

                    const traverse = commit => {
                        if (commit.index >= target.index) {
                            return commit.index === target.index;
                        }
                        visited.push(commit);
                        for (const hash of commit.parents) {
                            if (traverse(this.commit_by_hash[hash])) {
                                return true;
                            }
                        }
                        visited.pop();
                    }
                    traverse(source);

                    if (this.commit === target) {
                        visited.push(this.commit);
                    } else {
                        visited.reverse();
                        if (visited.length === 0) {
                            visited.push(this.commit);
                        }
                    }
                    _.remove(visited, commit => this.selected_commit_hashes.has(commit.hash));

                    this.setSelectedCommits([...this.selected_commits, ...visited]);

                } else if (event.ctrlKey) {
                    if (this.selected_commit_hashes.has(this.commit.hash)) {
                        this.setSelectedCommits(_.exclude(this.selected_commits, { hash: this.commit.hash }));
                    } else {
                        this.setSelectedCommits([...this.selected_commits, this.commit]);
                    }

                } else {
                    this.setSelectedCommits([this.commit]);
                }
            },
        },
    };
</script>
