if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js")

//make localstorage access take less charecters
const l = localStorage

//safari is really stupid and doesnt support this feature that everyone else does
//so we need to catch the error here if the user is on safari/IE
let sync, tabChannel
try {
    //make or join the broadcast channel so pages can stay synced
    sync = new BroadcastChannel("sync")
    tabChannel = new BroadcastChannel("tab")
} catch {
    sync = false
    tabChannel = false
}


//function to add event listener to element
//this function will be made into single char by terser
const addEl = (element, fn, ev = "click") => {
    element.addEventListener(ev, fn)
}

const version = "stitchcounter-v1.2.2"


class Counter {
    constructor() {
        //get the counters array or make it
        this._counters = JSON.parse(l.counters || '[{"name":"default","increment":1,"stitches":[0]}]')
        this._index = 0

        //handle data migration
        if (l.stitches || l.increment) {
            this.counters[0].increment = parseInt(l.increment)
            this.counters[0].stitches = JSON.parse(l.stitches)
            delete l.stitches
            delete l.increment
            delete l.cRowStitches
            console.log("old data migrated")
        }

        //make the tabs
        this.tabs = []
        this._counters.forEach(counter => this.makeTab(counter.name))
        this.tabs[0].disabled = true

        //sync all this data to the display and the storage
        this.sync(true, true)
    }

    get index() { return this._index }
    set index(value) {
        this._index = value
        //if we don't sync storage we risk not storing new tab
        this.sync(true, true)
    }

    get counters() { return this._counters }
    set counters(value) { this._counters = value; this.sync() }

    get counter() { return this.counters[this.index] }
    set counter(value) { this.counters[this.index] = value }

    get stitches() { return this.counter.stitches }
    set stitches(value) { this.counter.stitches = value; this.sync(false) }


    get number() { return this.stitches[this.stitches.length - 1] }
    set number(value) {
        value = Math.max(0, value) //clamp values
        //store the new value
        this.stitches[this.stitches.length - 1] = value
        //show the new value
        this.sync(false)
    }

    get increment() { return this.counter.increment }
    set increment(value) {
        //store the new value
        this.counter.increment = value
        //update the onscreen buttons
        this.sync()
    }

    sync(mod = true, scroll = false, post = true) {
        console.log("sync")
        //write to storage
        l.counters = JSON.stringify(this.counters)
        //alert any other tabs to update their data
        if (post && sync) sync.postMessage(this.counters)

        //disable buttons if they shouldnt be used
        //if value is zero, dont remove
        removeButton.disabled = this.number == 0
        //if there is only one tab, dont remove
        removeTab.disabled = this.tabs.length <= 1
        //if there is only one row, dont remove it
        removeRow.disabled = this.stitches.length <= 1

        //display the new value on screen
        countNumber.textContent = this.number

        //sync the mods
        if (mod) {
            //enable all buttons
            valMod.forEach((i) => elementArray[i].disabled = false)
            //disable the button that corresponds to the increment
            elementArray[valMod[this.increment]].disabled = true
        }

        //sync the table
        //ensure we have the correct number rows to show all our data
        if (stitchTable.rows.length - 1 !== this.stitches.length) {
            while (stitchTable.rows.length - 1 < this.stitches.length) {
                let row = stitchTable.insertRow(-1)
                row.insertCell(0).textContent = stitchTable.rows.length - 1
                row.insertCell(1).textContent = 0
            }
            while (stitchTable.rows.length - 1 > this.stitches.length) {
                stitchTable.deleteRow(stitchTable.rows.length - 1)
            }
        }
        //update every row to be equal to the array value
        this.stitches.forEach((stitches, index) => {
            stitchTable.rows[index + 1].cells[1].textContent = stitches
            //if we need to scroll and are on the final row, scroll it into view
            if (scroll && index === this.stitches.length - 1) stitchTable.rows[index + 1].scrollIntoView()
        })
    }

    shiftMods(value) {
        this.increment = mods[mods.indexOf(this.increment) + value] || this.increment
    }
    newRow() {
        this.stitches.push(0) //add element to the array
        this.sync(false, true) //sync it to the onscreen table, and scroll it into view
        this.number = 0 //reset current row
    }
    makeTab(name) {
        let tab = document.createElement("button")
        tab.className = "tab noselect"
        tab.textContent = name
        addEl(tab, () => {
            this.enableAllTabs()
            tab.disabled = true
            //its faster on v8 to set one value twice then to compare for every value )=
            this.setCounter(name)
        })
        this.tabs.push(titleBlock.insertBefore(tab, newTab))
        return tab
    }
    enableAllTabs() {
        //enable all tabs
        this.tabs.forEach(tab => tab.disabled = false)
    }
    deleteTab(index) {
        count.tabs[index].remove()
        count.tabs.splice(index, 1)
        if (count._index >= index) {
            count._index = Math.max(count._index - 1, 0)
            this.enableAllTabs()
            count.tabs[count.index].disabled = true
            count.sync(true, true, false)
        }
    }
    setCounter(name) {
        this.counters.some(
            (counter, index) => {
                if (counter.name === name) {
                    this.index = index
                    return true
                }
            }
        )
    }
    visualTabReset() {
        this.tabs.forEach(tab => tab.remove())
        this.tabs = [] //no need to delete the reference one at a time
        this.makeTab("default").disabled = true
        this._index = 0
    }
    reset() {
        //dont proceed if the popup is canceled
        if (!confirm("all rows, stitches and other data in all counters will be cleared.\nproceed?")) return
        //clear localstorage data
        l.clear()
        //reset values to default
        if(tabChannel) tabChannel.postMessage(["r"])
        this.visualTabReset()
        this.counters = [{ name: "default", increment: 1, stitches: [0] }]
        //no need to show the first user help
        l.lversion = version
    }
}

