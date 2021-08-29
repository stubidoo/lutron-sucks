const { exec, spawn } = require("child_process")

// const command1 = "telnet 192.168.1.114"

// exec(command, (error, stdout, stderr) => {
//   if (error) {
//     console.log(`error: ${error.message}`)
//     return
//   }
//   if (stderr) {
//     console.log(`stderr: ${stderr}`)
//     return
//   }
//   console.log(`stdout: ${stdout}`)
// })

// ---------- Spawn

const command2 = "telnet 192.168.1.114"

const ls = spawn("telnet", ["192.168.1.114"])

ls.stdout.on("data", (data) => {
  console.log(`stdout: ${data}`)
})

ls.stderr.on("data", (data) => {
  console.log(`stderr: ${data}`)
})

ls.on("error", (error) => {
  console.log(`error: ${error.message}`)
})

ls.on("close", (code) => {
  console.log(`child process exited with code ${code}`)
})
