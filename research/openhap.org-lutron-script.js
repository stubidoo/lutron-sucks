#!/usr/bin/env nodejs

// https://community.openhab.org/t/controlling-lutron-homeworks-qs/44140/3

// Lutron/openHAB bridge
// Reconnection logic taken from https://gist.github.com/sio2boss/6334089
// Lutron logic from https://github.com/ceisenach/homeworks_qs_rti_driver/blob/master/lutron_listener.js

const http = require("http")
var net = require("net")
var logger = require("/usr/local/lib/node_modules/nodejslogger")
logger.init({ file: "/var/log/lutron-server.log", mode: "DIE" })

// Lutron processor details - assumed username/password always lutron/integration
var lutronport = 23
var lutronhost = "192.168.1.139"

// openhab details - assumed no username/password within the network
var openHABhost = "192.168.1.53"
var openHABport = "8080"

// Lights device number and openhab item name:
// Note assumes all are two digits
var lightsID = [18, 19, 20, 21, 22, 23, 24, 25, 26, 29, 30, 32, 33, 34, 35, 36]
var lightsname = [
  "fourthspots",
  "stairfloorlights",
  "stairskylights",
  "entryspots",
  "studystrip",
  "studyspots",
  "diningstrip",
  "bookshelfspots",
  "pendants",
  "terrace",
  "island",
  "kitchen",
  "picturespots",
  "westspots",
  "kitchenled",
  "bookshelfled"
]

// Keypad numbers and names
// Note assumes all numbers are two digits!
// Each keypad has two openhab devices - [panel]Button and [panel]LED
// Each is a String. Buttons are momentary events, LEDs are permanent.
// When a button is pressed, openHAB needs to check the LED status
// to know if the button is now on or off
// Note that to avoid creating multiple openHAB items,
// only one LED is registered at any one time - the first one.

var keypadID = [16, 14, 10, 12, 13, 15]
var keypadName = ["TV", "Kitchen", "Blinds", "Lights", "Study", "Fourth"]

// Keypad buttons
var keypadButton = new Array()
var keypadButtonstatus = new Array()

keypadButton[0] = [
  [2, "open"],
  [4, "close"],
  [6, "TVlights"],
  [7, "TVmode"],
  [8, "fireplace"],
  [9, "working"],
  [10, "terrace"],
  [18, "lower"],
  [19, "raise"]
]
keypadButton[1] = [
  [2, "open"],
  [4, "close"],
  [6, "kitchen"],
  [7, "island"],
  [8, "dining"],
  [9, "pendant"],
  [10, "working"],
  [18, "lower"],
  [19, "raise"]
]
keypadButton[2] = [
  [1, "allopen"],
  [2, "Nopen"],
  [3, "open"],
  [4, "TVopen"],
  [5, "doorsopen"],
  [6, "allclose"],
  [7, "Nclose"],
  [8, "Sclose"],
  [9, "TVclose"],
  [10, "doorsclose"],
  [18, "lower"],
  [19, "raise"]
]
keypadButton[3] = [
  [6, "allon"],
  [7, "alloff"],
  [8, "normal"],
  [9, "ambient1"],
  [10, "ambient2"],
  [18, "lower"],
  [19, "raise"]
]
keypadButton[4] = [
  [2, "open"],
  [4, "close"],
  [6, "working"],
  [7, "ambient"],
  [8, "night"],
  [9, "ceiling"],
  [10, "spots"],
  [18, "lower"],
  [19, "raise"]
]
keypadButton[5] = [
  [2, "open"],
  [4, "close"],
  [6, "stairs"],
  [7, "stairsdim"],
  [8, "kitchenvisit"],
  [9, "night"],
  [10, "normal"],
  [18, "lower"],
  [19, "raise"]
]

