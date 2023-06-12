import { Rectangle } from '@blocksuite/connector';
import { assertExists } from '@blocksuite/global/utils';
import type { PointerEventState } from '@blocksuite/lit';
import { deserializeXYWH, StrokeStyle } from '@blocksuite/phasor';

import type { ConnectorMouseMode } from '../../../__internal__/index.js';
import { noop } from '../../../__internal__/index.js';
import type { Selectable } from '../selection-manager.js';
import { getAttachedPoint, getXYWH, pickBy } from '../utils.js';
import { MouseModeController } from './index.js';

export class ConnectorModeController extends MouseModeController<ConnectorMouseMode> {
  readonly mouseMode = <ConnectorMouseMode>{
    type: 'connector',
  };

  private _connectorId: string | null = null;

  // protected override _draggingArea: SelectionArea | null = null;
  private _draggingStartElement: Selectable | null = null;
  private _draggingStartRect: Rectangle | null = null;
  // must assign value when dragging start
  private _draggingStartPoint!: { x: number; y: number };

  private _pickBy(
    x: number,
    y: number,
    filter: (element: Selectable) => boolean
  ) {
    const { surface } = this._edgeless;
    return pickBy(surface, this._page, x, y, filter);
  }

  onContainerClick(e: PointerEventState): void {
    noop();
  }

  onContainerContextMenu(e: PointerEventState): void {
    noop();
  }

  onContainerDblClick(e: PointerEventState): void {
    noop();
  }

  onContainerTripleClick(e: PointerEventState) {
    noop();
  }

  onContainerDragStart(e: PointerEventState) {
    if (!this._page.awarenessStore.getFlag('enable_surface')) return;

    this._page.captureSync();
    const { viewport } = this._edgeless.surface;
    const { mode, color } = this.mouseMode;

    // create a block when drag start
    const [modelX, modelY] = viewport.toModelCoord(e.x, e.y);

    this._draggingStartElement = this._pickBy(
      e.x,
      e.y,
      ele => ele.type !== 'connector'
    );
    this._draggingStartRect = this._draggingStartElement
      ? new Rectangle(...deserializeXYWH(getXYWH(this._draggingStartElement)))
      : null;

    const { point: startPoint } = getAttachedPoint(
      modelX,
      modelY,
      this._draggingStartRect
    );

    this._draggingStartPoint = startPoint;

    const id = this._surface.addElement('connector', {
      stroke: color,
      mode,
      controllers: [],
      strokeWidth: 2,
      strokeStyle: StrokeStyle.Solid,
      source: this._draggingStartElement
        ? {
            id: this._draggingStartElement.id,
          }
        : {
            position: [modelX, modelY],
          },
    });
    this._connectorId = id;

    // this._draggingArea = {
    //   start: new DOMPoint(e.x, e.y),
    //   end: new DOMPoint(e.x, e.y),
    // };

    this._edgeless.slots.surfaceUpdated.emit();
  }

  onContainerDragMove(e: PointerEventState) {
    if (!this._page.awarenessStore.getFlag('enable_surface')) return;

    assertExists(this._connectorId);
    // assertExists(this._draggingArea);

    const { viewport } = this._edgeless.surface;
    const id = this._connectorId;
    const [endModelX, endModelY] = viewport.toModelCoord(e.x, e.y);
    const end = this._pickBy(
      e.x,
      e.y,
      ele =>
        ele.id !== this._draggingStartElement?.id && ele.type !== 'connector'
    );

    this._surface.updateElement<'connector'>(id, {
      target: end ? { id: end.id } : { position: [endModelX, endModelY] },
    });

    this._edgeless.slots.surfaceUpdated.emit();
  }

  onContainerDragEnd(e: PointerEventState) {
    const id = this._connectorId;
    assertExists(id);

    this._connectorId = null;
    // this._draggingArea = null;

    this._page.captureSync();

    const element = this._surface.pickById(id);
    assertExists(element);
    this._edgeless.selection.switchToDefaultMode({
      selected: [element],
      active: false,
    });
  }

  onContainerMouseMove(e: PointerEventState) {
    noop();
  }

  onContainerMouseOut(e: PointerEventState) {
    noop();
  }

  onPressShiftKey(_: boolean) {
    noop();
  }
}
