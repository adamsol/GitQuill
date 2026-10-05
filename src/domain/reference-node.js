
export class ReferenceNode {
    constructor(data) {
        Object.assign(this, data);
    }

    get is_root() {
        return this.id === undefined;
    }
    get is_group() {
        return this.children !== undefined;
    }
}
