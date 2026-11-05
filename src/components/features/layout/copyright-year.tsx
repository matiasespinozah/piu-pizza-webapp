"use client"

import * as React from "react"

function subscribe() {
  return () => {}
}

function getYear() {
  return new Date().getFullYear()
}

function CopyrightYear() {
  const year = React.useSyncExternalStore(subscribe, getYear, () => 2026)
  return <>{year}</>
}

export { CopyrightYear }
