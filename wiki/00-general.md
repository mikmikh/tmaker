# General Outline

Simple 2d game maker:
- create rooms (stores player sprite, tiles, objects, actions for cells)
- place tiles (background: floor tiles)
- place sprites  (characters: plants, objects, entities)
- add actions for cells (to run when player moves to the tile with objects)
- actions: message, transition (to room)
- sprites and tiles play animation each frame (16x16 px each sprite)
- can draw or load own sprites

## Parts

1. Room select
2. Tiles select
3. Sprties select
4. Image editor (canvas with drawing and resizing)
5. 

```mermaid
classDiagram
    Sprite *-- SpriteGallery
    Sprite o-- SpriteEditor
    TCanvas <-- SpriteEditor
    SpriteEditor <-- SpriteGallery
    Room *-- RoomGallery
    TCanvas <-- RoomEditor
    Room o-- RoomEditor
    SpriteGallery <-- RoomEditor
    RoomEditor <-- RoomGallery
    Cell *-- Room
    
    class Sprite {
        name: string;
        img: HTMLElement;
    }
    class SpriteGallery {
        sprites: Sprite[];
        selectedIdx: number;
        onEdit: fn;

        _init()
        _selectSprite(idx)
        _handleEdit()
        _handleAdd()
        _handleDelete(idx)
    }

    class SpriteEditor {
        sprite?: Sprite;

        _init()

        setSprite(sprite)
        save()
        download()
        upload()
    }
    class Cell {
        tile?: string;
        sprite?: string;
        message?: string;
        transition?: string;
    }
    class Room {
        size: [number,number];
        data: Cell[][];
    }
    class RoomEditor {
        room?: Room;

        _init()
        setRoom(room);
    }
    class RoomGallery {
        rooms: Room[];
        selectedIdx: number;

        _init();
        _selectRoom(idx);
        _handleEdit();
        _handleAdd();
        _handleRemove();
    }
    class TCanvas {
        size: [number,number]
    }

```