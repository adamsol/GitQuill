
let counter = 0;

export default (event_name, callback_name) => {
    const id = `EventMixin${++counter}`;
    return {
        created() {
            const callback = () => this[callback_name]();
            this[`${id}_removeListener`] = electron.addListener(event_name, callback);
        },
        unmounted() {
            this[`${id}_removeListener`]();
        },
    };
};