// Keypad LEDs
// Note on my system LED ID is always button ID plus 80; I don't know if this is always so
var keypadLED = new Array()
var keypadLEDstatus = new Array()
keypadLED[0] = [
  [86, "TVlights"],
  [87, "TVmode"],
  [88, "fireplace"],
  [89, "working"],
  [90, "terrace"]
]
keypadLED[1] = [
  [86, "kitchen"],
  [87, "island"],
  [88, "dining"],
  [89, "pendant"],
  [90, "working"]
]
keypadLED[2] = [
  [81, "allopen"],
  [82, "Nopen"],
  [83, "open"],
  [84, "TVopen"],
  [85, "doorsopen"],
  [86, "allclose"],
  [87, "Nclose"],
  [88, "Sclose"],
  [89, "TVclose"],
  [90, "doorsclose"]
]
keypadLED[3] = [
  [86, "allon"],
  [87, "alloff"],
  [88, "normal"],
  [89, "ambient1"],
  [90, "ambient2"]
]
keypadLED[4] = [
  [86, "working"],
  [87, "ambient"],
  [88, "night"],
  [89, "ceiling"],
  [90, "spots"]
]
keypadLED[5] = [
  [86, "stairs"],
  [87, "stairsdim"],
  [88, "kitchenvisit"],
  [89, "night"],
  [90, "normal"]
]

// Timeout and login flags
var timeout = 1000
var retrying = false
var loginflag = false

//Debounce timer
var lastset = new Array()

// Functions to handle socket events
function makeConnection() {
  logger.info("Making connection")
  socket.connect(lutronport, lutronhost)
  setTimeout(() => {
    socket.write("lutron\r\n")
  }, 1000)
  setTimeout(() => {
    socket.write("integration\r\n")
  }, 2000)
  setTimeout(() => {
    socket.write("#MONITORING,3,1\r\n")
  }, 3000)
  setTimeout(() => {
    synclights(lightsID, 0)
  }, 4000)
  setTimeout(() => {
    syncLEDs(keypadLED, 0, 0)
  }, 10000)
}

// Sync all LED items
// read with ?device,keypad,LED,9
function syncLEDs(arr, i, j) {
  if (i < arr.length) {
    if (j < arr[i].length) {
      setTimeout(function () {
        if (!loginflag) {
          socket.write(
            "?DEVICE," + keypadID[i] + "," + keypadLED[i][j][0] + ",9\r\n"
          )
        } else {
          logger.info("skipping sync because am logging in")
        }
        syncLEDs(arr, i, j + 1)
      }, 250)
    } else {
      syncLEDs(arr, i + 1, 0)
    }
  }
}

// Sync all lights with ?output,device
function synclights(arr, i) {
  if (i < arr.length) {
    setTimeout(function () {
      if (!loginflag) {
        socket.write("?OUTPUT," + String(arr[i]) + "\r\n")
      } else {
        logger.info("skipping sync because am logging in")
      }
      synclights(arr, i + 1)
    }, 250)
  }
}

function regularsync() {
  logger.info("starting regular sync")
  synclights(lightsID, 0)
  setTimeout(() => {
    syncLEDs(keypadLED, 0, 0)
  }, 6000)
}

setInterval(regularsync, 900000)

function FindItem(array, panel, item) {
  for (var i = 0; i < array[panel].length; i++) {
    if (array[panel][i][0] == item) {
      return i // Found it
    }
  }
  return -1 // Not found
}

function FindString(array, panel, item) {
  for (var i = 0; i < array[panel].length; i++) {
    if (array[panel][i][1].toUpperCase() == item.toUpperCase()) {
      return i // Found it
    }
  }
  return -1 // Not found
}

function connectEventHandler() {
  logger.info("connected")
  retrying = false
}

function endEventHandler() {
  logger.error("end")
}
function timeoutEventHandler() {
  logger.error("timeout")
}
function drainEventHandler() {
  logger.error("drain")
}
function errorEventHandler() {
  logger.error("error")
}
function closeEventHandler() {
  logger.info("lost connection")
  loginflag = true
  if (!retrying) {
    retrying = true
    logger.info("Reconnecting...")
  }
  setTimeout(makeConnection, timeout)
}

// Create socket and bind callbacks
var socket = new net.Socket()
socket.on("connect", connectEventHandler)
socket.on("end", endEventHandler)
socket.on("timeout", timeoutEventHandler)
socket.on("drain", drainEventHandler)
socket.on("error", errorEventHandler)
socket.on("close", closeEventHandler)

