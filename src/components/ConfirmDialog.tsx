'use client';

import { Trash2, X } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmDialog({ title, description, confirmLabel = 'Confirm', onConfirm, onCancel, isLoading }: Props) {
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-body">
          <div className="confirm-ico danger">
            <Trash2 size={20} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>{description}</div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-outline btn-sm" onClick={onCancel} disabled={isLoading}>
            <X size={13} /> Cancel
          </button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={isLoading}>
            <Trash2 size={13} /> {isLoading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
