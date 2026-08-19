"use client";

import { useState } from "react";

export function ReceiptThumb({
  receiptId,
  alt,
  className,
}: {
  receiptId: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="block shrink-0 overflow-hidden rounded border border-[#5E6B75]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Preview receipt image for ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/receipts/${receiptId}/image`}
          alt=""
          className={className ?? "h-16 w-12 bg-[#F7F8FA] object-cover"}
        />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1F33]/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Receipt preview"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/receipts/${receiptId}/image`}
            alt={alt}
            className="max-h-[90vh] max-w-full rounded-md bg-white object-contain"
          />
        </div>
      ) : null}
    </>
  );
}
