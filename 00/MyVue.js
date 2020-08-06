const compileUtil = {
    getValue(expre, vm) {
        if (expre.trim() === '') {
            return ''
        }
        return expre.split('.').reduce((data, currentVal) => {
            return data[currentVal]
        }, vm.$data)
    },
    text(node, expre, vm) {
        let value = null
        if (expre.indexOf('{{') !== -1) {
            value = expre.replace(/\{\{(.*?)\}\}/g, (...args) => {
                return this.getValue(args[1].trim(), vm)
            })
        } else {
            value = this.getValue(expre, vm)
        }
        this.updater.textUpdater(node, value)
    },
    html(node, expre, vm) {
        const value = this.getValue(expre, vm)
        this.updater.htmlUpdater(node, value)
    },
    model(node, expre, vm) {
        const value = this.getValue(expre, vm)
        this.updater.modelUpdater(node, value)
    },
    updater: {
        textUpdater(node, value) {
            node.textContent = value
        },
        htmlUpdater(node, value) {
            node.innerHtml = value
        },
        modelUpdater(node, value) {
            node.value = value
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
        })
    }
    compileText(node) {
        const content = node.textContent
        if (/\{\{(.*?)\}\}/.test(content)) {
            compileUtil['text'](node, content, this.vm)
        }
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
        }
    }
}
