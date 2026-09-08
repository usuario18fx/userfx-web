"use client";

import React, { useState } from "react";

import "./VaultActions.css";
import "./VaultMobileCenter.css";
import "./VaultIdentity.css";
import "./VaultMobilePolish.css";

import { FxAccessBtn } from "../FxAccess/FxAccessBtn";
import { FxAccessModal } from "../FxAccess/FxAccessModal/FxAccessModal";

type VaultActionsProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onGetCode: () => void;
  loading?: boolean;
  error?: string;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export default function VaultActions({
  value,
  onChange,
  onSubmit,
  onGetCode,
  loading = false,
  error = "",
  placeholder = "BSIC-CODE",
  inputRef,
}: VaultActionsProps) {
  const [fxAccessOpen, setFxAccessOpen] = useState(false);

  return (
    <>
      <div className="fx-access-launcher">
        <FxAccessBtn
          onOpen={() => setFxAccessOpen(true)}
          disabled={loading}
        />
      </div>

      <FxAccessModal
        id="fx-access-modal"
        open={fxAccessOpen}
        onClose={() => setFxAccessOpen(false)}
        accessCode={value}
        onAccessCodeChange={onChange}
        onAccessSubmit={onSubmit}
        onGetCode={onGetCode}
        accessLoading={loading}
        accessError={error}
        accessPlaceholder={placeholder}
        inputRef={inputRef}
      />
    </>
  );
}