import { operators } from "../libs/obslite/index.js";
import { ACTION_TYPES, selectors } from "../store.js";
import { JElementBuilder } from "../utils/JElementBuilder.js";

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

    this.rootEl.appendChild(
      JElementBuilder.addButton("make first", () => {
        // TODO: add confirm
        const { rooms, roomIdx } = this.store.state;
        const room = rooms[roomIdx];
        if (!room) {
          return;
        }
        const newRooms = [room, ...rooms.filter(r=>r!==room)];
        this.store.dispatch({ type: ACTION_TYPES.ROOMS_UPDATE, payload: newRooms });
        this.store.dispatch({ type: ACTION_TYPES.ROOM_SELECT, payload: room });
      }),
    );
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
