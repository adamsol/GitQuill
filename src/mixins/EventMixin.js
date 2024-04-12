
export default (event_name, callback_name) => {
    let callback;
    let removeListener;

    return {
        created() {
            callback = () => this[callback_name]();
            removeListener = electron.addListener(event_name, callback);
        },
        unmounted() {
            removeListener();
        },
    };
};
