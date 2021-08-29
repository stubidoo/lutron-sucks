const rooms = {
  lounge: 14,
  kitchen: 13,
  bedroom: 16
}

const values = {
  off: 0,
  low: 20,
  high: 100
}

function lights(area, value) {
  fetch(`http://localhost:3000/lights/${rooms[area]}/${values[value]}`)
    .then((response) => response.json())
    .then((data) => console.log(data))
}
