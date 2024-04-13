
export default (name, default_value) => {
    const internal_name = `internal_${name}`;
    return {
        data: () => ({
            [internal_name]: electron.store.get(name, default_value),
        }),
        computed: {
            [name]: {
                get() {
                    return this[internal_name];
                },
                set(value) {
                    this[internal_name] = value;
                    electron.store.set(name, value);
                },
            },
        },
    };
};
