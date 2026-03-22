import * as obslite from "./libs/obslite/index.js";

const initState = {
  sprites: [],
  spriteIdx: null,
  rooms: [],
  roomIdx: null,
};

export const selectors = {
  selectSprites: obslite.store.jcreateSelectorMemo(
    (state) => state.sprites,
    (sprites) => sprites,
  ),
  selectSpriteIdx: obslite.store.jcreateSelectorMemo(
    (state) => state.spriteIdx,
    (spriteIdx) => spriteIdx,
  ),
  selectRooms: obslite.store.jcreateSelectorMemo(
    (state) => state.rooms,
    (rooms) => rooms,
  ),
  selectRoomIdx: obslite.store.jcreateSelectorMemo(
    (state) => state.roomIdx,
    (roomIdx) => roomIdx,
  ),
};

export const ACTION_TYPES = {
  SPRITES_UPDATE: "SPRITES_UPDATE",
  SPRITE_SELECT: "SPRITE_SELECT",
  SPRITE_SAVE: "SPRITE_SAVE",
  SPRITE_ADD: "SPRITE_ADD",
  SPRITE_RENAME: "SPRITE_RENAME",
  SPRITE_DELETE: "SPRITE_DELETE",

  ROOMS_UPDATE: "ROOMS_UPDATE",
  ROOM_SELECT: "ROOM_SELECT",
  ROOM_SAVE: "ROOM_SAVE",
  ROOM_ADD: "ROOM_ADD",
  ROOM_RENAME: "ROOM_RENAME",
  ROOM_DELETE: "ROOM_DELETE",
};

const handlers = {
  [ACTION_TYPES.SPRITES_UPDATE]: (state, { payload }) =>
    obslite.utils.jupdateState(state, { sprites: payload }),
  [ACTION_TYPES.SPRITE_SELECT]: (state, { payload }) =>
    obslite.utils.jupdateState(state, {
      spriteIdx: state.sprites.indexOf(payload),
    }),
  [ACTION_TYPES.ROOMS_UPDATE]: (state, { payload }) =>
    obslite.utils.jupdateState(state, { rooms: payload }),
  [ACTION_TYPES.ROOM_SELECT]: (state, { payload }) =>
    obslite.utils.jupdateState(state, {
      roomIdx: state.rooms.indexOf(payload),
    }),
};

const reducer = obslite.store.jcreateReducer(initState, handlers);

export const store = new obslite.store.JStore(reducer);
