
export default (name, default_value) => {
    return {
        data: () => ({
            [name]: electron.store.get(name, default_value),
        }),
        watch: {
            [name]: {
                handler() {
                    // https://github.com/electron/electron/issues/26338
                    const value = JSON.parse(JSON.stringify(this[name]));
                    electron.store.set(name, value);
                },
                deep: true,
            },
        },
    };
};
