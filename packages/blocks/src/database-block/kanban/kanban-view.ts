// related component

import type { BlockSuiteRoot } from '@blocksuite/lit';
import { ShadowlessElement, WithDisposable } from '@blocksuite/lit';
import type { Text } from '@blocksuite/store';
import { css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { html } from 'lit/static-html.js';

import type { BlockOperation } from '../types.js';
import type { DataViewKanbanManager } from './kanban-view-manager.js';

const styles = css``;

@customElement('affine-data-view-kanban')
export class DataViewKanban extends WithDisposable(ShadowlessElement) {
  static override styles = styles;

  @property({ attribute: false })
  kanbanViewManager!: DataViewKanbanManager;

  @property({ attribute: false })
  blockOperation!: BlockOperation;

  @property({ attribute: false })
  titleText!: Text;

  @property({ attribute: false })
  root!: BlockSuiteRoot;

  @property({ attribute: false })
  modalMode?: boolean;

  override firstUpdated() {
    this._disposables.add(
      this.kanbanViewManager.slots.update.on(() => {
        this.requestUpdate();
      })
    );
  }

  override render() {
    return html` <div class="affine-database-table"></div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-data-view-kanban': DataViewKanban;
  }
}
