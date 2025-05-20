
<template>
    <div class="max-w-full h-full" :style="{ 'min-width': `${row_height}px` }">
        <canvas ref="canvas" />
    </div>
</template>

<script>
    import colors from '@/theme/colors';

    export default {
        inject: ['commits', 'commit_by_hash'],
        props: {
            row_height: { type: Number, required: true },
            scroll_position: { type: Number, required: true },
        },
        watch: {
            commits() {
                this.draw();
            },
            scroll_position() {
                this.draw();
            },
        },
        mounted() {
            const observer = new ResizeObserver(([entry]) => {
                this.$refs.canvas.height = entry.contentRect.height;
                this.draw();
            });
            observer.observe(this.$el);
        },
        methods: {
            draw() {
                const canvas = this.$refs.canvas;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const size = this.row_height / 2;
                const padding = size / 5;

                let index = Math.floor(Math.max(this.scroll_position - size/2, 0) / this.row_height);
                const first_visible_commit = this.commits[index];
                const commits_to_draw = new Set(_.filter([first_visible_commit]));

                while (index * this.row_height - this.scroll_position < canvas.height && index < this.commits.length) {
                    for (const commit of this.commits[index].running_commits) {
                        commits_to_draw.add(commit);
                        for (const parent_hash of commit.parents) {
                            const parent = this.commit_by_hash[parent_hash];
                            if (parent !== undefined) {
                                commits_to_draw.add(parent);
                            }
                        }
                    }
                    index += 1;
                }
                this.$refs.canvas.width = (_.max(_.map([...commits_to_draw], 'level')) + 1) * (size + padding) + padding;

                const coords = {};
                for (const commit of commits_to_draw) {
                    const x = padding + commit.level * (size + padding) + size/2;
                    const y = (commit.index + 0.5) * this.row_height - this.scroll_position;
                    coords[commit.hash] = [x, y];
                }
                for (const commit of commits_to_draw) {
                    for (const parent_hash of commit.parents) {
                        const commit_coords = coords[commit.hash];
                        const parent_coords = coords[parent_hash];
                        let color_index;

                        ctx.beginPath();
                        ctx.moveTo(...commit_coords);

                        if (parent_coords === undefined) {
                            ctx.lineTo(commit_coords[0], canvas.height);
                        } else {
                            const radius = this.row_height / 4;
                            const dir = Math.sign(commit_coords[0] - parent_coords[0]);

                            if (commit.parents.length === 1) {
                                color_index = commit.level;
                                ctx.lineTo(commit_coords[0], parent_coords[1] - radius);
                                ctx.arcTo(commit_coords[0], parent_coords[1], commit_coords[0] - radius * dir, parent_coords[1], radius);
                            } else {
                                // Merge commit.
                                color_index = this.commit_by_hash[parent_hash].level;
                                ctx.lineTo(parent_coords[0] + radius * dir, commit_coords[1]);
                                ctx.arcTo(parent_coords[0], commit_coords[1], parent_coords[0], commit_coords[1] + radius, radius);
                            }
                            ctx.lineTo(...parent_coords);
                        }
                        ctx.strokeStyle = settings.colors[color_index % settings.colors.length];
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                }
                for (const commit of commits_to_draw) {
                    ctx.fillStyle = settings.colors[commit.level % settings.colors.length];
                    ctx.beginPath();
                    ctx.arc(...coords[commit.hash], commit.parents.length <= 1 ? size/2 : size/3, 0, 2*Math.PI);
                    ctx.fill();

                    if (commit.hash === 'WORKING_TREE') {
                        ctx.fillStyle = colors.gray.dark;
                        ctx.beginPath();
                        ctx.arc(...coords[commit.hash], size/3, 0, 2*Math.PI);
                        ctx.fill();
                    }
                }
            },
        },
    };
</script>
