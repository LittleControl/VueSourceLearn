const compileUtil = {
    getValue(expre, vm) {
        if (expre.trim() === '') {
            return ''
        }
        return expre.split('.').reduce((data, currentVal) => {
            return data[currentVal]
        }, vm.$data)
    },
    getContent(expre, vm) {
        return expre.replace(/\{\{(.*?)\}\}/g, (...args) => {
            return this.getValue(args[1].trim(), vm)
        })
    },
    setVal(expre, vm, inputVal) {
        return expre.split('.').reduce((data, currentVal) => {
            data[currentVal] = inputVal
        }, vm.$data)
    },
    text(node, expre, vm) {
        let value = null
        if (expre.indexOf('{{') !== -1) {
            value = expre.replace(/\{\{(.*?)\}\}/g, (...args) => {
                new Watcher(vm, args[1].trim(), () => {
                    this.updater.textUpdater(node, this.getContent(expre, vm))
                })
                return this.getValue(args[1].trim(), vm)
            })
        } else {
            value = this.getValue(expre, vm)
        }
        this.updater.textUpdater(node, value)
    },
    html(node, expre, vm) {
        const value = this.getValue(expre, vm)
        new Watcher(vm, expre, (newVal) => {
            this.updater.htmlUpdater(node, newVal)
        })
        this.updater.htmlUpdater(node, value)
    },
    model(node, expre, vm) {
        const value = this.getValue(expre, vm)
        //data => view
        new Watcher(vm, expre, (newVal) => {
            this.updater.modelUpdater(node, newVal)
        })
        //view => data => view
        node.addEventListener('input', (e) => {
            this.setVal(expre, vm, e.target.value)
        })
        this.updater.modelUpdater(node, value)
    },
    getEvent(name, vm) {
        return vm.$options.methods[name]
    },
    //value: handlerClick dirEvent: click:
    on(node, value, vm, dirEvent) {
        new Watcher(vm, 'on', (newVal) => {
            this.updater.onUpdater(node, dirEvent, this.getEvent(newVal, vm).bind(vm))
        })
        this.updater.onUpdater(node, dirEvent, this.getEvent(value, vm).bind(vm))
    },
    //value: tips dirEvent: placeholder
    getAttrValue(name, vm) {
        return vm.$data[name]
    },
    bind(node, value, vm, dirEvent) {
        new Watcher(vm, value, () => {
            this.updater.bindUpdater(node, dirEvent, this.getAttrValue(value, vm))
        })
        this.updater.bindUpdater(node, dirEvent, this.getAttrValue(value, vm))
    },
    updater: {
        textUpdater(node, value) {
            node.textContent = value
        },
        htmlUpdater(node, value) {
            node.innerHTML = value
        },
        modelUpdater(node, value) {
            node.value = value
        },
        onUpdater(node, dirEvent, listener, useCapture = false) {
            node.addEventListener(dirEvent, listener, useCapture)
        },
        bindUpdater(node, name, value) {
            node.setAttribute(name, value)
        }
    }
}

class Compile {
    constructor(el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el)
        this.vm = vm
        const fragment = this.node2Fragment(this.el)
        this.compile(fragment)
        this.el.appendChild(fragment)
    }
    compile(fragment) {
        const childNodes = fragment.childNodes;
        [...childNodes].forEach(child => {
            if (this.isElementNode(child)) {
                this.compileElement(child)
            } else {
                this.compileText(child)
            }
            if (child.childNodes && child.childNodes.length) {
                this.compile(child)
            }
        })
    }
    compileElement(node) {
        const attributes = node.attributes;
        [...attributes].forEach(attr => {
            const { name, value } = attr
            if (this.isDirective(name)) {
                const [, directive] = name.split('-')
                const [dirName, dirEvent] = directive.split(':')
                compileUtil[dirName](node, value, this.vm, dirEvent)
                node.removeAttribute('v-' + directive)
            }
            if (this.isEventName(name)) {
                //name: @click
                compileUtil['on'](node, value, this.vm, name.slice(1))
                node.removeAttribute(name)
            }
            if (this.isAttrName(name)) {
                //name: :src
                // console.log(name)
                compileUtil['bind'](node, value, this.vm, name.slice(1))
                node.removeAttribute(name)
            }
        })
    }
    compileText(node) {
        const content = node.textContent
        if (/\{\{(.*?)\}\}/.test(content)) {
            compileUtil['text'](node, content, this.vm)
        }
    }
    isAttrName(name) {
        return name.startsWith(':')
    }
    isEventName(name) {
        //@click
        return name.startsWith('@')
    }
    isDirective(name) {
        return name.startsWith('v-')
    }
    isElementNode(el) {
        return el.nodeType === 1
    }
    node2Fragment(el) {
        const fragment = document.createDocumentFragment()
        let firstChild = null
        while (firstChild = el.firstChild) {
            fragment.appendChild(firstChild)
        }
        return fragment
    }
}

class MyVue {
    constructor(options) {
        this.$el = options.el
        this.$data = options.data
        this.$options = options
        if (this.$el) {
            new Observer(this.$data)
            new Compile(this.$el, this)
            this.proxyData(this.$data)
        }
    }
    proxyData(data) {
        for (const key in data) {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(newVal) {
                    data[key] = newVal
                }
            })
        }
    }
}
