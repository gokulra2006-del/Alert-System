/**
 * Returns mock GPS positions for campus shuttles
 */
async function getShuttleLocations() {
  return [
    { id: 'Shuttle_1', route: 'Blue Line', lat: 12.8406, lng: 80.1534 },
    { id: 'Shuttle_2', route: 'Red Line', lat: 12.8415, lng: 80.1540 }
  ];
}

module.exports = { getShuttleLocations };