// Main data processor
// This parses lutron info
socket.on("data", (data) => {
  var lutronoutput = data.toString("ascii")

  //First see if we're logging in (again). If so set 'loginflag' flag
  //So we don't risk interrupting login with commands
  if (lutronoutput.substr(0, 5) == "login") {
    logger.info("Login prompt detected")
    loginflag = true

    // Upon successful login, clear 'loginflag' flag
  } else if (lutronoutput.substr(0, 4) == "QNET") {
    if (loginflag) {
      logger.info("Successfully logged in")
      loginflag = false
    }

    // Just in case something interrupts logging in
    // Detect it and then reconnect
  } else if (lutronoutput.substr(0, 8) == "Too many") {
    logger.info("Login error detected")
    loginflag = true
    if (!retrying) {
      retrying = true
      logger.info("Reconnecting...")
    }
    setTimeout(makeConnection, timeout)

    // Parse "output" info from Lutron lights
  } else if (lutronoutput.substr(0, 7) == "~OUTPUT") {
    var readID = lutronoutput.substr(8, 2)
    var readvalue = lutronoutput.substring(13, lutronoutput.length)

    //    logger.info("Have parsed Lutron output to ID " + readID + ", value " + parseInt(readvalue) + " - compared with old " + parseInt(lastset[readID]))

    if (parseInt(lastset[readID]) == parseInt(readvalue)) {
      //     logger.info("(ignoring bounceback of my own update)")
    } else {
      lastset[readID] = readvalue
      var i = lightsID.findIndex((k) => k == readID)

      if (i != -1) {
        logger.info("Updating OH light " + lightsname[i] + " to: " + readvalue)
        http.get(
          "http://" +
            openHABhost +
            ":" +
            openHABport +
            "/classicui/CMD?" +
            lightsname[i] +
            "=" +
            readvalue
        )
      } else {
        logger.info("Unknown ~OUTPUT received: " + lutronoutput)
      }
    }

    //  Parse "device" info from Lutron LEDs
  } else if (
    lutronoutput.substr(0, 7) == "~DEVICE" &&
    lutronoutput.substr(13, 3) == ",9,"
  ) {
    var readID = lutronoutput.substr(8, 2)
    var readLED = lutronoutput.substr(11, 2)

    //  Find keypad ID
    var i = keypadID.findIndex((k) => k == readID)

    //  Find LED name
    var j = FindItem(keypadLED, i, readLED)

    if (j == -1) {
      logger.info("Unknown ~DEVICE received: " + lutronoutput)
    } else {
      logger.info(
        "Updating OH LED on keypad" +
          keypadName[i] +
          ", " +
          keypadLED[i][j][1] +
          " to " +
          lutronoutput.substr(16, 1)
      )
      //  If LED is on then update openHAB
      if (lutronoutput.substr(16, 1) == 1) {
        http.get(
          "http://" +
            openHABhost +
            ":" +
            openHABport +
            "/classicui/CMD?" +
            keypadName[i] +
            "LED=" +
            keypadLED[i][j][1]
        )
        keypadLEDstatus[i] = keypadLED[i][j][1]

        //      If LED is off then clear it
      } else {
        if (keypadLEDstatus[i] == keypadLED[i][j][1]) {
          http.get(
            "http://" +
              openHABhost +
              ":" +
              openHABport +
              "/classicui/CMD?" +
              keypadName[i] +
              "LED="
          )
          keypadLEDstatus[i] = ""
        }
      }
    }

    //  Parse "device" info from keypad buttons
  } else if (
    lutronoutput.substr(0, 7) == "~DEVICE" &&
    lutronoutput.substr(12, 2) == ",3"
  ) {
    var readID = lutronoutput.substr(8, 2)
    var readbutton = lutronoutput.substr(11, 2).replace(/,/g, "")

    //  Find keypad ID
    var i = keypadID.findIndex((k) => k == readID)

    //  Find Button name
    var j = FindItem(keypadButton, i, readbutton)

    if (j == -1) {
      logger.info("Unknown ~DEVICE received: " + lutronoutput)
    } else {
      if (keypadButtonstatus[i] == keypadButton[i][j][1]) {
        logger.info(
          "Won't update OH keypad button as command originated from OH"
        )
        keypadButtonstatus[i] = ""
      } else {
        logger.info(
          "Updating OH keypad" +
            keypadName[i] +
            ", button " +
            keypadButton[i][j][1]
        )
        http.get(
          "http://" +
            openHABhost +
            ":" +
            openHABport +
            "/classicui/CMD?" +
            keypadName[i] +
            "Keypad=" +
            keypadButton[i][j][1]
        )
        keypadButtonstatus[i] = keypadButton[i][j][1]
      }
    }
  } else {
    //  This is a case where there is currently no parsing logic
    logger.info("Received: " + lutronoutput)
  }
})

