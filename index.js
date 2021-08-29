const client = require("./lutronClient.js")
const express = require("express")
const path = require("path")
const app = express()
const { isEmpty } = require("./utils/util")

app.use(express.static("public"))

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/public/index.html"))
})

app.get("/lights/:areaId/:value", function (req, res) {
  const areaId = !isEmpty(req.params.areaId) ? req.params.areaId : null
  const value = !isEmpty(req.params.value) ? req.params.value : null

  if (!isEmpty(client) && areaId && value) {
    client.write(`#OUTPUT,${areaId},1,${value}\r\n`)
    res.json({ success: true })
    // END
    // client.end()
  } else {
    res.send({ success: false })
  }
})

app.get("/end", function (req, res) {
  client.end()
  res.send("End session Success!")
})

app.listen(3000)
