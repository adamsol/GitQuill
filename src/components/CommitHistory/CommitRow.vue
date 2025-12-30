
<template>
    <div
        class="row clickable whitespace-nowrap"
        :class="active ? 'active' : '[&:not(:first-child)]:*:text-gray'"
        @click="select"
    >
        <div v-if="commit.hash === 'WORKING_TREE'" class="italic">
            <template v-if="current_operation !== null">
                [{{ current_operation.label }}]
            </template>
            <template v-if="uncommitted_file_count === 0">
                Working tree clean
            </template>
            <template v-else>
                Uncommitted files
                ({{ uncommitted_file_count }})
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
            'commits', 'commit_by_hash', 'selected_commits',
            'current_operation', 'uncommitted_file_count', 'selected_file',
            'setSelectedCommits',
        ],
        props: {
            commit: { type: Object, default: null },
        },
        computed: {
            active() {
                return this.selected_commits.includes(this.commit.hash);
            },
        },
        methods: {
            select(event) {
                if (event.shiftKey && this.selected_commits.length > 0) {
                    let source = this.commit_by_hash[_.last(this.selected_commits)];
                    let target = this.commit;
                    if (target.index < source.index) {
                        [source, target] = [target, source];
                    }
                    const path = [];

                    for (const commit of this.commits) {
                        if (commit.index >= source.index) {
                            path.push(commit);
                        }
                        if (commit.index === target.index) {
                            break;
                        }
                    }
                    if (this.commit !== target) {
                        path.reverse();
                    }
                    this.setSelectedCommits(_.uniq([...this.selected_commits, ..._.map(path, 'hash')]));

                } else if (event.ctrlKey) {
                    this.setSelectedCommits(_.xor(this.selected_commits, [this.commit.hash]));

                } else {
                    this.setSelectedCommits([this.commit.hash]);
                }
            },
        },
    };
</script>
