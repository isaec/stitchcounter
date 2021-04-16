if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js")

class Counter {
    constructor() {
        this.element = document.getElementById("countNumber")

        //load increment or set it to 1
        this.increment = (parseInt(localStorage.increment) || 1)

        //make the stitches array or load it from storage
        this.stitches = JSON.parse(localStorage.stitches || false) || [this.number]

        //load current row number from storage or set it to zero
        this.number = (parseInt(localStorage.cRowStitches) || 0)
    }

    get number() { return this._number }
    set number(value) {
        value = Math.max(0, value) //clamp values
        //disable remove button if value is zero
        removeButton.disabled = value == 0
        //display the new value on screen
        this.element.textContent = value
        //store the new value
        this._number = value
        //store to localstorage
        localStorage.cRowStitches = value
        //write the new value to the newest row
        this.stitches[this.stitches.length - 1] = value
        //update the table to show the value
        this.syncTable()
    }

    get increment() { return this._increment }
    set increment(value) {
        //store the new value
        this._increment = value
        localStorage.increment = value
        //update the onscreen buttons
        this.fixMods()
    }

    fixMods() {
        //enable all buttons
        valMod.forEach((i) => elementArray[i].disabled = false)
        //disable the button that corresponds to the increment
        elementArray[valMod[this._increment]].disabled = true
    }
    syncTable(scroll = false) {
        //store the table to localstorage
        localStorage.stitches = JSON.stringify(this.stitches)
        //ensure we have enough rows to show all our data
        while (stitchTable.rows.length - 1 < this.stitches.length) {
            let row = stitchTable.insertRow(-1)
            row.insertCell(0).textContent = stitchTable.rows.length - 1
            row.insertCell(1).textContent = 0
        }
        //update every row to be equal to the array value
        this.stitches.forEach((stitches, index) => {
            stitchTable.rows[index + 1].cells[1].textContent = stitches
            //if we need to scroll and are on the final row, scroll it into view
            if (scroll && index === this.stitches.length - 1) stitchTable.rows[index + 1].scrollIntoView()
        })
    }
    newRow() {
        this.stitches.push(0) //add element to the array
        this.syncTable(true) //sync it to the onscreen table, and scroll it into view
        this.number = 0 //reset current row
    }
    reset() {
        //dont proceed if the popup is canceled
        if (!confirm("all rows, stitches and other data will be cleared.\nproceed?")) return
        //clear localstorage data
        localStorage.clear()
        //reset values to default
        this.stitches = [0]
        this.number = 0
        this.increment = 1
        //delete all the rows in the onscreen table, leaving the labels
        while (stitchTable.rows.length > 1) stitchTable.deleteRow(1)
        this.syncTable()
    }
}

//get all the html elements, and init the counter object
let elementArray = [], valMod = [, 2, , 3, , 4, , , , , 5]
    ;["addButton", "removeButton", "mod1", "mod3", "mod5", "mod10", "mainBlock", "countBlock", "stitchTable", "newRow", "reset"]
        .forEach(id => elementArray.push(document.getElementById(id)))
let [addButton, removeButton, mod1, mod3, mod5, mod10, mainBlock, countBlock, stitchTable, newRow, reset] = elementArray,
    count = new Counter()

//function to add event listener to element
//this function will be made into single char by terser
// const addEL = (element, ev, fn) => {
//     element.addEventListener(ev, fn)
// }

//add all the event listeners
addButton.addEventListener("click", () => count.number += count.increment)
removeButton.addEventListener("click", () => count.number -= count.increment)

newRow.addEventListener("click", () => count.newRow())
reset.addEventListener("click", () => count.reset())

mod1.addEventListener("click", () => { mod1.disabled = true; count.increment = 1 })
for (let i = 2; i <= 5; i++) { //add the listeners for mod buttons programatically using element array
    elementArray[i].addEventListener("click", () => count.increment = [1, 3, 5, 10][i - 2])
}

// add eventlistener to handle keyboard input
// document.addEventListener("keydown", ev => {
//     ({
//         Space: addButton,
//         ArrowUp: addButton,
//         ArrowDown: removeButton,
//     }[ev.code]).click()
// })

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
window.addEventListener("resize", fixOrder)
window.addEventListener("load", fixOrder)