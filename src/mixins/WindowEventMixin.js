
let counter = 0;

export default (event_name, callback_name) => {
    const id = `WindowEventMixin${++counter}`;

    function addListener() {
        if (this[`${id}_callback`] === undefined) {
            const callback = (...args) => this[callback_name](...args);
            this[`${id}_callback`] = callback;
            window.addEventListener(event_name, callback);
        }
    }
    function removeListener() {
        if (this[`${id}_callback`] !== undefined) {
            window.removeEventListener(event_name, this[`${id}_callback`]);
            delete this[`${id}_callback`];
        }
    }
    return {
        watch: {
            tab_active() {
                if (this.tab_active) {
                    addListener.call(this);
                } else {
                    removeListener.call(this);
                }
            },
        },
        created() {
            addListener.call(this);
        },
        unmounted() {
            removeListener.call(this);
        },
    };
};
