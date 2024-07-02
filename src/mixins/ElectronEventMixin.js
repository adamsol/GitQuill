
let counter = 0;

export default (event_name, callback_name) => {
    const id = `ElectronEventMixin${++counter}`;

    function addListener() {
        if (this[`${id}_removeListener`] === undefined) {
            const callback = () => this[callback_name]();
            this[`${id}_removeListener`] = electron.addListener(event_name, callback);
        }
    }
    function removeListener() {
        if (this[`${id}_removeListener`] !== undefined) {
            this[`${id}_removeListener`]();
            delete this[`${id}_removeListener`];
        }
    }
    return {
        created() {
            addListener.call(this);
        },
        activated() {
            addListener.call(this);
        },
        deactivated() {
            removeListener.call(this);
        },
        unmounted() {
            removeListener.call(this);
        },
    };
};