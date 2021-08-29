const rooms = {
  lounge: 14,
  kitchen: 13,
  bedroom: 16,
  hallway: 12
}

const values = {
  off: 0,
  low: 20,
  high: 100
}

function lights(area, value) {
  fetch(`/lights/${rooms[area]}/${values[value]}`)
    .then((response) => response.json())
    .then((data) => console.log(data))
}

// PWA

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").then(
      (registration) => {
        console.log(
          `ServiceWorker registration successful with scope: ${registration.scope}`
        )
      },
      (error) => {
        console.log(`ServiceWorker registration failed: ${error}`)
      }
    )
  })
}