//get all the html elements, and init the counter object
let elementArray = [], valMod = [, 2, , 3, , 4, , , , , 5], mods = [1, 3, 5, 10]
    ;["addButton", "removeButton", "mod1", "mod3", "mod5", "mod10", "mainBlock", "countBlock", "stitchTable", "newRow", "reset", "titleBlock", "newTab", "options", "optionsDiv", "removeTab", "removeRow", "countNumber", "help", "toggleTab", "helpModal", "closeHelp"]
        .forEach(id => elementArray.push(document.getElementById(id)))
let [addButton, removeButton, mod1, mod3, mod5, mod10, mainBlock, countBlock, stitchTable, newRow, reset, titleBlock, newTab, options, optionsDiv, removeTab, removeRow, countNumber, help, toggleTab, helpModal, closeHelp] = elementArray,
    count = new Counter()

//listen for sync events and sync them
if(sync) sync.onmessage = ev => {
    console.log("message with data to sync!")
    count._counters = ev.data
    count.sync(true, false, false)
}

if(tabChannel) tabChannel.onmessage = ev => {
    console.log("message with tab information!", ev.data)
    switch (ev.data[0]) {
        case "r": count.visualTabReset(); break
        case "m": count.makeTab(ev.data[1]); break
        case "d": count.deleteTab(ev.data[1])
    }
}

//add all the event listeners
addEl(addButton, () => count.number += count.increment)
addEl(removeButton, () => count.number -= count.increment)

//method to toggle the flex/none state of target element
const toggleFlex = element => element.style.display = element.style.display === "flex" ? "none" : "flex"

//method to toggle one element on the click of another
const toggleFlexOnClick = (button, element) => addEl(button, () => toggleFlex(element))

//show the help screen if it's users first visit / just updated
if (l.lversion !== version) {
    toggleFlex(helpModal)
    l.lversion = version
}

addEl(newRow, () => count.newRow())

toggleFlexOnClick(options, optionsDiv)

titleBlock.style.display = "flex" //adds the style to the html so we can see its state
toggleFlexOnClick(toggleTab, titleBlock)

toggleFlexOnClick(help, helpModal)
toggleFlexOnClick(closeHelp, helpModal)

addEl(helpModal, e => {
    if (e.target === helpModal) toggleFlex(helpModal)
}, "mousedown")

addEl(removeRow, () => {
    if (!confirm(`the newest row in ${count.counter.name} will be removed.\nproceed?`)) return
    count.stitches.pop()
    /*
    methods that operate on the actual array, in place, like pop dont
    seem to trigger set function, so we need to call sync ourselves
    */
    count.sync(false)
})

addEl(removeTab, () => {
    if (!confirm(`all rows, stitches and other data in ${count.counter.name} will be cleared.\nproceed?`)) return
    let i = count.index
    count.counters.splice(i, 1)
    count.deleteTab(count.index)
    if(tabChannel) tabChannel.postMessage(["d", i])

})

addEl(reset, () => count.reset())

addEl(newTab, () => {
    let name = prompt(
        "name your new counter\nnames cannot be reused, and will display in all lowercase",
        `default${count.counters.length + 1}`
    )
    if (name === "" || name === null) return
    name = name.toLowerCase()
    if (count.counters.some(counter => counter.name === name)) {
        alert("name is already in use")
        return
    }
    count.counters.push({ name: name, increment: 1, stitches: [0] })
    count.makeTab(name).click()
    if(tabChannel) tabChannel.postMessage(["m", name])
})

for (let i = 2; i <= 5; i++) { //add the listeners for mod buttons programatically using element array
    addEl(elementArray[i], () => count.increment = mods[i - 2])
}

// add eventlistener to handle keyboard input
addEl(document, ev => {
    if (ev.repeat) return
    console.log(ev.code)
    let handled = true
    switch (ev.code) {
        case "Space":
        case "ArrowUp":
            addButton.click()
            break
        case "ArrowRight":
            count.shiftMods(1)
            break
        case "ArrowLeft":
            count.shiftMods(-1)
            break
        case "ArrowDown":
            removeButton.click()
            break
        default:
            handled = false
    }
    if (handled) ev.preventDefault()
}, "keydown")

//window managment
const fixOrder = () => {
    if (document.body.clientWidth <= document.body.clientHeight) {
        if ((mainBlock.style.flexDirection || "row") === "row") {
            mainBlock.style.flexDirection = "column-reverse"
            countBlock.style["flex-grow"] = 1
        }
    } else {
        if ((mainBlock.style.flexDirection || "column-reverse") === "column-reverse") {
            mainBlock.style.flexDirection = "row"
            countBlock.style["flex-grow"] = 3
        }
    }
}
addEl(window, fixOrder, "resize")
addEl(window, fixOrder, "load")