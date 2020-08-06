class Watcher {
    constructor(vm, expr, cb) {
        this.vm = vm
        this.expr = expr
        this.cb = cb
        this.oldVal = this.getOldVal()
    }
    getOldVal() {
        Dep.target = this
        const oldVal = compileUtil.getValue(this.expr, this.vm)
        Dep.target = null
        return oldVal
    }
    update() {
        const newValue = compileUtil.getValue(this.expr, this.vm)
        if (newValue !== this.oldVal) {
            this.cb(newValue)
        }
    }
}

class Dep {
    constructor() {
        this.subs = []
    }
    addSub(watcher) {
        this.subs.push(watcher)
    }
    notify() {
        console.log('notify watcher', this.subs)
        this.subs.forEach(w => w.update())
    }
}

class Observer {
    constructor(data) {
        this.observe(data)
    }
    observe(data) {
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => {
                this.defineReactive(data, key, data[key])
            })
        }
    }
    defineReactive(obj, key, value) {
        this.observe(value)
        const dep = new Dep()
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: false,
            get() {
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set: (newValue) => {
                this.observe(newValue)
                if (newValue !== value) {
                    value = newValue
                }
                dep.notify()
            }
        })
    }
}
