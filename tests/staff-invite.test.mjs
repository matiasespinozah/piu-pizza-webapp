import test from "node:test"
import assert from "node:assert/strict"

import { hashInviteToken, invitationPhase, inviteLifetimeMs } from "../src/lib/staff/invitation.ts"

test("una invitación abierta vence a las 48 horas y el hash no es el secreto", () => {
  const now = Date.parse("2026-11-11T15:00:00.000Z")
  const expires = new Date(now + inviteLifetimeMs).toISOString()
  assert.equal(invitationPhase("open", expires, now), "pending")
  assert.equal(invitationPhase("open", expires, now + inviteLifetimeMs), "expired")
  assert.equal(invitationPhase("used", expires, now), "used")
  assert.equal(invitationPhase("revoked", expires, now), "revoked")
  const token = "a".repeat(43)
  assert.notEqual(hashInviteToken(token), token)
  assert.equal(hashInviteToken(token), hashInviteToken(token))
})
