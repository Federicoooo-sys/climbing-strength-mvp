import React from "react";

// ── ScreenShell ──────────────────────────────────────────
// Root wrapper for every screen. Provides a progress bar
// slot at the top and a padded, scrollable body area.

export interface ScreenShellProps {
  children: React.ReactNode;
  progressBar?: React.ReactNode;
}

export function ScreenShell({ children, progressBar }: ScreenShellProps) {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="shrink-0">
        {progressBar ?? <div className="h-1" />}
      </div>
      <div className="flex-1 flex flex-col px-4 pt-10 pb-8 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
}

// ── ScreenLabel ──────────────────────────────────────────

export function ScreenLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-[0.1em] uppercase text-slate-400 m-0">
      {children}
    </p>
  );
}

// ── PageTitle ────────────────────────────────────────────

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-3xl font-bold text-slate-900 m-0 leading-tight">
      {children}
    </h1>
  );
}

// ── PageSubtitle ─────────────────────────────────────────

export function PageSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base text-slate-500 m-0">
      {children}
    </p>
  );
}

// ── ExerciseName ─────────────────────────────────────────

export function ExerciseName({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-slate-900 m-0">
      {children}
    </h2>
  );
}

// ── ContextLine ──────────────────────────────────────────

export function ContextLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-slate-500 m-0">
      {children}
    </p>
  );
}

// ── TargetBadge ──────────────────────────────────────────

export function TargetBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex self-start items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
      {label}
    </span>
  );
}

// ── BigDisplay ───────────────────────────────────────────

export interface BigDisplayProps {
  value: string | number;
  label?: string;
  urgent?: boolean;
}

export function BigDisplay({ value, label, urgent }: BigDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && <ScreenLabel>{label}</ScreenLabel>}
      <span
        className={`font-bold tabular-nums leading-none select-none ${urgent ? 'text-red-600' : 'text-slate-900'}`}
        style={{ fontSize: "88px" }}
      >
        {value}
      </span>
    </div>
  );
}

// ── QuestionText ─────────────────────────────────────────

export function QuestionText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xl font-semibold text-slate-900 m-0 leading-snug">
      {children}
    </p>
  );
}

// ── PrimaryButton ────────────────────────────────────────

export function PrimaryButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full py-[18px] bg-slate-900 text-white rounded-2xl font-semibold text-base active:opacity-80 transition-opacity cursor-pointer border-none"
    >
      {label}
    </button>
  );
}

// ── SecondaryButton ──────────────────────────────────────

export function SecondaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-[18px] border border-slate-200 bg-white text-slate-700 rounded-2xl font-semibold text-base active:opacity-80 transition-opacity cursor-pointer disabled:opacity-40"
    >
      {label}
    </button>
  );
}

// ── ButtonGroup ──────────────────────────────────────────

export function ButtonGroup({
  primary,
  secondary,
  onPrimary,
  onSecondary,
}: {
  primary: string;
  secondary?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <PrimaryButton label={primary} onClick={onPrimary} />
      {secondary && (
        <SecondaryButton label={secondary} onClick={onSecondary} />
      )}
    </div>
  );
}

// ── ExerciseRow ──────────────────────────────────────────

export interface ExerciseRowProps {
  name: string;
  meta: string;
}

export function ExerciseRow({ name, meta }: ExerciseRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-base font-medium text-slate-900">{name}</span>
      <span className="text-sm text-slate-500">{meta}</span>
    </div>
  );
}
