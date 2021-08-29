const net = require("net")

const client = net.connect({ host: "192.168.1.114", port: 23 }, () => {
  console.log("Connected to Lutron!")
  setTimeout(() => {
    client.write("lutron\r\n")
  }, 1000)

  setTimeout(() => {
    client.write("integration\r\n")
  }, 2000)
})

client.on("data", (data) => {
  console.log("RECEIVING TCP RESPONSE -- ")
  console.log(data.toString("ascii"))
})

client.on("end", () => {
  console.log("Disconnected from server!")
})

module.exports = client