// Now connect
console.log("Starting server and telnet connection.")
console.log("Log running in /var/log/lutron-server.log")
logger.info("Connecting to " + lutronhost + ":" + lutronport + "...")
makeConnection()

// Code for server, receiving requests from openhab exec binding
// accepts urls in the format http://house/ID/value - where ID must be two digits
// example to turn study lights on:            curl "house:3000/L/23/100"
//         to push TV blinds close button      curl "house:3000/B/50"
//         to push "night" button on keypad 16 curl "house:3000/K/16/night"
// So far seems to respond as quickly as openhab can throw commands at it

// If your system has one or three digit IDs then will need to be changed

const port = 3000
const requestHandler = (request, response) => {
  //  If am in the middle of re-logging in then delay execution of commands by five seconds
  var delay = 0
  if (loginflag) {
    logger.info("As login in progress, will delay response by 5s")
    delay = 5000
  }

  //  We always get a request for "favicon.ico" - discard this
  if (request.url != "/favicon.ico") {
    //    Detect and parse command to operate blinds
    if (request.url.substr(0, 3) == "/B/") {
      var devID = request.url.substr(3, 2)
      logger.info("Pushing to Lutron, signal to blinds ID " + devID)
      setTimeout(() => {
        socket.write("#OUTPUT," + devID + ",6\r\n")
      }, 50 + delay)

      //    Detect and parse command to push button
    } else if (request.url.substr(0, 3) == "/K/") {
      var devID = request.url.substr(3, 2)
      var devname = request.url.substring(6, request.url.length)
      var i = keypadID.findIndex((k) => k == devID)
      var devButton = FindString(keypadButton, i, devname)

      if (devButton == -1) {
        logger.info("Unknown button requested: " + lutronoutput)
      }

      if (keypadButtonstatus[i] == devname) {
        logger.info(
          "Won't push keypad button to Lutron as this was read from Lutron"
        )
        keypadButtonstatus[i] = ""
      } else {
        logger.info(
          "Pushing to Lutron, keypad " +
            devID +
            " to " +
            keypadButton[i][devButton][0] +
            ": " +
            devname
        )
        setTimeout(() => {
          socket.write(
            "#DEVICE," + devID + "," + keypadButton[i][devButton][0] + ",3\r\n"
          )
        }, 50 + delay)
        keypadButtonstatus[i] = devname
      }

      //    Detect and parse commands to operate light
    } else if (request.url.substr(0, 3) == "/L/") {
      var devID = request.url.substr(3, 2)
      var devvalue = request.url.substring(6, request.url.length)

      if (parseInt(lastset[devID]) == parseInt(devvalue)) {
        //            logger.info("(ignoring bounceback from my own update)")
      } else {
        lastset[devID] = devvalue
        logger.info(
          "Pushing to Lutron, set lights ID " + devID + " to value " + devvalue
        )
        setTimeout(() => {
          socket.write("#OUTPUT," + devID + ",1," + devvalue + ",5,3\r\n")
        }, 50 + delay)
      }

      //     Ooops - some other command was received
    } else {
      logger.info("Unrecognised command received: " + request.url.substr(0, 3))
    }

    response.end("Lutron house server. See commands in comments")
  }
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return logger.info("Unknown error", err)
  }

  logger.info(`Lutron/openHAB bridge server is listening on ${port}`)
})
