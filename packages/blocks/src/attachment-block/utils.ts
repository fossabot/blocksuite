import type { BaseBlockModel } from '@blocksuite/store';

import type {
  AttachmentBlockModel,
  AttachmentProps,
} from './attachment-model.js';
import { defaultAttachmentProps } from './attachment-model.js';

// 10MB
export const MAX_ATTACHMENT_SIZE = 10 * 1000 * 1000;

export function cloneAttachmentProperties(
  model: BaseBlockModel<AttachmentBlockModel>
) {
  const clonedProps = {} as AttachmentProps;
  for (const cur in defaultAttachmentProps) {
    const key = cur as keyof AttachmentProps;
    // @ts-expect-error it's safe because we just cloned the props simply
    clonedProps[key] = model[key] as AttachmentProps[keyof AttachmentProps];
  }
  return clonedProps;
}

export async function getAttachment(model: AttachmentBlockModel) {
  const blobManager = model.page.blobs;
  const sourceId = model.sourceId;
  if (!sourceId) return null;

  const blob = await blobManager.get(sourceId);
  if (!blob) return null;
  return blob;
}

const attachmentLoadingMap = new Set<string>();
export function setAttachmentLoading(loadingKey: string, loading: boolean) {
  if (loading) {
    attachmentLoadingMap.add(loadingKey);
  } else {
    attachmentLoadingMap.delete(loadingKey);
  }
}

export function isAttachmentLoading(loadingKey: string) {
  return attachmentLoadingMap.has(loadingKey);
}
