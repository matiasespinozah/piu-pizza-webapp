const waiterTypes = new Set(["upcoming", "rescheduled", "cancelled", "confirmed"])

function waiterMayReadNotice(notice: { type: string; title: string }) {
  if (waiterTypes.has(notice.type)) return true
  return notice.type === "changed" && notice.title === "Mesa actualizada"
}

export { waiterMayReadNotice }
