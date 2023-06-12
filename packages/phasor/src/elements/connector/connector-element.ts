import { assertExists } from '@blocksuite/global/utils.js';
import type { RoughCanvas } from 'roughjs/bin/canvas.js';

import { DEFAULT_ROUGHNESS, StrokeStyle } from '../../consts.js';
import {
  Bound,
  inflateBound,
  transformPointsToNewBound,
} from '../../utils/bound.js';
import type { IVec } from '../../utils/vec.js';
import { SurfaceElement } from '../surface-element.js';
import type { IConnector } from './types.js';
import { ConnectorMode } from './types.js';
import { getArrowPoints, getConnectorPointsBound } from './utils.js';

export class ConnectorElement extends SurfaceElement<IConnector> {
  get mode() {
    return this.yMap.get('mode') as IConnector['mode'];
  }

  get strokeWidth() {
    return this.yMap.get('strokeWidth') as IConnector['strokeWidth'];
  }

  get stroke() {
    return this.yMap.get('stroke') as IConnector['stroke'];
  }

  get strokeStyle() {
    return this.yMap.get('strokeStyle') as IConnector['strokeStyle'];
  }

  get roughness() {
    return (
      (this.yMap.get('roughness') as IConnector['roughness']) ??
      DEFAULT_ROUGHNESS
    );
  }

  get target() {
    return this.yMap.get('target') as IConnector['target'];
  }

  get source() {
    return this.yMap.get('source') as IConnector['source'];
  }

  get controllers() {
    return this.yMap.get('controllers') as IConnector['controllers'];
  }

  private _getConnectionPoint(type: 'source' | 'target') {
    const connection = this[type];
    let point: IVec = [];
    if (connection.id) {
      const ele = this.surface?.pickById(connection.id);
      assertExists(ele);
      if (!connection.position) {
        // point = ele.getNearestPoint(this)
      } else {
        point = Bound.deserialize(ele.xywh).getRelativePoint(
          connection.position
        );
      }
    } else {
      point = connection.position as IVec;
    }
    return point;
  }

  override render(ctx: CanvasRenderingContext2D, rc: RoughCanvas) {
    const { seed, strokeStyle, stroke, roughness, strokeWidth, controllers } =
      this;
    const realStrokeColor = this.computedValue(stroke);

    const sourcePoint: IVec = [];

    if (this.mode === ConnectorMode.Orthogonal) {
      rc.linearPath(
        controllers.map(controller => [controller.x, controller.y]),
        {
          seed,
          roughness,
          strokeLineDash:
            strokeStyle === StrokeStyle.Dashed ? [12, 12] : undefined,
          stroke: realStrokeColor,
          strokeWidth,
        }
      );
    } else {
      rc.linearPath(
        [
          [controllers[0].x, controllers[0].y],
          [
            controllers[controllers.length - 1].x,
            controllers[controllers.length - 1].y,
          ],
        ],
        {
          seed,
          roughness,
          strokeLineDash:
            strokeStyle === StrokeStyle.Dashed ? [12, 12] : undefined,
          stroke: realStrokeColor,
          strokeWidth,
        }
      );
    }

    const last = this.controllers[this.controllers.length - 1];
    const secondToLast = this.controllers[this.controllers.length - 2];

    //TODO: Adjust arrow direction
    const { sides, end } = getArrowPoints(
      [secondToLast.x, secondToLast.y],
      [last.x, last.y],
      35
    );
    rc.linearPath(
      [
        [sides[0][0], sides[0][1]],
        [end[0], end[1]],
        [sides[1][0], sides[1][1]],
      ],
      {
        seed,
        roughness,
        strokeLineDash:
          strokeStyle === StrokeStyle.Dashed ? [12, 12] : undefined,
        stroke: realStrokeColor,
        strokeWidth,
      }
    );
  }

  override applyUpdate(props: Partial<IConnector>) {
    const updates = { ...props };

    const { controllers, xywh } = props;
    if (controllers?.length) {
      const lineWidth = props.strokeWidth ?? this.strokeWidth;
      const bound = getConnectorPointsBound(controllers);
      const boundWidthLineWidth = inflateBound(bound, lineWidth);
      const relativeControllers = controllers.map(c => {
        return {
          ...c,
          x: c.x - boundWidthLineWidth.x,
          y: c.y - boundWidthLineWidth.y,
        };
      });
      updates.controllers = relativeControllers;
      updates.xywh = boundWidthLineWidth.serialize();
    }

    if (xywh) {
      const { strokeWidth } = this;
      const bound = Bound.deserialize(xywh);
      const transformed = transformPointsToNewBound(
        this.controllers,
        this,
        strokeWidth / 2,
        bound,
        strokeWidth / 2
      );

      updates.controllers = transformed.points;
      updates.xywh = transformed.bound.serialize();
    }

    // if (props.strokeWidth && props.strokeWidth !== this.strokeWidth) {
    //   const bound = updates.xywh ? Bound.deserialize(updates.xywh) : this;
    //   const controllers = updates.controllers ?? this.controllers;
    //   const transformed = transformPointsToNewBound(
    //     controllers,
    //     bound,
    //     this.strokeWidth / 2,
    //     inflateBound(bound, props.strokeWidth - this.strokeWidth),
    //     props.strokeWidth / 2
    //   );

    //   updates.controllers = transformed.points;
    //   updates.xywh = transformed.bound.serialize();
    // }

    for (const key in updates) {
      this.yMap.set(
        key,
        updates[key as keyof IConnector] as IConnector[keyof IConnector]
      );
    }
  }
}
