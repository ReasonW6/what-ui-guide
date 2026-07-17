"use client";

import { useEffect, useRef, type RefObject } from "react";
import { IdentificationWorkspace } from "./IdentificationWorkspace";
import "./identification-dialog.css";

type IdentificationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export function IdentificationDialog({
  open,
  onOpenChange,
  triggerRef,
}: IdentificationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => closeRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      aria-labelledby="identify-title"
      className="identification-dialog"
      id="identification-dialog"
      onClose={() => {
        onOpenChange(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }}
      ref={dialogRef}
    >
      {open && (
        <div className="identification-dialog-frame">
          <div className="identification-dialog-toolbar">
            <h2 className="sr-only" id="identify-title">AI 视觉识别</h2>
            <button
              aria-label="关闭 AI 识别"
              className="identification-dialog-close"
              onClick={() => dialogRef.current?.close()}
              ref={closeRef}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="identification-dialog-body">
            <IdentificationWorkspace />
          </div>
        </div>
      )}
    </dialog>
  );
}
