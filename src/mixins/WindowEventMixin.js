
let counter = 0;

export default (event_name, callback_name) => {
    const id = `WindowEventMixin${++counter}`;
    return {
        created() {
            const callback = (...args) => this[callback_name](...args);
            this[`${id}_callback`] = callback;
            window.addEventListener(event_name, callback);
        },
        unmounted() {
            window.removeEventListener(event_name, this[`${id}_callback`]);
        },
    };
};
