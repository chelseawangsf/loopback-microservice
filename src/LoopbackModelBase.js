const MicroserviceError = require('./MicroserviceError');

module.exports = class LoopbackModelBase {
    constructor({ modelName, model }) {
        if (!model) {
            throw LoopbackModelBase.createError(`No Loopback Model Instance was given to the
                LoopbackModelBase constructor`);
        }

        this.modelName = modelName || model.modelName;
        this.loopbackModel = model;


        const functions = this.getPrototypeFunctionsRecursive(this);
        functions.forEach((prototypeFunction, key) => {
            if (!this.loopbackModel[key]) {
                this.loopbackModel[key] = prototypeFunction.bind(this);
            } else {
                throw LoopbackModelBase.createError(`You are overwriting an loopback internal function ${key} on the model ${this.modelName}`);
            }
        });
    }

    /**
     * loops recursively through the given objects prototypes, returns all
     * prototoype functions except 'constructor' and the JavaScript Objects
     * constructor prototype functions
     *
     * @param  {Object} object                  The object to extract prototype functions
     * @param  {Map}    [functions=new Map()]   Map to store the functions
     * @return {Map}                            A map with all prototpye functions
     */
    getPrototypeFunctionsRecursive(object, functions = new Map()) {
        const prototype = Object.getPrototypeOf(object);
        const isLastPrototype = !Object.getPrototypeOf(prototype);

        if (prototype && !isLastPrototype) {
            const properties = Object.getOwnPropertyNames(prototype);
            properties.forEach((propertyName) => {
                const currentProperty = prototype[propertyName];
                if (
                    typeof currentProperty === 'function' &&
                    propertyName !== 'constructor'
                ) {
                    functions.set(propertyName, currentProperty);
                }
            });

            this.getPrototypeFunctionsRecursive(prototype, functions);
        }

        return functions;
    }

    /**
     * register loopback hooks with async functions
     * @param  {String} hook            name of the loopback hook
     * @param  {String} method          loopback method to hook in
     * @param  {Function} hookFunction  hook callback
     * @return void
     */
    registerHook(hook, method, hookFunction, registerContext) {
        this.loopbackModel[hook](method, (...params) => {
            const next = params.pop();

            hookFunction.apply(this, [...params, registerContext])
                .then((stop) => {
                    if (!stop) {
                        next();
                    }
                })
                .catch(next);
        });
    }

    /**
     * Get the loopback environment
     * @return {String} Environment variable
     */
    getEnv() {
        if (!this.appEnv) {
            if (!this.loopbackModel.app) {
                throw LoopbackModelBase.createError(`
                    The loopback application environment could
                    not be loaded because the application was not initalized yet.
                    Therefore not app object is avalialble.
                    Usualy this means you need to call the looback boot function`);
            }

            this.appEnv = this.loopbackModel.app.get('env');
        }

        return this.appEnv;
    }

    /**
     * Create a custom error
     * @param  {String} message error message
     * @return {Error}          loopback error
     */
    static createError(message) {
        return new MicroserviceError(message);
    }
};
