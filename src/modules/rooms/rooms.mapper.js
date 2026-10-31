// Response DTO: jawnie wymienione pola, sala razem z budynkiem.
function toRoomResponse(room) {
  return {
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    building: { id: room.building.id, name: room.building.name },
  };
}

module.exports = { toRoomResponse };
