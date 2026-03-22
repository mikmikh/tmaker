import { operators } from "../libs/obslite/index.js";
import { ACTION_TYPES, selectors } from "../store.js";
import { JElementBuilder } from "../utils/JElementBuilder.js";

class JRoom {
  constructor(name, data) {
    this.name = name;
    this.data = data;
  }
}
export class RRoomGallery {
  constructor(rootEl, store) {
    this.rootEl = rootEl;
    this.store = store;

    this._roomSelectEl = null;
    this._init();

    this.rooms$ = this.store
      .select(selectors.selectRooms)
      .pipe(operators.jdistinct());
    this.roomIdx$ = this.store
      .select(selectors.selectRoomIdx)
      .pipe(operators.jdistinct());

    operators
      .jmerge(this.rooms$, this.roomIdx$)
      .pipe(
        operators.jtap(() => {
          const { rooms, roomIdx } = this.store.state;
          if (!rooms) {
            return;
          }
          this._updateRoomSelect(rooms, roomIdx);
        }),
      )
      .subscribe();
  }

  _init() {
    const selectLabelEl = JElementBuilder.addSelect("room", [], (e) => {
      const name = e.target.value;
      const { rooms } = this.store.state;
      const room = rooms.find((r) => r.name === name);
      this.store.dispatch({ type: ACTION_TYPES.ROOM_SELECT, payload: room });
    });
    this._roomSelectEl = selectLabelEl.querySelector("select");
    this.rootEl.appendChild(selectLabelEl);

    // this.rootEl.appendChild(
    //   JElementBuilder.addButton("save", () => {
    //     this.store.dispatch({type: ACTION_TYPES.ROOM_SAVE});
    //   }),
    // );
    // this.rootEl.appendChild(
    //   JElementBuilder.addButton("add", () => {
    //     this.store.dispatch({type: ACTION_TYPES.ROOM_ADD});
    //   }),
    // );

    // this.rootEl.appendChild(
    //   JElementBuilder.addButton("delete", () => {
    //     this._deleteRoom();
    //   }),
    // );
    // this.rootEl.appendChild(
    //   JElementBuilder.addButton("save", () => {
    //     this.jevents.emit("room-gallery:save");
    //   }),
    // );
    // this.rootEl.appendChild(
    //   JElementBuilder.addButton("rename", () => {
    //     const room = this._getCurrentRoom();
    //     if (!room) {
    //       return;
    //     }
    //     const name = prompt("Room name:", room.name);
    //     if (!name?.trim()) {
    //       return;
    //     }
    //     room.name = name;
    //     this._updateRoomSelect();
    //   }),
    // );
    // this.rootEl.appendChild(
    //   JElementBuilder.addButton("reset", () => {
    //     this.jevents.emit("room-gallery:reset");
    //   }),
    // );
    // this.jevents.on("room-gallery:save:success", (data) => {
    //   const room = this._getCurrentRoom();
    //   if (!room) {
    //     return;
    //   }
    //   room.data = deepCopy(data);
    // });
    // this.jevents.on("room-gallery:select:success", (data) => {
    //   const room = this._getCurrentRoom();
    //   if (!room) {
    //     return;
    //   }
    //   room.data = data;
    // });

    // this._addRoom("room-start");
  }
  _getCurrentRoom() {
    if (this.selectedIdx < 0 || this.selectedIdx >= this.rooms.length) {
      return null;
    }
    return this.rooms[this.selectedIdx];
  }
  _addRoom(name, data = null) {
    const room = new JRoom(name, data);
    this.rooms.push(room);
    this._updateRoomSelect();
    this._selectRoom(room);
    this.jevents.emit("room-gallery:save");
  }
  _selectRoom(room) {
    this._roomSelectEl.value = room?.name;
    this.selectedIdx = this.rooms.indexOf(room);
    this.jevents.emit("room-gallery:select", room);
  }
  _deleteRoom() {
    if (this.selectedIdx < 0 || this.selectedIdx >= this.rooms.length) {
      return;
    }
    const [room] = this.rooms.splice(this.selectedIdx, 1);
    this._updateRoomSelect();
    this.selectedIdx--;
    this._selectRoom(null);
  }
  _updateRoomSelect(rooms, roomIdx) {
    JElementBuilder.updateSelectOptions(
      this._roomSelectEl,
      rooms.map((r) => r.name),
    );
    const room = rooms[roomIdx];
    if (!room) {
      return;
    }
    this._roomSelectEl.value = room.name;
  }
}
