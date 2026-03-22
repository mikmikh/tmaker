import * as utils from "../utils/utils.js";

export class JBlocksDataBase {
  constructor() {
    this.changes = {};
    this.saved = {};
  }
  at(lpos) {
    const key = utils.jpos2key(lpos);
    if (key in this.saved) {
      return this.saved[key];
    }
    return this.at_(lpos);
  }
  at_(lpos) {
    throw new Error("Not implemented");
  }
  set(lpos, value) {
    const key = utils.jpos2key(lpos);
    const savedValue = this.at(lpos);
    if ((!savedValue && !value) || savedValue !== value) {
      this.changes[key] = true;
    }
    this.saved[key] = value;
  }
  save() {
    this.changes = {};
  }
  clear() {
    this.changes = {};
    this.saved = {};
  }
}
export class JBlocksDataRanges extends JBlocksDataBase {
  constructor(ranges) {
    super();
    this.ranges = ranges;
  }
  at_(lpos) {
    for (const range of this.ranges) {
      const { start, size, value } = range;
      if (utils.checkInside(lpos, start, size)) {
        return value;
      }
    }
    return null;
  }
}
